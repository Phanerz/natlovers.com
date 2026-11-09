import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {addressInputSchema} from "@/lib/addresses";
import {copy, langForCurrency} from "@/lib/atelier-copy";
import {createOrder, LimitError} from "@/lib/orders";
import {paymentRouteFor} from "@/lib/payment-routes";
import {normalizeCurrency} from "@/lib/site";
import {getSession} from "@/lib/auth";
import {productSelectionSchema} from "@/lib/product-selection";

const orderConfigSchema = productSelectionSchema;

const BANK_VARIABLES = ["BANK_TRANSFER_BANK_NAME", "BANK_TRANSFER_ACCOUNT_NAME", "BANK_TRANSFER_ACCOUNT_NUMBER"] as const;

// Reads the bank details for a rupiah order. There are no fallbacks: if any variable is missing the
// order is not placed, and the log names exactly which one.
function readBankDetails(): {ok: true; bankName: string; accountName: string; accountNumber: string} | {ok: false; missing: string[]} {
  const values = BANK_VARIABLES.map((name) => [name, process.env[name]?.trim() ?? ""] as const);
  const missing = values.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) return {ok: false, missing};
  return {ok: true, bankName: values[0][1], accountName: values[1][1], accountNumber: values[2][1]};
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const body = await request.json();
  const items = Array.isArray(body?.items)
    ? body.items
        .map((item: {slug?: string; quantity?: number; config?: unknown}) => {
          // Same rule as the cart route: a config is only ever carried
          // through once it's confirmed to match a real ProductSelection,
          // never trusted as opaque client JSON straight into an order record.
          const configResult = item.config != null ? orderConfigSchema.safeParse(item.config) : null;
          return {
            slug: String(item.slug ?? ""),
            quantity: Number(item.quantity) || 0,
            config: configResult?.success ? configResult.data : null
          };
        })
        .filter((item: {slug: string; quantity: number}) => item.slug && item.quantity > 0)
    : [];

  if (!items.length) {
    return NextResponse.json({error: "No items to order."}, {status: 400});
  }

  // One key per checkout attempt, made by the page. A double submit repeats the key and gets the
  // same order back instead of a second one.
  const keyResult = z.string().trim().min(8).max(100).safeParse(body?.idempotencyKey);
  if (!keyResult.success) {
    return NextResponse.json({error: "Missing checkout key."}, {status: 400});
  }

  // A shipping address is required to place an order, not an optional
  // extra  -  this is the fix for the operational gap where addresses were
  // only ever gathered manually over WhatsApp/email with nothing stored.
  const addressResult = addressInputSchema.safeParse(body?.address);
  if (!addressResult.success) {
    return NextResponse.json({error: addressResult.error.issues[0]?.message ?? "A shipping address is required."}, {status: 400});
  }

  // The customer's chosen currency decides both the price they are charged (each product has its
  // own fixed price in each currency) and which payment route the order takes.
  const currency = normalizeCurrency(body?.currency);
  const route = paymentRouteFor(currency);
  const lang = langForCurrency(currency);

  let bank = {bankName: "", accountName: "", accountNumber: ""};
  if (route === "idr_bank_transfer") {
    const details = readBankDetails();
    if (!details.ok) {
      console.error(`Rupiah checkout refused: missing environment variable(s) ${details.missing.join(", ")}`);
      return NextResponse.json({error: copy[lang].bankUnavailable, code: "bank_unavailable"}, {status: 503});
    }
    bank = {bankName: details.bankName, accountName: details.accountName, accountNumber: details.accountNumber};
  }

  try {
    const {order, replayed} = await createOrder(userId, items, bank, addressResult.data, currency, {
      idempotencyKey: keyResult.data,
      customerEmail: session?.user?.email ?? null,
      customerName: session?.user?.name ?? null
    });

    if (route === "usd_invoice") {
      // Dollar orders take the international route. Until a provider is connected the order is
      // held as pending and the customer is told what happens next; no bank details are shown.
      return NextResponse.json({
        ok: true,
        route,
        currency,
        replayed,
        orderRef: order.orderRef,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        items: order.items,
        total: (order.totalUsdCents ?? 0) / 100
      });
    }

    return NextResponse.json({
      ok: true,
      route,
      currency,
      replayed,
      orderRef: order.orderRef,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      accountName: order.accountName,
      accountNumber: order.accountNumber,
      bankName: order.bankName,
      items: order.items,
      total: order.totalIdr
    });
  } catch (error) {
    if (error instanceof LimitError) {
      return NextResponse.json({error: "limit", violation: error.violation, nextMonth: error.nextMonth}, {status: 409});
    }
    console.error("Checkout failed", error);
    const message = error instanceof Error && !/^(Failed query|error:)/i.test(error.message) ? error.message : copy[lang].orderFailed;
    return NextResponse.json({error: message}, {status: 400});
  }
}
