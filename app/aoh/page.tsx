import {AohCalculator} from "@/components/aoh/aoh-calculator";
import {aohDisplay, aohMono} from "@/lib/aoh-fonts";

export const metadata = {
  title: "Kalkulator Harga | Alfa Omega Hardware",
  description: "Kalkulator harga klise kuningan untuk emboss dan hot stamp."
};

export default function AohPage() {
  return <AohCalculator fontClassName={`${aohDisplay.variable} ${aohMono.variable}`} />;
}
