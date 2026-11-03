import type {ResolvedLine} from "@/lib/product-options";

// What a customer asked for on one order line, read off the snapshot frozen at
// checkout: "Left bunny colour: Pink", "Dog 1: Corgi · Golden", reference
// photos, and what each extra cost. This is the studio's make-list, so it is
// shown in plain type with the photos linked at full size.
export function orderItemLines(config: unknown): ResolvedLine[] {
  const lines = (config as {custom?: {lines?: ResolvedLine[]}} | null)?.custom?.lines;
  return Array.isArray(lines) ? lines : [];
}

export function OrderItemDetails({
  config,
  formatMoney,
  className = ""
}: {
  config: unknown;
  formatMoney: (amountIdr: number) => string;
  className?: string;
}) {
  const lines = orderItemLines(config);
  if (!lines.length) {
    return null;
  }

  return (
    <ul className={`mt-1.5 space-y-1 border-l-2 border-[#d9cba9] pl-3 text-xs leading-snug ${className}`}>
      {lines.map((line, index) => (
        <li key={`${line.label}-${index}`}>
          <span className="font-semibold">{line.label}:</span> {line.value}
          {line.extraIdr > 0 ? <span className="opacity-70"> (+{formatMoney(line.extraIdr)})</span> : null}
          {line.images?.length ? (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {line.images.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" title="Open photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Customer reference" className="h-12 w-12 rounded object-cover ring-1 ring-black/15" />
                </a>
              ))}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
