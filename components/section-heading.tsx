export function SectionHeading({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="muted">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {body ? <p className="text-base leading-8 text-forest-700">{body}</p> : null}
    </div>
  );
}
