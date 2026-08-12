import {defineConfig} from "drizzle-kit";

process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_POSTGRES_URL_NON_POOLING!
  }
});
