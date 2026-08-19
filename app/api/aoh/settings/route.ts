import {eq} from "drizzle-orm";
import {NextRequest, NextResponse} from "next/server";
import {aohConfig, db} from "@/lib/db";

const CONFIG_ID = "default";

export async function GET() {
  const [row] = await db.select().from(aohConfig).where(eq(aohConfig.id, CONFIG_ID)).limit(1);

  if (!row) {
    return NextResponse.json({priceData: null, settings: null});
  }

  return NextResponse.json({priceData: row.priceData, settings: row.settings, updatedAt: row.updatedAt});
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as {priceData?: unknown; settings?: unknown};

  if (!body.priceData || !body.settings) {
    return NextResponse.json({error: "Missing priceData or settings."}, {status: 400});
  }

  await db
    .insert(aohConfig)
    .values({id: CONFIG_ID, priceData: body.priceData, settings: body.settings, updatedAt: new Date()})
    .onConflictDoUpdate({
      target: aohConfig.id,
      set: {priceData: body.priceData, settings: body.settings, updatedAt: new Date()}
    });

  return NextResponse.json({ok: true});
}
