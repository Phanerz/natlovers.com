import {SectionHeading} from "@/components/section-heading";

const galleryImages = [
  "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
];

export default function GalleryPage() {
  return (
    <main className="shell py-16 space-y-8">
      <SectionHeading
        eyebrow="Gallery"
        title="A visual archive of texture, colour, and narrative craftsmanship."
        body="This section works as both a marketing gallery and a brand storytelling space, closer to a digital exhibition than a standard product grid."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {galleryImages.map((image, index) => (
          <div
            key={image}
            className={`card bg-cover bg-center ${index % 3 === 0 ? "min-h-[520px]" : "min-h-[360px]"}`}
            style={{backgroundImage: `url(${image})`}}
          />
        ))}
      </div>
    </main>
  );
}
