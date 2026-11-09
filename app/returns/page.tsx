import type {Metadata} from "next";
import {LegalPage} from "@/components/legal-page";
import {getContactSettings} from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Returns & Shipping - Natlovers",
  description: "How Natlovers ships handmade pieces, and what happens if something is not right."
};

// The contact details come from the admin panel, so this page is built fresh for each visit.
export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const contact = await getContactSettings();
  const mail = <a href={`mailto:${contact.email}`}>{contact.email}</a>;

  return (
    <LegalPage
      title="Returns & Shipping"
      current="/returns"
      intro={
        <p>
          Each piece is made by hand in Yogyakarta and often made just for you, so our rules are simple and firm. This page explains how delivery works, what we do
          not accept back, and what to do if something is wrong.
        </p>
      }
      sections={[
        {
          heading: "Making and shipping",
          body: (
            <>
              <p>
                Most pieces ship within one to three weeks, depending on customisation and demand. We contact you after your purchase to confirm the details and the
                timing.
              </p>
              <p>When your order is sent, we add the courier and tracking number to your order, which you can see in your account.</p>
            </>
          )
        },
        {
          heading: "Shipping cost",
          body: (
            <p>
              The cost of sending your order to you is paid by you, the buyer. We tell you the amount after you place your order, before we send it, so you know what
              it is before anything leaves the studio.
            </p>
          )
        },
        {
          heading: "Delivery address",
          body: (
            <p>
              Please check your delivery address and phone number before you place your order, because the courier uses them. If you spot a mistake, write to us at{" "}
              {mail} straight away, with your order reference, and we will try to fix it before the piece is sent.
            </p>
          )
        },
        {
          heading: "Delivery outside Indonesia",
          body: (
            <p>
              Parcels sent abroad may be charged import duties, taxes or handling fees by the destination country or the courier. These are set by them, not by us, and
              are the buyer&rsquo;s responsibility. Delivery times abroad also depend on customs.
            </p>
          )
        },
        {
          heading: "No returns",
          body: (
            <p>
              We do not accept returns, and we do not give money back, if you change your mind or the piece is simply not what you pictured. The only exception is a
              piece that arrives damaged or is not the one you ordered, as described below.
            </p>
          )
        },
        {
          heading: "Damaged or wrong piece",
          body: (
            <>
              <p>
                If your piece arrives damaged, or is not the one you ordered, tell us within one day (24 hours) of receiving it. Write to us at {mail} or on WhatsApp,
                with your order reference and a few clear photographs.
              </p>
              <p>
                Reports made after that day cannot be accepted. Handmade pieces vary a little in colour and shape, as explained in our Terms of Service, and a small
                natural difference is not a fault.
              </p>
            </>
          )
        },
        {
          heading: "Changing a customised order",
          body: (
            <p>
              You can change a customised order until we begin making it. Write to us as early as you can, with your order reference. Once production has begun, the
              order cannot be changed or cancelled, because the piece is being made specially for you.
            </p>
          )
        },
        {
          heading: "Your legal rights",
          body: (
            <p>
              If you live in the United Kingdom, the European Union or elsewhere with consumer protection laws, those rights still apply and nothing here takes them away.
              In many places the usual cooling-off period for online purchases does not apply to goods made to your own specification.
            </p>
          )
        }
      ]}
    />
  );
}
