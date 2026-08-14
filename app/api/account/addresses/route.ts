import {NextRequest, NextResponse} from "next/server";
import {addressInputSchema, createAddress, getAddressesForUser} from "@/lib/addresses";
import {getSession} from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const list = await getAddressesForUser(userId);
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const body = await request.json();
    const parsed = addressInputSchema.parse(body);
    const address = await createAddress(userId, parsed, Boolean(body?.makeDefault));
    return NextResponse.json(address, {status: 201});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save address.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
