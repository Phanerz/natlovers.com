import {NextRequest, NextResponse} from "next/server";
import {addressInputSchema, deleteAddress, setDefaultAddress, updateAddress} from "@/lib/addresses";
import {getSession} from "@/lib/auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const body = await request.json();

  // Setting a default doesn't touch the other fields, so it's a distinct,
  // smaller action from a full field edit.
  if (body?.action === "set_default") {
    const ok = await setDefaultAddress(userId, id);
    if (!ok) {
      return NextResponse.json({error: "Address not found."}, {status: 404});
    }
    return NextResponse.json({ok: true});
  }

  try {
    const parsed = addressInputSchema.parse(body);
    const address = await updateAddress(userId, id, parsed, body?.makeDefault);
    if (!address) {
      return NextResponse.json({error: "Address not found."}, {status: 404});
    }
    return NextResponse.json(address);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update address.";
    return NextResponse.json({error: message}, {status: 400});
  }
}

export async function DELETE(_request: NextRequest, {params}: {params: Promise<{id: string}>}) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const {id} = await params;
  const ok = await deleteAddress(userId, id);
  if (!ok) {
    return NextResponse.json({error: "Address not found."}, {status: 404});
  }
  return NextResponse.json({ok: true});
}
