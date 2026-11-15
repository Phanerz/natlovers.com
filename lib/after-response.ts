import {after} from "next/server";
import {logFailure} from "@/lib/safe-log";

// Runs work that the customer does not need to wait for (an email, a saved address) once the response has
// been sent. Inside a request it uses Next's after(), which keeps the serverless function alive until the
// work finishes. Outside a request (the database tests, scripts) there is no response to get ahead of, so
// the work simply runs and is awaited. A failure is logged by type only and never reaches the caller.
export async function afterResponse(label: string, work: () => Promise<void>): Promise<void> {
  const run = async () => {
    try {
      await work();
    } catch (error) {
      logFailure(`${label} failed`, error);
    }
  };
  try {
    after(run);
  } catch {
    await run();
  }
}
