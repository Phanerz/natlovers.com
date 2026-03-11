import {ContactForm} from "@/components/forms/contact-form";
import {SectionHeading} from "@/components/section-heading";
import {defaultLocale} from "@/lib/site";

const mapSrc =
  "https://www.google.com/maps?q=Jl.%20Tata%20Bumi%20Selatan%20No.107%2C%20Area%20Sawah%2C%20Banyuraden%2C%20Kec.%20Gamping%2C%20Kabupaten%20Sleman%2C%20Daerah%20Istimewa%20Yogyakarta%2055293%2C%20Indonesia&z=16&output=embed";

export default function ContactPage() {
  return (
    <main className="shell py-16 space-y-8 page-enter">
      <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <SectionHeading
            eyebrow="Contact"
            title="Visit the studio, enquire about a piece, or start a custom commission."
            body="Natlovers can help with collector enquiries, gifting, custom storytelling bags, direct WhatsApp contact, and stockist information."
          />
          <div className="card motion-card space-y-4 p-6 text-sm leading-7 text-forest-700">
            <p>
              <strong>Studio Address:</strong> Jl. Tata Bumi Selatan No.107, Area Sawah, Banyuraden, Kec. Gamping, Kabupaten Sleman, Daerah
              Istimewa Yogyakarta 55293, Indonesia
            </p>
            <p>
              <strong>Email:</strong> natlovers@gmail.com
            </p>
            <p>
              <strong>WhatsApp Anita Yan:</strong> +62 812-2697-007
            </p>
            <p>
              <strong>WhatsApp Phanuel Ebenezer Rodizeng:</strong> +62 811-2500-1888
            </p>
            <p>
              <strong>Hours:</strong> Monday to Saturday, 10:00 - 18:00 WIB
            </p>
          </div>
        </div>
        <ContactForm locale={defaultLocale} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="card motion-card overflow-hidden">
          <iframe
            title="Natlovers Studio Map"
            src={mapSrc}
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="card motion-card p-6 text-sm leading-7 text-forest-700">
          <p className="muted">Available At</p>
          <ul className="mt-5 space-y-3">
            <li>Sarinah JKT</li>
            <li>Daun Gift Shop Bali</li>
            <li>Sidomuncul Gallery, Hotel Tentrem</li>
            <li>Hotel Royal Ambarrukmo Jogja</li>
            <li>Wastra Gallery Sheraton Surabaya</li>
          </ul>
        </div>
      </div>
    </main>
  );
}