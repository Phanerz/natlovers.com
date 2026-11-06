"use client";

import {useState} from "react";
import {lineExtrasTotal} from "@/lib/pricing";
import {useSitePreferences} from "@/components/site-preferences-provider";
import type {ProductSelection} from "@/lib/product-selection";
import type {AdminProduct} from "@/lib/admin-products";
import {defaultAnswers, isOptionsEnabled, resolveOptions, type OptionAnswers} from "@/lib/product-options";
import {buildAddonLines, type AddonCatalogue, type AddonPick} from "@/lib/addon-shared";
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
  const [addonPicks, setAddonPicks] = useState<AddonPick[]>([]);
  const addonsOn = Boolean(product.hasPersonalisation && addonCatalogue?.species.length);
  const activePicks = addonsOn ? addonPicks : [];
  const addonLines = addonCatalogue ? buildAddonLines(addonCatalogue, activePicks) : [];
  const [baseColour, setBaseColour] = useState<string | null>(product.baseColourOptions[0]?.label ?? null);
  const [handleColour, setHandleColour] = useState<string | null>(product.handleColourOptions[0]?.label ?? null);
  const [personalisationNote, setPersonalisationNote] = useState("");

  // The admin-built options (extra dolls, pets, part colours, photos) replace
  // the simple colour/note card on a product that has them switched on.
  const customOptions = isOptionsEnabled(product.customisation) ? product.customisation : null;
  const [answers, setAnswers] = useState<OptionAnswers>(() => (customOptions ? defaultAnswers(customOptions) : {}));
  const resolved = resolveOptions(customOptions, answers);
  const {currency} = useSitePreferences();
  const extraNow = lineExtrasTotal(product, [...resolved.lines, ...addonLines], currency);

  const hasCustomisation = Boolean(customOptions) || product.hasBaseColour || product.hasHandleColour || product.hasPersonalisation;
  const selection: ProductSelection | undefined = customOptions
    ? {kind: "productSelection", custom: {answers, lines: resolved.lines, extraIdr: resolved.extraIdr}}
    : hasCustomisation
    ? {
        kind: "productSelection",
        ...(product.hasBaseColour && baseColour ? {baseColour} : {}),
        ...(product.hasHandleColour && handleColour ? {handleColour} : {}),
        ...(product.hasPersonalisation && personalisationNote.trim() ? {personalisationNote: personalisationNote.trim()} : {}),
        ...(activePicks.length ? {addons: activePicks, addonLines} : {})
      }
    : undefined;

  return (
    <>
      <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-[30px] xl:gap-[48px]">
        <div className="flex flex-col">
          <ProductGallery images={images} name={product.name} tintHex={tintHex} zoomEnabled={product.imageZoomEnabled} />
        </div>
        <ProductPurchasePanel product={product} selection={selection} hasCustomisation={hasCustomisation} extra={extraNow} />
      </div>

      <ProductInfoSection
        product={product}
        customiser={
          customOptions ? (
            <CustomOptionsNote options={customOptions} answers={answers} onChange={setAnswers} product={product} />
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
              addonCatalogue={addonsOn ? addonCatalogue : null}
              addonPicks={addonPicks}
              onAddonPicksChange={setAddonPicks}
            />
          ) : null
        }
      />
    </>
  );
}
