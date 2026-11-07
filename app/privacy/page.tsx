import type {Metadata} from "next";
import {LegalPage} from "@/components/legal-page";
import {LEGAL} from "@/lib/legal";
import {getContactSettings} from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Privacy Policy - Natlovers",
  description: "What Natlovers collects, why, who it is shared with, how long it is kept, and your choices."
};

// The contact details come from the admin panel, so this page is built fresh for each visit.
export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const contact = await getContactSettings();
  const mail = <a href={`mailto:${contact.email}`}>{contact.email}</a>;

  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      intro={
        <p>
          We make each piece by hand, and we only ask for what we need to make it and get it to you. This page explains what we collect, why, who helps us handle it,
          and the choices you have.
        </p>
      }
      sections={[
        {
          heading: "Who we are",
          body: (
            <>
              <p>
                {LEGAL.brand} is a handmade craft studio at {LEGAL.address}. We run this website and decide how your information is used. You can reach us about
                anything on this page at {mail}.
              </p>
            </>
          )
        },
        {
          heading: "What we collect",
          body: (
            <ul>
              <li>
                <strong>Your account.</strong> When you sign in with Google we receive your name, email address and profile picture.
              </li>
              <li>
                <strong>Your orders.</strong> Your name, phone number and delivery address, what you ordered, the choices you made (colours, animals, notes), the
                currency you paid in, and the status of your order and delivery.
              </li>
              <li>
                <strong>Photos and notes you add.</strong> If you upload a photo of a pet, a person or a home so we can copy it, or write us a note, we keep it with
                your order.
              </li>
              <li>
                <strong>Your country.</strong> Your connection tells us roughly which country you are in. We use it to suggest your country and whether to show prices in
                rupiah or US dollars. The country and currency you confirm are kept only in your own browser, not on our servers. If you allow Analytics in our cookie
                preferences, we also keep one anonymous record for each new device: the country, and whether it was a phone or a laptop. It holds no name, email
                address, IP address or anything else that could identify you. If you do not allow Analytics, we keep nothing.
              </li>
              <li>
                <strong>What you do while signed in.</strong> When you sign in, we can see which pieces you have ordered, put in your bag or saved as a favourite, so
                we can look after your orders and understand what people like.
              </li>
              <li>
                <strong>Technical records.</strong> Our hosting providers keep standard server logs (such as IP address and time) to keep the site running and secure.
              </li>
            </ul>
          )
        },
        {
          heading: "Why we use it",
          body: (
            <ul>
              <li>To make, pack and deliver your order, and to contact you about it.</li>
              <li>To take payment and keep a record of it, which the law may require us to hold.</li>
              <li>To work from the photos and notes you give us, which we only do with your agreement when you add them.</li>
              <li>To run, protect and improve the shop, for example fixing errors and preventing misuse.</li>
              <li>To answer your questions and requests.</li>
            </ul>
          )
        },
        {
          heading: "Cookies and similar storage",
          body: (
            <>
              <p>
                Necessary: a sign-in cookie that keeps you signed in, and small items in your browser that remember your bag, your theme, your currency and language, and
                your choices on our cookie notice and location question, so we do not ask you again on the same device. These are always on, because the shop cannot
                work without them.
              </p>
              <p>
                Analytics (off until you allow it): one anonymous count of each new device, as described above. Marketing: we do not use any marketing or
                advertising cookies today. The switch is in your cookie preferences so that, if we ever add any, nothing is switched on without your say-so.
              </p>
              <p>
                You can change your cookie choices at any time with &ldquo;Cookie settings&rdquo; at the foot of every page, and your country and currency with the
                location button next to it. If we ever add anything new, we will say so here and ask you first.
              </p>
            </>
          )
        },
        {
          heading: "Who helps us handle it",
          body: (
            <>
              <p>We do not sell your information. We share it only with the services that help us run the shop, and only as far as they need:</p>
              <ul>
                <li>Google, for signing in.</li>
                <li>Vercel, which hosts the website and stores uploaded photos.</li>
                <li>Supabase, which stores our database of accounts and orders.</li>
                <li>Resend, which sends our emails to you.</li>
                <li>Couriers, who receive your name, phone number and address to deliver your order.</li>
                <li>Payment channels: your bank for rupiah transfers, and PayPal or an international bank transfer for US dollar orders.</li>
                <li>OpenStreetMap and Esri, whose map pictures load when you open our Outlets map, so they see your IP address.</li>
              </ul>
              <p>We may also share information where the law requires it.</p>
            </>
          )
        },
        {
          heading: "Where it is stored",
          body: (
            <p>
              Our hosting and database providers run servers in several countries, so your information may be handled outside Indonesia and outside your own country.
              We choose providers that protect it to a recognised standard.
            </p>
          )
        },
        {
          heading: "How long we keep it",
          body: (
            <p>
              We keep your information only as long as we need it: to make and deliver your order, to answer questions afterwards, and to meet accounting and legal
              duties. After that we delete it or remove what identifies you. Photos you upload are used to make your piece. We keep them for one year after your order is
              delivered and then delete them. You can ask us to delete them sooner, and we will. We only show a photo of your piece, or your own photo, on social
              media with your written consent, which we usually ask for on WhatsApp.
            </p>
          )
        },
        {
          heading: "Your choices and rights",
          body: (
            <>
              <p>
                Depending on where you live (for example Indonesia, the United Kingdom, the European Union or Hong Kong), you may have the right to see what we hold about
                you, correct it, have it deleted, object to how we use it, take a copy of it, or withdraw consent you gave earlier.
              </p>
              <p>
                To use any of these, email {mail}. We may need to confirm it is really you, and we will reply as soon as we reasonably can. If you are unhappy with our
                answer, you can complain to the data protection authority where you live.
              </p>
            </>
          )
        },
        {
          heading: "Photos of other people",
          body: (
            <p>
              Only upload a photo if you have the right to share it. If it shows another person, make sure they are happy for us to use it, and if it shows a child,
              you should be their parent or guardian. Our shop is meant for adults, and we do not knowingly collect information from children.
            </p>
          )
        },
        {
          heading: "Keeping it safe",
          body: (
            <p>
              We use reasonable technical and practical measures to protect your information, such as secure connections and limited access to our admin area. No
              website can promise perfect security, so please tell us straight away if you think something is wrong.
            </p>
          )
        },
        {
          heading: "Changes",
          body: <p>If we change this page in a way that matters, we will update the date at the top. Please look back now and then.</p>
        }
      ]}
    />
  );
}
