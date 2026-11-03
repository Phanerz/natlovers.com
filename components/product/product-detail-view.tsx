"use client";

import {useState} from "react";
import type {ProductSelection} from "@/lib/product-selection";
import type {AdminProduct} from "@/lib/admin-products";
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
export function ProductDetailView({product, images, tintHex}: {product: AdminProduct; images: string[]; tintHex: string}) {
  const [baseColour, setBaseColour] = useState<string | null>(product.baseColourOptions[0]?.label ?? null);
  const [handleColour, setHandleColour] = useState<string | null>(product.handleColourOptions[0]?.label ?? null);
  const [personalisationNote, setPersonalisationNote] = useState("");

  const hasCustomisation = product.hasBaseColour || product.hasHandleColour || product.hasPersonalisation;
  const selection: ProductSelection | undefined = hasCustomisation
    ? {
        kind: "productSelection",
        ...(product.hasBaseColour && baseColour ? {baseColour} : {}),
        ...(product.hasHandleColour && handleColour ? {handleColour} : {}),
        ...(product.hasPersonalisation && personalisationNote.trim() ? {personalisationNote: personalisationNote.trim()} : {})
      }
    : undefined;

  return (
    <>
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:gap-[30px] xl:gap-[48px]">
        <div className="flex flex-col">
          <ProductGallery images={images} name={product.name} tintHex={tintHex} zoomEnabled={product.imageZoomEnabled} />
        </div>
        <ProductPurchasePanel product={product} selection={selection} hasCustomisation={hasCustomisation} />
      </div>

      <ProductInfoSection
        product={product}
        customiser={
          hasCustomisation ? (
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
            />
          ) : null
        }
      />
    </>
  );
}
