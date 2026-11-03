import {Clock, MessageCircleQuestion, ShieldAlert} from "lucide-react";

// Real, confirmed store policy  -  not placeholder copy. Kept in English only:
// this is policy text with legal weight, and an unreviewed translation could
// change what it actually promises. The short headings are only labels; the
// sentences beneath them are the policy and are unchanged.
const items = [
  {
    icon: MessageCircleQuestion,
    label: "Confirmation",
    text: "We'll contact you after purchase to confirm details and timeline."
  },
  {
    icon: ShieldAlert,
    label: "Made to order",
    text: "Customised pieces cannot be returned once production begins."
  },
  {
    icon: Clock,
    label: "Delivery",
    text: "Most pieces ship within 1–3 weeks, depending on customisation and demand."
  }
];

export function ReassuranceBar() {
  return (
    <ul className="pdp-promises">
      {items.map(({icon: Icon, label, text}) => (
        <li key={label} className="pdp-promise">
          <Icon aria-hidden />
          <div>
            <p className="pdp-promise-label">{label}</p>
            <p className="pdp-promise-text">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
