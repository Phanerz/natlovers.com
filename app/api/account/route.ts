import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {getAccountProfile, updateAccountProfile} from "@/lib/account";
import {authOptions} from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const profile = await getAccountProfile(userId);
  if (!profile) {
    return NextResponse.json({error: "Account not found."}, {status: 404});
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const body = await request.json();
    const profile = await updateAccountProfile(userId, body);
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update account.";
    return NextResponse.json({error: message}, {status: 400});
  }
}
