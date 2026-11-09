import "@/components/atelier/atelier.css";
import Link from "next/link";
import type {Route} from "next";
import {notFound, redirect} from "next/navigation";
import {OrderItemDetails} from "@/components/order-item-details";
import {orderCopy, stageLabels} from "@/lib/atelier-copy";
import {FULFILMENT_STAGES, stageIndex} from "@/lib/atelier-limits";
import {getSession} from "@/lib/auth";
import {formatCurrency} from "@/lib/format";
import {getOrderForUserByRef} from "@/lib/orders";
import {estimatedReadyRange, languageFor} from "@/lib/order-emails";
import {orderStatusLabels} from "@/lib/order-status";
import {PayNowButton} from "@/components/atelier/pay-now-button";
import {paymentsForOrder, reconcileForCustomer} from "@/lib/payments/service";

export const dynamic = "force-dynamic";
export const metadata = {title: "Your order"};

export default async function OrderPage({params, searchParams}: {params: Promise<{ref: string}>; searchParams: Promise<{payment?: string}>}) {
  const session = await getSession();
  const userId = session?.user?.id;
  const {ref} = await params;
  const {payment: paymentReturn} = await searchParams;
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(`/account/orders/${ref}`)}`);

  // Opening an unpaid order asks the payment provider whether it has been paid, so the page is right
  // even if the webhook has not arrived. The return URL itself proves nothing and marks nothing.
  let orderRef = ref;
  try {
    orderRef = decodeURIComponent(ref);
  } catch {
    notFound();
  }
  await reconcileForCustomer(userId, orderRef);

  const order = await getOrderForUserByRef(userId, orderRef);
  if (!order) notFound();
  const orderPayments = await paymentsForOrder(order.id);
  // An order with payment rows is paid on the hosted page; older and fallback orders pay by transfer.
  const payOnline = order.status === "pending_transfer" && order.currency === "IDR" && orderPayments.length > 0;

  const lang = languageFor(order.currency);
  const t = orderCopy[lang];
  const stages = stageLabels[lang];
  const usd = order.currency === "USD";
  const money = (idr: number, cents: number | null) => (usd ? formatCurrency((cents ?? 0) / 100, "USD") : formatCurrency(idr, "IDR"));
  const inProduction = order.status === "paid" || order.status === "fulfilled";
  const current = stageIndex(order.fulfilmentStage);
  const ready = inProduction ? await estimatedReadyRange(order.items.map((item) => item.slug), new Date(order.createdAt), lang) : null;
  const total = usd ? formatCurrency((order.totalUsdCents ?? 0) / 100, "USD") : formatCurrency(order.totalIdr, "IDR");
  const expires = order.expiresAt
    ? new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta"}).format(new Date(order.expiresAt))
    : null;

  return (
    <main className="shell mx-auto w-full max-w-[680px] px-4 py-12 sm:py-16" style={{color: "var(--at-ink)"}}>
      <Link href={"/account?tab=orders" as Route} className="atelier-link text-sm">
        {lang === "id" ? "Kembali ke pesanan" : "Back to your orders"}
      </Link>
      <h1 className="mt-4 font-display text-3xl">{order.orderRef}</h1>
      <p className="atelier-small mt-1">
        {orderStatusLabels[order.status] ?? order.status}
        {" · "}
        {new Date(order.createdAt).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", {dateStyle: "long"})}
      </p>

      {inProduction ? (
        <section className="mt-8" aria-label={t.progressLabel}>
          <ol className="bs-steps" style={{padding: 0}}>
            {FULFILMENT_STAGES.map((stage, index) => (
              <li key={stage} aria-current={index === current ? "step" : undefined} data-done={index < current}>
                {stages[stage]}
              </li>
            ))}
          </ol>
          {ready ? (
            <p className="atelier-small mt-3">
              {t.estimatedReady}: {ready}
            </p>
          ) : null}
          {order.status === "fulfilled" && (order.trackingCourier || order.trackingNumber) ? (
            <dl className="bs-dl bs-card mt-4">
              {order.trackingCourier ? (
                <div className="bs-dl-row">
                  <dt>{t.courier}</dt>
                  <dd>{order.trackingCourier}</dd>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="bs-dl-row">
                  <dt>{t.trackingNumber}</dt>
                  <dd>{order.trackingNumber}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </section>
      ) : null}

      {order.status === "pending_transfer" ? (
        <section className="atelier-notice mt-8" style={{paddingRight: "1rem"}}>
          <p>{t.awaiting}</p>
          {usd ? <p className="mt-1">{t.usdAwaiting}</p> : null}
          {expires ? <p className="mt-1">{t.heldUntil(expires)}</p> : null}
          {payOnline && paymentReturn === "success" ? <p className="mt-1">{t.paymentReturned}</p> : null}
          {payOnline && paymentReturn === "failed" ? <p className="mt-1">{t.paymentFailed}</p> : null}
          {payOnline ? <PayNowButton orderRef={order.orderRef} label={t.payNow} openingLabel={t.payOpening} unavailableLabel={t.paymentUnavailable} /> : null}
        </section>
      ) : null}
      {order.status === "expired" ? <p className="atelier-notice mt-8" style={{paddingRight: "1rem"}}>{t.expiredNote}</p> : null}
      {order.status === "cancelled" ? <p className="atelier-notice mt-8" style={{paddingRight: "1rem"}}>{t.cancelledNote}</p> : null}

      <section className="bs-card mt-8">
        <ul className="bs-items">
          {order.items.map((item) => (
            <li key={item.id ?? item.slug} className="bs-item" style={{gridTemplateColumns: "1fr auto"}}>
              <div>
                <p className="bs-name">
                  {item.name} <span className="bs-detail">&times;{item.quantity}</span>
                </p>
                <OrderItemDetails
                  config={item.config}
                  addons={item.addons}
                  currency={order.currency}
                  formatMoney={(amount) =>
                    usd && item.priceUsdCents && item.priceIdr
                      ? formatCurrency(Math.max(1, Math.round((amount * item.priceUsdCents) / 100 / item.priceIdr)), "USD")
                      : formatCurrency(amount, "IDR")
                  }
                  className="bs-detail"
                />
              </div>
              <span className="bs-price">{money(item.priceIdr * item.quantity, (item.priceUsdCents ?? 0) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="bs-total-row" style={{borderTop: "1px solid var(--at-line)", paddingTop: "0.75rem"}}>
          <span>Total</span>
          <strong>{total}</strong>
        </div>
      </section>
    </main>
  );
}
