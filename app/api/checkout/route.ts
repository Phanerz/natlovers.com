import {NextRequest, NextResponse} from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const items = Array.isArray(body?.items) ? body.items : [];
  const total = Number(body?.total) || 0;

  return NextResponse.json({
    ok: true,
    orderRef: `NAT-${Date.now().toString().slice(-8)}`,
    accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "Natlovers",
    accountNumber: process.env.BANK_TRANSFER_ACCOUNT_NUMBER ?? "0000000000",
    bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Bank Central Asia",
    items,
    total
  });
}
