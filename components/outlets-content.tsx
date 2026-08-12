import {MapPin, Clock, MessageCircle} from "lucide-react";
import {SectionHeading} from "@/components/section-heading";

type Outlet = {
  name: string;
  kind: string;
  address: string;
  hours: string;
  contact: string;
};

const outlets: Outlet[] = [
  {
    name: "Natlovers Studio & Showroom",
    kind: "Flagship",
    address: "Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta",
    hours: "Mon–Sat, 09:00–17:00 WIB",
    contact: "+62 812-2697-007"
  }
];

export function OutletsContent() {
  return (
    <div className="shell space-y-10 py-16">
      <SectionHeading
        eyebrow="Find Us"
        title="Visit the studio, or find Natlovers near you."
        body="Our workshop and showroom in Yogyakarta is open to visitors by appointment. We're steadily growing our list of stockist partners across Indonesia and beyond, and this page will keep expanding as new locations come online."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {outlets.map((outlet) => (
          <div key={outlet.name} className="card motion-card p-8 text-sm leading-7 text-forest-700">
            <p className="muted">{outlet.kind}</p>
            <h3 className="mt-2 font-display text-2xl text-forest-900">{outlet.name}</h3>
            <div className="mt-5 space-y-3">
              <p className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 shrink-0" /> {outlet.address}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" /> {outlet.hours}
              </p>
              <p className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0" /> {outlet.contact}
              </p>
            </div>
          </div>
        ))}

        <div className="card motion-card flex flex-col justify-center p-8 text-center text-sm leading-7 text-forest-700">
          <p className="muted">Stockist Partners</p>
          <p className="mt-3 font-display text-xl text-forest-900">More locations coming soon</p>
          <p className="mt-3">
            Interested in carrying Natlovers pieces at your store? Reach out through our socials and we'll follow up about
            wholesale and stockist partnerships.
          </p>
        </div>
      </div>
    </div>
  );
}
