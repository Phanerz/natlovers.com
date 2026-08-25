import {Clock, MessageCircleQuestion, ShieldAlert} from "lucide-react";

// Real, confirmed store policy — not placeholder copy. Kept in English only:
// this is policy text with legal weight, and an unreviewed translation could
// change what it actually promises.
const items = [
  {
    icon: MessageCircleQuestion,
    text: "We'll contact you after purchase to confirm details and timeline."
  },
  {
    icon: ShieldAlert,
    text: "Customised pieces cannot be returned once production begins."
  },
  {
    icon: Clock,
    text: "Most pieces ship within 1–3 weeks, depending on customisation and demand."
  }
];

export function ReassuranceBar() {
  return (
    <div className="grid gap-4 divide-y divide-forest-100 rounded-lg border border-forest-100 bg-[#fdfaf3] px-5 py-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
      {items.map(({icon: Icon, text}, index) => (
        <div key={index} className={`flex items-start gap-3 ${index > 0 ? "pt-4 sm:pt-0 sm:pl-6" : ""}`}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
          <p className="text-xs leading-relaxed text-forest-600">{text}</p>
        </div>
      ))}
    </div>
  );
}
