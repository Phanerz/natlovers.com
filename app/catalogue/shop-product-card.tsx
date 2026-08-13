"use client";

import Image from "next/image";
import Link from "next/link";
import {Heart, ShoppingBag} from "lucide-react";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {CurrencyCode, Locale} from "@/lib/site";
import {ShopProduct, handleLabels, handlePillStyle, materialImageStyle, sizeLabels, sizePillStyle} from "./shop-data";

export function ShopProductCard({
  product,
  currency,
  locale
}: {
  product: ShopProduct;
  currency: CurrencyCode;
  locale: Locale;
}) {
  const imageStyle = materialImageStyle[product.materials[0]];
  const {isWishlisted, toggle} = useWishlist();
  const favorited = isWishlisted(product.slug);
  const {addToCart} = useStorefront();

  return (
    // className="contents" makes this <a> layout-invisible (display:
    // contents), so the <article> below is still the direct grid child for
    // sizing purposes — the Link only adds click-through behavior, it
    // never participates in the grid/flow itself.
    // self-start opts this card out of CSS Grid's default align-items:
    // stretch — without it, if anything in the row makes the row taller
    // than one card's own aspect-square height, every card in that row
    // gets silently stretched past aspect-square to match, tearing the
    // bottom-anchored overlay/ribbon away from the image above it.
    // self-start makes the card's own aspect ratio the only thing that
    // decides its height, full stop.
    //
    // overflow-hidden is back here as a defensive backstop, not a load-
    // bearing fix: the overlay below is now built to never need more than
    // aspect-square affords in the first place (truncated name, tags in a
    // single non-wrapping scrollable row) — this card sits in a fixed-
    // height, two-rows-per-page grid, so growing even slightly taller
    // doesn't just clip locally, it pushes the next row down far enough
    // that the *page's* own fixed-height container clips it instead,
    // which is a worse bug in a different place. This is the last line of
    // defense against that, not the primary mechanism.
    <Link href={`/catalogue/${product.slug}`} className="contents">
    <article className="group relative aspect-square self-start overflow-hidden border-b border-r border-[#d9cfc0] transition-colors duration-300 hover:border-[#344332]">
      <div className="absolute inset-0 overflow-hidden" style={{backgroundColor: imageStyle.bg}}>
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
          <div className="relative h-full w-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-contain transition-all duration-500 ease-out group-hover:scale-[1.06] group-hover:brightness-[1.03] group-hover:saturate-[1.12]"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-[#344332] opacity-0 transition-opacity duration-500 group-hover:opacity-[0.04]" />

        {product.soldOut ? (
          // A rotated diagonal ribbon here used to be sized as a fraction of
          // the card (h/w-2/5) so it would scale with the card — but that
          // made its footprint grow right along with the card, so at the
          // 2-col mobile width it swelled large enough to crowd the
          // heart/bag buttons in the opposite corner, and its rotated edges
          // always looked slightly different (never quite as crisp) at
          // every other card size in between. A flat, fixed-size badge in
          // the same top-left slot has a constant footprint no matter how
          // wide the card is, so it never grows into the icons' corner and
          // renders identically — same shape, same clearance — on every
          // layout instead of just the size it happened to be tuned for.
          <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 sm:left-3 sm:top-3">
            {/* h-8 matches the heart/bag buttons' own h-8 exactly, so this
                sits on the same vertical center as them instead of its
                height being whatever the text/padding happened to add up
                to. */}
            <span className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-gradient-to-b from-[#3d5140] to-[#26301f] px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f7f4ee] shadow-[0_3px_10px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/15">
              {locale === "en" ? "Sold Out" : "Habis Terjual"}
            </span>
          </div>
        ) : null}
      </div>

      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-2 sm:right-3 sm:top-3">
        <button
          type="button"
          aria-label={favorited ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle(product.slug);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur transition-all duration-200 hover:bg-white active:scale-90"
        >
          <Heart
            className={`h-4 w-4 transition-colors duration-200 ${favorited ? "fill-[#344332] text-[#344332]" : "text-[#344332]"}`}
          />
        </button>

        <button
          type="button"
          disabled={product.soldOut}
          title={product.soldOut ? (locale === "en" ? "Sold out" : "Habis terjual") : (locale === "en" ? "Add to bag" : "Tambah ke tas")}
          aria-label={product.soldOut ? (locale === "en" ? "Sold out" : "Habis terjual") : (locale === "en" ? "Add to bag" : "Tambah ke tas")}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            addToCart(product.slug);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur transition-all duration-200 hover:bg-white active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <ShoppingBag className="h-4 w-4" />
        </button>
      </div>

      {/*
        This card has to stay exactly aspect-square — it's laid out inside
        a fixed-height, two-rows-per-page momentum-scroll grid, so a card
        that grows even slightly taller pushes the next row's cards down
        far enough that the *page's* own fixed-height clipping cuts off
        their bottom edge instead (that's what "cut off below" was:
        letting this overlay grow to fit long tags pushed the problem up
        to the page level). The only way to satisfy both "stay square" and
        "never invisibly clip a tag" is to make the overlay's own height
        fixed and predictable no matter what it contains: the name is
        capped to one line (truncate), and tags run in a single
        horizontally-scrollable row (flex-nowrap + overflow-x-auto)
        instead of wrapping — so however many tags there are, or however
        long they run, they add width, never height.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden bg-gradient-to-t from-[#f7f4ee] from-45% via-[#f7f4eef2] to-transparent px-3 pb-3 pt-10 sm:px-4 sm:pb-4">
        <p className="truncate font-display text-[17px] font-semibold leading-tight text-[#20241b] sm:text-[21px]">
          {product.name}
        </p>
        <p className="mt-1 text-[15px] font-medium text-[#4a4a3f] sm:text-[17px]">
          {formatCurrency(product.priceIdr, currency)}
        </p>
        <div className="scrollbar-hide pointer-events-auto mt-2 flex flex-nowrap gap-1.5 overflow-x-auto">
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[13px] leading-none sm:px-3 sm:text-[14px]"
            style={{backgroundColor: sizePillStyle.bg, borderColor: sizePillStyle.border, color: sizePillStyle.text}}
          >
            {sizeLabels[product.size][locale]}
          </span>
          <span
            className="shrink-0 rounded-full border px-2.5 py-1 text-[13px] leading-none sm:px-3 sm:text-[14px]"
            style={{
              backgroundColor: handlePillStyle.bg,
              borderColor: handlePillStyle.border,
              color: handlePillStyle.text
            }}
          >
            {handleLabels[product.handle][locale]}
          </span>
        </div>
      </div>
    </article>
    </Link>
  );
}
