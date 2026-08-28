import {Gift, Sparkle, Sprout} from "lucide-react";

// Fixed copy, same on every product page  -  not pulled from any field and
// not admin-toggleable, since these are store-wide claims, not per-product
// ones.
const BADGES = [
  {icon: Sprout, text: "Handcrafted by skilled artisans"},
  {icon: Sparkle, text: "Unique & joyful design"},
  {icon: Gift, text: "Made to order just for you"}
];

export function ProductTrustBadges() {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-forest-100 bg-[#fdfaf3] px-3 py-3 sm:gap-3 sm:px-4">
      {BADGES.map(({icon: Icon, text}) => (
        <div key={text} className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
          <Icon className="h-4 w-4 shrink-0 text-forest-500" />
          <p className="text-[11px] leading-tight text-forest-600 sm:text-xs">{text}</p>
        </div>
      ))}
    </div>
  );
}
