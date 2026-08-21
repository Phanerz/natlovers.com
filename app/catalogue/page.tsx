import {Suspense} from "react";
import {CatalogueContent} from "@/app/catalogue/CatalogueClient";

export default function CataloguePage() {
  return (
    <main className="page-enter">
      <Suspense fallback={null}>
        <CatalogueContent />
      </Suspense>
    </main>
  );
}
