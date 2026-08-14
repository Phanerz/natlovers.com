import Link from "next/link";
import {ArrowRight, Leaf, MessageCircle, Sparkles} from "lucide-react";
import {SectionHeading} from "@/components/section-heading";

// The homepage's Custom section. It introduces the studio and sends people
// to /custom, where the real intake lives. It deliberately does not repeat
// the form: two intake paths would mean two places a request could arrive
// and two definitions of what a valid one looks like.
const highlights = [
  {
    icon: Sparkles,
    title: "Design it yourself",
    body: "Choose the shape, the fibre, the handle, and the small personal touch that makes it yours."
  },
  {
    icon: Leaf,
    title: "Made by hand in Yogyakarta",
    body: "Every commission is woven by the same makers who make everything else we sell."
  },
  {
    icon: MessageCircle,
    title: "We confirm before anything begins",
    body: "The studio reviews your request and agrees the final design and price with you first."
  }
];

export function CustomContent() {
  return (
    <div className="shell space-y-10 py-16">
      <SectionHeading
        eyebrow="Custom Studio"
        title="Commission a piece with your own story, motif, and palette."
        body="Design it in the studio, share what inspired you, and we'll handcraft it with care."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {highlights.map((highlight) => (
          <div key={highlight.title} className="rounded-[1.6rem] border border-[#e0d8c7] bg-[#fdfaf3] p-6">
            <highlight.icon className="h-5 w-5 text-forest-600" />
            <p className="mt-3 font-display text-lg leading-tight text-forest-900">{highlight.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-forest-600">{highlight.body}</p>
          </div>
        ))}
      </div>

      <Link
        href="/custom"
        className="button-lift inline-flex items-center gap-2 rounded-full bg-forest-900 px-7 py-3.5 text-sm font-semibold text-sand-50"
      >
        Open the Custom Studio
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
