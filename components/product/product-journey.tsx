import Link from "next/link";
import type {Route} from "next";
import {isReadyToShip, leadTimeRange} from "@/lib/atelier-limits";
import {LEGAL_LINKS} from "@/lib/legal";
import {whatsappLink, type ContactSettings} from "@/lib/studio-contact";

// The closing section of a product page: how an order goes from the customer's choices to their door
// (payment included), how to look after the piece, and the shop's policy in plain words. It replaces the
// folded Material & Care and Shipping & Returns rows and the three-line strip, so nothing important sits
// behind a click. English only, like the policy it states: this is text with legal weight.
//
// The facts are the shop's existing policy, unchanged: made to order, 1 to 3 weeks, no returns and no
// refunds, damaged or wrong items reported within one day, shipping paid by the buyer and quoted after
// the order, a customised order changeable until production begins, confirmation after purchase.

type Props = {
  hasMaterials: boolean;
  fulfilmentType: string | null | undefined;
  leadTimeWeeksMin: number | null | undefined;
  leadTimeWeeksMax: number | null | undefined;
  contact: ContactSettings;
};

function weeksText(min: number | null | undefined, max: number | null | undefined): string {
  const range = leadTimeRange(min, max);
  if (!range) return "1 to 3 weeks";
  return range.min === range.max ? `${range.min} ${range.min === 1 ? "week" : "weeks"}` : `${range.min} to ${range.max} weeks`;
}

export function ProductJourney({hasMaterials, fulfilmentType, leadTimeWeeksMin, leadTimeWeeksMax, contact}: Props) {
  const ready = isReadyToShip(fulfilmentType);
  const weeks = weeksText(leadTimeWeeksMin, leadTimeWeeksMax);

  const steps = [
    {
      title: "Choose",
      text: "Pick your piece and, if it offers them, your colours, and leave us a note on the order note. What you choose is kept on your order exactly as you write it."
    },
    {
      title: "Place your order, then pay",
      tag: "Payment comes first",
      text: "Add to Bag and place your order. We hold your piece for you, and the next screen shows the exact amount to transfer. We begin only once your payment has arrived. If it has not arrived in time, the order is simply released and nothing is taken from you."
    },
    {
      title: "We confirm with you",
      text: ready
        ? "Once your payment is in, we write to confirm your order and its details."
        : "Once your payment is in, we write to confirm the details and the timeline. A customised order can still be changed until production begins."
    },
    ready
      ? {title: "Packed with care", text: "This piece is ready stock, so there is no wait for it to be made. We pack it and send it as soon as your payment is confirmed."}
      : {
          title: "Made by hand",
          text: `Every piece is handcrafted to order. Most ship within ${weeks}, depending on customisation and demand, and complex custom work can take longer. You can follow its progress on your order page.`
        },
    {title: "On its way to you", text: "Your piece is packed and sent with a courier, and we email you the tracking details."}
  ];

  const whatsapp = contact.whatsapp.filter((entry) => entry.number.trim());

  return (
    <section className="pdp-journey" aria-labelledby="journey-title">
      <p className="pdp-note-eyebrow">
        <span>Natlovers</span>
        <span aria-hidden>·</span>
        <span>From our hands to yours</span>
      </p>
      <h2 id="journey-title" className="pdp-journey-title">
        How your piece comes to you
      </h2>
      <p className="pdp-journey-lede">Each Natlovers piece is made by hand, for one person. Here is the way from your choices to your door.</p>

      <div className="pdp-journey-grid">
        <ol className="pdp-steps">
          {steps.map((step, index) => (
            <li key={step.title} className="pdp-step">
              <span className="pdp-step-num" aria-hidden>
                {index + 1}
              </span>
              <div>
                <h3 className="pdp-step-title">
                  {step.title}
                  {"tag" in step && step.tag ? <span className="pdp-step-tag">{step.tag}</span> : null}
                </h3>
                <p className="pdp-step-text">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="pdp-notes">
          <article className="pdp-note-block">
            <h3 className="pdp-block-title">Caring for it</h3>
            {hasMaterials ? <p className="pdp-block-text">Undyed natural fibre, handwoven. The material is the colour, so every piece carries its own tone and small variations. That is the hand in it.</p> : null}
            <ul className="pdp-block-list">
              <li>Keep it dry. Natural fibre does not like to be soaked; if it gets wet, blot it and let it dry in the shade.</li>
              <li>Clean it gently with a soft, barely damp cloth, and let it air dry.</li>
              <li>Keep it out of long, direct sun, which can fade and dry the fibre.</li>
              <li>Store it somewhere airy, lightly filled so it keeps its shape.</li>
            </ul>
          </article>

          <article className="pdp-note-block">
            <h3 className="pdp-block-title">Good to know</h3>
            <ul className="pdp-block-list">
              <li>Because every piece is handmade, we do not accept returns and we do not give money back. Customised pieces cannot be returned once production begins.</li>
              <li>If a piece arrives damaged or is not the one you ordered, tell us within one day of receiving it.</li>
              <li>The buyer pays the shipping, and we tell you the amount after you order.</li>
            </ul>
          </article>
        </div>
      </div>

      <div className="pdp-journey-foot">
        <p className="pdp-journey-help">
          Questions before you order? We are glad to help.
        </p>
        <p className="pdp-journey-contacts">
          {whatsapp.map((entry) => (
            <a key={entry.number} href={whatsappLink(entry.number)} className="pdp-journey-link" target="_blank" rel="noopener noreferrer">
              {entry.name} on WhatsApp
            </a>
          ))}
          {contact.email ? (
            <a href={`mailto:${contact.email}`} className="pdp-journey-link">
              {contact.email}
            </a>
          ) : null}
        </p>
        <p className="pdp-journey-legal">
          {LEGAL_LINKS.map((link, index) => (
            <span key={link.href}>
              {index ? <span aria-hidden> · </span> : null}
              <Link href={link.href as Route} className="pdp-journey-link">
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
