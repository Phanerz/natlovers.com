import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {discardDraft, draftInputSchema, getDraft, saveDraft, submitDraft} from "@/lib/custom-requests";
import {getStoreSettings} from "@/lib/store-settings";
import {sendCustomRequestReceivedEmail} from "@/lib/custom-notifications";

// The customer's own Custom Studio draft. Everything here is scoped to the
// signed-in user by lib/custom-requests.ts  -  no route in this file accepts a
// request id from the client, so there is nothing to tamper with.
export const dynamic = "force-dynamic";

async function requireUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

// Draft restore on returning to /custom.
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({draft: null});
  }

  const draft = await getDraft(userId);
  return NextResponse.json({draft});
}

// Autosave. Separate from POST so that saving progress can never be
// mistaken for submitting  -  the two verbs mean genuinely different things
// to the customer and a mis-fired autosave must not land a commission in
// the studio's queue.
export async function PUT(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({error: "Sign in to save your design."}, {status: 401});
  }

  const body = await request.json().catch(() => null);
  const parsed = draftInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  try {
    const draft = await saveDraft(userId, parsed.data);
    return NextResponse.json({draft});
  } catch (error) {
    console.error("Failed to save custom request draft:", error);
    return NextResponse.json({error: "Could not save your design."}, {status: 500});
  }
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({error: "Sign in to send your request."}, {status: 401});
  }

  // Re-checked at submit time, not only when the page was rendered: the
  // studio may have paused intake while this customer was mid-design, and
  // the pause is a capacity guardrail rather than a cosmetic one.
  const settings = await getStoreSettings();
  if (settings.customIntakePaused) {
    return NextResponse.json({error: settings.customIntakePausedMessage, paused: true}, {status: 409});
  }

  const body = await request.json().catch(() => null);
  const parsed = draftInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  try {
    // submitDraft only matches a row still in 'draft', so a double-submit
    // (a double click, a retried request) finds nothing to promote the
    // second time and returns null rather than creating a second
    // commission. The client treats that as "already sent".
    const submitted = await submitDraft(userId, parsed.data);

    if (!submitted) {
      return NextResponse.json(
        {error: "This request has already been sent.", alreadySubmitted: true},
        {status: 409}
      );
    }

    // Best-effort: a customer's commission is safely stored either way, so
    // a mail provider outage must not turn a successful submission into an
    // error the customer sees.
    await sendCustomRequestReceivedEmail(userId, submitted).catch((error) => {
      console.error("Custom request confirmation email failed:", error);
    });

    return NextResponse.json({request: submitted}, {status: 201});
  } catch (error) {
    console.error("Failed to submit custom request:", error);
    return NextResponse.json({error: "Could not send your request."}, {status: 500});
  }
}

// Used by "start over" in the studio. Cascades to the draft's uploaded
// images through the foreign key.
export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  await discardDraft(userId);
  return NextResponse.json({ok: true});
}
