import {getServerSession} from "next-auth/next";
import {NextResponse} from "next/server";
import {getDashboardStats} from "@/lib/dashboard-stats";
import {authOptions, isAdminEmail} from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({error: "Unauthorized."}, {status: 401});
  }

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
    return NextResponse.json({error: "Could not load dashboard stats."}, {status: 500});
  }
}
