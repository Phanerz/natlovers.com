import {NextResponse} from "next/server";
import {contactSchema} from "@/lib/forms";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  return NextResponse.json({
    ok: true,
    message: "Contact submission received. Persist this with Prisma in the next integration pass."
  });
}
