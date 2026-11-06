import type {Metadata} from "next";
import {LegalPage} from "@/components/legal-page";
import {LEGAL} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Returns & Shipping - Natlovers",
  description: "How Natlovers ships handmade pieces, and what happens if something is not right."
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function ReturnsPage() {
  return (
    <LegalPage
      title="Returns & Shipping"
      current="/returns"
      intro={
        <p>
          Each piece is made by hand in Yogyakarta, so we would rather talk to you than follow a script. This page explains how delivery works and what to do if
          something is not right.
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
          heading: "Customised pieces",
          body: (
            <p>
              Customised pieces cannot be returned once production begins, because they are made specially for you. If you want to change or cancel a customised order,
              write to us as early as you can. If we have not started making it, we will do our best to help.
            </p>
          )
        },
        {
          heading: "If something is not right",
          body: (
            <>
              <p>
                If your piece arrives damaged, or is not what you ordered, please write to us at {mail} as soon as you receive it. Include your order reference and a few
                clear photographs, and we will work out the best way to put it right with you.
              </p>
              <p>
                Handmade pieces vary a little in colour and shape, as explained in our Terms of Service. A small natural difference is not a fault, but if you are not
                happy, tell us and we will listen.
              </p>
            </>
          )
        },
        {
          heading: "Ready-made pieces",
          body: (
            <p>
              If a ready-made piece is not right for you, contact us before sending anything back, so we can agree how to do it. Please do not send a parcel without
              speaking to us first.
            </p>
          )
        },
        {
          heading: "Refunds",
          body: (
            <p>
              If we agree to a refund, we send it back by the same route you paid, a bank transfer for rupiah orders and PayPal or an international bank transfer for US
              dollar orders. If we cancel an order we cannot make, we refund everything you paid for it.
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
