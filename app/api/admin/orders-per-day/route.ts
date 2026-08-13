import {getServerSession} from "next-auth/next";
import {NextRequest, NextResponse} from "next/server";
import {getOrdersPerDay} from "@/lib/orders";
import {authOptions, isAdminEmail} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  const searchParams = request.nextUrl.searchParams;
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const start = startParam ? new Date(`${startParam}T00:00:00.000Z`) : null;
  const end = endParam ? new Date(`${endParam}T23:59:59.999Z`) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return NextResponse.json({error: "Invalid date range."}, {status: 400});
  }

  try {
    const days = await getOrdersPerDay(start, end);
    return NextResponse.json({days});
  } catch (error) {
    console.error("Failed to load orders-per-day:", error);
    return NextResponse.json({error: "Could not load order data."}, {status: 500});
  }
}
