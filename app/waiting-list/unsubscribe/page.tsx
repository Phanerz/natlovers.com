import {emailCopy} from "@/lib/atelier-copy";
import {logFailure} from "@/lib/safe-log";
import {unsubscribe} from "@/lib/waiting-list";

export const dynamic = "force-dynamic";
export const metadata = {title: "Waiting list"};

export default async function UnsubscribePage({searchParams}: {searchParams: Promise<{token?: string}>}) {
  const {token} = await searchParams;
  let done = false;
  try {
    done = await unsubscribe(String(token ?? ""));
  } catch (error) {
    logFailure("Unsubscribe failed", error);
  }
  return (
    <main className="shell mx-auto max-w-[680px] px-4 py-24 text-center">
      <h1 className="font-display text-3xl">{done ? emailCopy.en.unsubscribedPage : "This link is not valid."}</h1>
      {done ? <p className="mt-4 text-sm opacity-80">{emailCopy.id.unsubscribedPage}</p> : null}
    </main>
  );
}
