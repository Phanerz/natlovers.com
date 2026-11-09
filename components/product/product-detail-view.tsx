"use client";

import {useEffect, useRef, useState} from "react";
import {lineExtrasTotal} from "@/lib/pricing";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import type {ProductSelection} from "@/lib/product-selection";
import type {AdminProduct} from "@/lib/admin-products";
import {defaultAnswers, isOptionsEnabled, resolveOptions, type OptionAnswers} from "@/lib/product-options";
import {buildAddonLines, type AddonCatalogue, type AddonPick} from "@/lib/addon-shared";
import {AddonPicker} from "@/components/product/addon-picker";
import {CustomOptionsNote} from "@/components/product/custom-options-note";
import {ProductCustomizer} from "@/components/product/product-customizer";
import {ProductGallery} from "@/components/product/product-gallery";
import {ProductInfoSection} from "@/components/product/product-info-section";
import {ProductPurchasePanel} from "@/components/product/product-purchase-panel";

// The product page's two halves share one thing: the shopper's colour and note
// choices. They are made in the personalisation card down in the details
// section, but they travel with the Add to Bag button up in the purchase column,
// so the selection lives here, above both.
//
// Layout: the gallery and the purchase column are stretched to the same height
// (and the purchase column keeps its buttons at its foot), so the bottom edge of
// the fold is level on every product, whatever it offers. Below, product details
// sit on the left and personalisation on the right; a piece with nothing to
// personalise gives the details the whole width.
export function ProductDetailView({
  product,
  images,
  tintHex,
  addonCatalogue = null
}: {
  product: AdminProduct;
  images: string[];
  tintHex: string;
  addonCatalogue?: AddonCatalogue | null;
}) {
  // Measures the photo against the row it sits in: if the buying column makes the row a little taller
  // than the photo (up to 64px), the photo is aligned to the foot of its column.
  const rowRef = useRef<HTMLDivElement>(null);
  const [footAligned, setFootAligned] = useState(false);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const photo = row.querySelector<HTMLElement>(".pdp-gallery");
    if (!photo) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const measure = () => {
      const extra = row.clientHeight - photo.offsetHeight;
      setFootAligned(desktop.matches && extra > 0 && extra <= 64);
    };
    measure();
    // Text and fonts settle a moment after the first paint, so measure again once they have.
    const frame = window.requestAnimationFrame(measure);
    void document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    observer.observe(photo);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  const [addonPicks, setAddonPicks] = useState<AddonPick[]>([]);
  const [baseColour, setBaseColour] = useState<string | null>(product.baseColourOptions[0]?.label ?? null);
  const [handleColour, setHandleColour] = useState<string | null>(product.handleColourOptions[0]?.label ?? null);
  const [personalisationNote, setPersonalisationNote] = useState("");

  // The admin-built options (extra dolls, part colours, photos, felted animals) replace
  // the simple colour/note card on a product that has them switched on.
  const customOptions = isOptionsEnabled(product.customisation) ? product.customisation : null;
  // Felted animals live inside the custom options: none when those are off.
  const addonsOn = Boolean(customOptions && addonCatalogue?.species.length);
  const activePicks = addonsOn ? addonPicks : [];
  const addonLines = addonCatalogue ? buildAddonLines(addonCatalogue, activePicks) : [];
  const [answers, setAnswers] = useState<OptionAnswers>(() => (customOptions ? defaultAnswers(customOptions) : {}));
  const resolved = resolveOptions(customOptions, answers);
  const {currency} = useSitePreferences();
  const extraNow = lineExtrasTotal(product, [...resolved.lines, ...addonLines], currency);

  const hasCustomisation = Boolean(customOptions) || product.hasBaseColour || product.hasHandleColour || product.hasPersonalisation;
  const selection: ProductSelection | undefined = customOptions
    ? {
        kind: "productSelection",
        custom: {answers, lines: resolved.lines, extraIdr: resolved.extraIdr},
        ...(activePicks.length ? {addons: activePicks, addonLines} : {})
      }
    : hasCustomisation
    ? {
        kind: "productSelection",
        ...(product.hasBaseColour && baseColour ? {baseColour} : {}),
        ...(product.hasHandleColour && handleColour ? {handleColour} : {}),
        ...(product.hasPersonalisation && personalisationNote.trim() ? {personalisationNote: personalisationNote.trim()} : {})
      }
    : undefined;

  // The same Add to Bag as the one in the purchase column, repeated under the note.
  const {addToCart} = useStorefront();
  const [addedNotice, setAddedNotice] = useState(false);
  const outOfStock = product.soldOut || (product.stock !== null && product.stock <= 0);
  function handleAddToBag() {
    addToCart(product.slug, 1, selection ?? null);
    setAddedNotice(true);
    window.setTimeout(() => setAddedNotice(false), 2500);
  }

  return (
    <>
      <div ref={rowRef} className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-[30px] xl:gap-[48px]">
        {/* On a laptop, when the buying column is only a little taller than the photo, the photo sits at
            the foot of its column so its bottom edge and the Add to Bag button are level. When the
            difference is large (a short screen) the photo stays top-aligned instead of being pushed far down. */}
        <div className={`flex flex-col ${footAligned ? "lg:justify-end" : ""}`}>
          <ProductGallery images={images} name={product.name} tintHex={tintHex} zoomEnabled={product.imageZoomEnabled} />
        </div>
        <ProductPurchasePanel product={product} selection={selection} hasCustomisation={hasCustomisation} extra={extraNow} />
      </div>

      <ProductInfoSection
        product={product}
        customiser={
          customOptions ? (
            <CustomOptionsNote
              options={customOptions}
              answers={answers}
              onChange={setAnswers}
              product={product}
              extraLines={addonLines}
              animalPicker={
                addonsOn && addonCatalogue ? <AddonPicker catalogue={addonCatalogue} picks={addonPicks} onChange={setAddonPicks} /> : null
              }
              onAddToBag={handleAddToBag}
              addToBagLabel={outOfStock ? "Sold Out" : addedNotice ? "Added to Bag" : "Add to Bag"}
              addToBagDisabled={outOfStock}
            />
          ) : hasCustomisation ? (
            <ProductCustomizer
              hasBaseColour={product.hasBaseColour}
              baseColourOptions={product.baseColourOptions}
              baseColour={baseColour}
              onBaseColourChange={setBaseColour}
              hasHandleColour={product.hasHandleColour}
              handleColourOptions={product.handleColourOptions}
              handleColour={handleColour}
              onHandleColourChange={setHandleColour}
              hasPersonalisation={product.hasPersonalisation}
              personalisationNote={personalisationNote}
              onPersonalisationNoteChange={setPersonalisationNote}
              onAddToBag={handleAddToBag}
              addToBagLabel={outOfStock ? "Sold Out" : addedNotice ? "Added to Bag" : "Add to Bag"}
              addToBagDisabled={outOfStock}
            />
          ) : null
        }
      />
    </>
  );
}
