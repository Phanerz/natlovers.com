import {NextResponse} from "next/server";
import {customRequestSchema} from "@/lib/forms";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = customRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({error: parsed.error.flatten()}, {status: 400});
  }

  return NextResponse.json({
    ok: true,
    message: "Custom request received. Persist this with Prisma in the next integration pass."
  });
}
