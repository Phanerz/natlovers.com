import {SectionHeading} from "@/components/section-heading";

const socials = [
  {
    name: "Instagram",
    handle: "@natlovers1998",
    href: "https://www.instagram.com/natlovers1998/?hl=en",
    note: "Behind-the-scenes making process, new launches, and collector updates."
  },
  {
    name: "WhatsApp Anita Yan",
    handle: "+62 812-2697-007",
    href: "https://wa.me/628122697007",
    note: "Direct enquiries for bespoke orders, availability, and collector communication."
  },
  {
    name: "WhatsApp Phanuel Ebenezer Rodizeng",
    handle: "+62 811-2500-1888",
    href: "https://wa.me/6281125001888",
    note: "Business and order follow-up contact while the brand expands digitally."
  },
  {
    name: "Email",
    handle: "natlovers@gmail.com",
    href: "mailto:natlovers@gmail.com",
    note: "For written enquiries, partnerships, gifting, and stockist communication."
  }
];

export default function SocialMediasPage() {
  return (
    <main className="shell py-16 space-y-8 page-enter">
      <SectionHeading
        eyebrow="Social Medias"
        title="Stay close to the making process."
        body="Follow Natlovers through Instagram and direct contact channels for launches, custom commissions, and conversations with the studio."
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            className="card motion-card p-6 transition-transform hover:-translate-y-1"
          >
            <p className="muted">{social.name}</p>
            <p className="mt-4 font-display text-3xl text-forest-900">{social.handle}</p>
            <p className="mt-4 text-sm leading-7 text-forest-700">{social.note}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
