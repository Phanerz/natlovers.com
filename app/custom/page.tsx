import {CustomRequestForm} from "@/components/forms/custom-request-form";
import {SectionHeading} from "@/components/section-heading";
import {defaultLocale} from "@/lib/site";

export default function CustomPage() {
  return (
    <main className="shell py-16 space-y-8">
      <SectionHeading
        eyebrow="Custom Orders"
        title="Commission a piece with your own story, motif, and palette."
        body="Customers can submit inspiration, preferred size, timeline, and budget. The admin team can then review and respond from the same app."
      />
      <CustomRequestForm locale={defaultLocale} />
    </main>
  );
}
