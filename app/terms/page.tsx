import type {Metadata} from "next";
import {LegalPage} from "@/components/legal-page";
import {LEGAL} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service - Natlovers",
  description: "The terms for using the Natlovers website and ordering handmade pieces."
};

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      current="/terms"
      intro={
        <p>
          These terms apply when you use this website or place an order with {LEGAL.brand}. By placing an order you agree to them, to our Returns &amp; Shipping page
          and to our Privacy Policy. Please read them, and ask us if anything is unclear.
        </p>
      }
      sections={[
        {
          heading: "Who you are dealing with",
          body: (
            <p>
              {LEGAL.brand}, a handmade craft studio at {LEGAL.address}. You can write to us at {mail}.
            </p>
          )
        },
        {
          heading: "Handmade pieces",
          body: (
            <>
              <p>
                Everything we sell is made by hand from natural fibres and felt. That is what makes each piece special, and it also means no two are exactly alike.
                Colours, texture, size and stitching can differ a little from the photographs and from the piece you saw, and your screen may show colours differently.
                These small differences are part of the craft, not a fault.
              </p>
            </>
          )
        },
        {
          heading: "Prices",
          body: (
            <p>
              Each piece has a fixed price in Indonesian rupiah and a separate fixed price in US dollars, both set by us. We do not convert between them, and the
              currency shown is the one you pay in. Add-ons such as felted animals are priced as shown when you choose them. We may change prices at any time, but a
              change never affects an order you have already placed.
            </p>
          )
        },
        {
          heading: "Placing an order and paying",
          body: (
            <>
              <p>
                When you place an order we reserve it for you and give you an order reference. Your order is confirmed once we have received your payment. We may decline
                or cancel an order, for example if we cannot make it, and if we do we will refund anything you have paid for it.
              </p>
              <p>
                Rupiah orders are paid by bank transfer to the account shown at checkout. US dollar orders are paid by an invoice we send you, by PayPal or international
                bank transfer. Any bank or transfer fees charged to you are your own.
              </p>
            </>
          )
        },
        {
          heading: "Customised pieces",
          body: (
            <>
              <p>
                You can choose colours, add felted animals, write us a note and upload photos of a pet, a person or a home. We will make your piece as closely as handwork
                allows, but a handmade copy is an interpretation, not an exact likeness.
              </p>
              <p>
                You confirm that you have the right to share any photo or text you give us. We use them only to make your piece and handle your order, and we do not
                publish them without asking you first. Because customised pieces are made for you, they cannot be returned once production begins, as set out in our
                Returns &amp; Shipping page.
              </p>
            </>
          )
        },
        {
          heading: "Making and delivery times",
          body: (
            <p>
              Most pieces ship within one to three weeks, depending on customisation and demand. This is an estimate, not a promise. We will contact you after your
              purchase to confirm details and timing, and tell you if something will take longer.
            </p>
          )
        },
        {
          heading: "Our designs",
          body: (
            <p>
              The designs, photographs, text and artwork on this website belong to {LEGAL.brand} and its designer, Anita Yan. Please do not copy or reuse them, or sell
              pieces made from our designs, without our written permission.
            </p>
          )
        },
        {
          heading: "Using the website",
          body: (
            <p>
              Please use the site honestly and lawfully. Do not try to break into it, overload it, copy its content in bulk, or use it to send us anything harmful or
              unlawful. We may suspend an account that does.
            </p>
          )
        },
        {
          heading: "Our responsibility",
          body: (
            <p>
              We take care over what we make and what we tell you. We do not exclude responsibility where the law does not allow it, including for anything you are
              entitled to by law as a consumer. Beyond that, our responsibility for any order is limited to the price you paid for it, and we are not responsible for
              delays or losses caused by events outside our control, such as couriers, customs, weather or illness.
            </p>
          )
        },
        {
          heading: "Your legal rights",
          body: <p>Nothing in these terms takes away rights you have by law where you live.</p>
        },
        {
          heading: "Law and disputes",
          body: (
            <p>
              These terms are governed by the laws of Indonesia. If we cannot settle a problem by talking, the courts of Indonesia can decide it, although if you are a
              consumer elsewhere you may also have the right to bring a claim in your own country. Please write to us first at {mail}, and we will do our best to put
              it right.
            </p>
          )
        },
        {
          heading: "Changes",
          body: <p>We may update these terms. The version that applies to your order is the one shown when you placed it.</p>
        }
      ]}
    />
  );
}
