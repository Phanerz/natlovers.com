import {eq} from "drizzle-orm";
import {db, storeSettings} from "@/lib/db";
import {DEFAULT_INTAKE_PAUSED_MESSAGE} from "@/lib/custom-studio";

// store_settings holds exactly one row, under this fixed id. Reads tolerate
// the row not existing yet (a fresh database has never had an admin touch
// settings) and report the safe default rather than failing — the safe
// default for intake being "open", since the pause is an action someone
// takes, not a state the app should fall into on its own.
const SETTINGS_ID = "default";

export type StoreSettings = {
  customIntakePaused: boolean;
  customIntakePausedMessage: string;
  updatedByEmail: string | null;
  updatedAt: string | null;
};

const defaults: StoreSettings = {
  customIntakePaused: false,
  customIntakePausedMessage: DEFAULT_INTAKE_PAUSED_MESSAGE,
  updatedByEmail: null,
  updatedAt: null
};

export async function getStoreSettings(): Promise<StoreSettings> {
  const [row] = await db.select().from(storeSettings).where(eq(storeSettings.id, SETTINGS_ID)).limit(1);

  if (!row) {
    return defaults;
  }

  return {
    customIntakePaused: row.customIntakePaused,
    customIntakePausedMessage: row.customIntakePausedMessage?.trim() || DEFAULT_INTAKE_PAUSED_MESSAGE,
    updatedByEmail: row.updatedByEmail,
    updatedAt: row.updatedAt.toISOString()
  };
}

// Upsert rather than update: the settings row is created lazily the first
// time an admin actually changes something, so no seed step is needed and a
// database restored from a schema-only dump still behaves correctly.
export async function setCustomIntakePaused(
  paused: boolean,
  adminEmail: string,
  message?: string | null
): Promise<StoreSettings> {
  const trimmed = message?.trim() || null;

  await db
    .insert(storeSettings)
    .values({
      id: SETTINGS_ID,
      customIntakePaused: paused,
      customIntakePausedMessage: trimmed,
      updatedByEmail: adminEmail,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: storeSettings.id,
      set: {
        customIntakePaused: paused,
        customIntakePausedMessage: trimmed,
        updatedByEmail: adminEmail,
        updatedAt: new Date()
      }
    });

  return getStoreSettings();
}
