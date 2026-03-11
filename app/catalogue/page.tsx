import { Suspense } from "react";
import CatalogueClient from "./CatalogueClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading catalogue...</div>}>
      <CatalogueClient />
    </Suspense>
  );
}