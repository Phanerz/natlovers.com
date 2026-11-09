import {NextResponse} from "next/server";
import {z} from "zod";
import {getSession, isAdminEmail} from "@/lib/auth";
import {updateLimits} from "@/lib/limits";

const countField = z.coerce.number().int().min(1).max(100000);

const patchSchema = z.object({
  piecesMonthlyCap: countField.optional(),
  piecesMaxPerOrder: countField.optional(),
  extrasMaxPerOrder: countField.optional(),
  // Empty means no monthly cap for the extras group.
  extrasMonthlyCap: z.union([countField, z.literal("").transform(() => null), z.null()]).optional(),
  wholesaleContactUrl: z
    .union([z.string().trim().url().max(500).refine((value) => /^https?:\/\/|^mailto:/i.test(value), "Use a web or mailto link."), z.literal("").transform(() => null), z.null()])
    .optional()
});

// Authorised on the server against ADMIN_EMAILS, not just hidden in the page.
export async function PATCH(request: Request) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.issues[0]?.message ?? "Those values are not valid."}, {status: 400});
  }
  try {
    const limits = await updateLimits(parsed.data, email);
    return NextResponse.json({limits});
  } catch (error) {
    console.error("Could not update limits", error);
    return NextResponse.json({error: "Could not save the limits."}, {status: 500});
  }
}
