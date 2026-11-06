import type {AddonOrderLine} from "@/lib/addon-shared";
import {addonSwatchBackground} from "@/lib/addon-shared";
import {formatCurrency} from "@/lib/format";
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
  addons = [],
  currency = "IDR",
  className = ""
}: {
  config: unknown;
  formatMoney: (amountIdr: number) => string;
  // The felted animals on this line, as frozen at checkout.
  addons?: AddonOrderLine[];
  currency?: string;
  className?: string;
}) {
  const lines = orderItemLines(config);
  if (!lines.length && !addons.length) {
    return null;
  }

  return (
    <>
      {lines.length ? (
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
      ) : null}

      {addons.length ? (
        <ul className={`mt-2 space-y-2 ${className}`} aria-label="Felted animal add-ons">
          {addons.map((addon, index) => (
            <li key={`${addon.speciesName}-${index}`} className="flex items-start gap-2.5 rounded-md border border-[#d9cba9] bg-[#fbf7ec] p-2 text-sm leading-snug">
              {addon.imageUrl ? (
                <a href={addon.imageUrl} target="_blank" rel="noreferrer" title="Open reference photo" className="flex-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={addon.imageUrl} alt={`${addon.speciesName} reference`} className="h-16 w-16 rounded object-cover ring-1 ring-black/15" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {addon.speciesName}
                  {addon.poseLabel ? <span className="font-normal"> · {addon.poseLabel}</span> : null}
                </p>
                <p className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 flex-none rounded-full ring-1 ring-black/25"
                    style={{background: addonSwatchBackground(addon.colourKind, addon.colourHexes)}}
                  />
                  {addon.colourLabel}
                </p>
                {addon.note ? <p className="mt-0.5 italic [overflow-wrap:anywhere]">Note: {addon.note}</p> : null}
                {addon.referenceImages?.length ? (
                  <div className="mt-1.5">
                    <p className="text-xs font-semibold">Customer photos to copy</p>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {addon.referenceImages.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" title="Open photo at full size">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="Customer reference" className="h-20 w-20 rounded object-cover ring-1 ring-black/20" />
                        </a>
                      ))}
                    </span>
                  </div>
                ) : null}
                <p className="opacity-70">
                  {currency === "USD" ? formatCurrency(addon.priceUsdCents / 100, "USD") : formatMoney(addon.priceIdr)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
