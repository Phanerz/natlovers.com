import {SectionHeading} from "@/components/section-heading";

export default function AboutPage() {
  return (
    <main className="shell py-16 space-y-10 page-enter">
      <SectionHeading
        eyebrow="About Natlovers"
        title="Bermain Serat Alami, Menjalin Gurat Tradisi."
        body="Natlovers is an artisan house from Yogyakarta founded by Anita Yan in 1998, creating unique sustainable natural-fibre crafts that preserve tradition through thoughtful design."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="card motion-card p-8 text-sm leading-8 text-forest-700">
          <p>
            Living in harmony with nature is the idealism Anita has carried since childhood. As a young maker she created doll clothes,
            rag dolls, small purses, and tiny figurines, always drawn to colour, form, and tactile detail.
          </p>
          <p className="mt-4">
            In 1998 she encountered eco-friendly crafts made from natural fibres and was immediately captivated. That moment led her to build
            Natlovers, a brand committed to taking natural materials to a higher level through bags, dolls, pouches, interior accessories,
            necklaces, bracelets, and one-of-a-kind collector pieces.
          </p>
          <p className="mt-4">
            Mendong, water hyacinth, agel, and gajih are transformed into handcrafts with ethnical character and narrative surfaces. Javanese
            natural and cultural treasures are retold through unique bags and dolls, and many works can be personalised to fit each customer.
          </p>
        </div>

        <div className="card motion-card p-8">
          <p className="muted">Key Characteristics</p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-forest-700">
            <p>Hand weaving, embroidery, patchwork, hand stitching, and hand applique in one collectible object.</p>
            <p>Locally harvested natural fibres and recycled plant materials turned into thoughtful, soulful design.</p>
            <p>Storytelling motifs inspired by flowers, birds, dolls, rural life, and Javanese cultural memory.</p>
            <p>Customisable pieces that can be tailored to collector preferences.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card motion-card p-6 text-sm leading-7 text-forest-700">
          <p className="muted">Empowerment</p>
          <p className="mt-4">
            Natlovers has empowered many women crafters, including difable artisans. It is a real contribution to sustaining traditional craft,
            natural fibres, and Javanese cultural legacy.
          </p>
        </div>
        <div className="card motion-card p-6 text-sm leading-7 text-forest-700">
          <p className="muted">Craftsmanship</p>
          <p className="mt-4">
            Natlovers Bag craftsmanship covers weaving, embroidery, hand stitching, patchwork, and hand applique, with leather straps made by
            Anita's husband, Rodi Zeng.
          </p>
        </div>
        <div className="card motion-card p-6 text-sm leading-7 text-forest-700">
          <p className="muted">Reach</p>
          <p className="mt-4">
            The brand has attracted buyers from Japan, Singapore, Malaysia, Korea, Australia, and the United States while remaining rooted in
            Yogyakarta's artisan culture.
          </p>
        </div>
      </div>

      <div className="card motion-card p-8">
        <p className="muted">Natlovers Bag: The Little Bag That Tells Big Stories</p>
        <div className="mt-5 space-y-4 text-sm leading-8 text-forest-700">
          <p>
            Anita once worked in a manufacturing company in Jakarta and noticed woven bags sold as imports. Trusting her instinct, she returned
            to Yogyakarta with her late father, visited local bag makers, and confirmed that these beautiful objects were truly made in nearby
            villages.
          </p>
          <p>
            That discovery changed everything. In the middle of the 1998 Asian financial crisis, Anita left Jakarta to build Natlovers and
            empower these craftsmen directly. Since then, no two bags have felt exactly the same. Birds on leaves, floral scenes, fluffy
            animals, architecture, and Javanese mothers in kebaya all become part of the Natlovers visual language.
          </p>
          <p>
            For more than 25 years, Anita has grown the brand by God's grace through crisis, pandemic, and change, while continuing to pay her
            workers fairly and support a team largely made up of women and difable artisans. Natlovers remains a handmade business with heart.
          </p>
        </div>
      </div>
    </main>
  );
}