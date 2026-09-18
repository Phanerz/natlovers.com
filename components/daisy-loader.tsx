// Shared loading treatment used everywhere the site needs a loading state:
// route-level loading.tsx files and the few full-page Suspense fallbacks
// that used to just show a plain "Loading..." line. A single glowing daisy
// (petals only, no stem or leaves, a plain flower head like a PVZ sunflower)
// with a few loose petals drifting nearby, a serif line of copy, and a thin
// indeterminate progress bar. Flat per DESIGN.md's glass scope: no blur, no
// backdrop-filter, just a soft CSS drop-shadow glow behind the flower.
//
// No client-side state here (no hooks, no theme lookup) - light/dark is
// handled entirely by the existing `.dark` class on <html> via CSS, the same
// mechanism every other themed surface in this codebase already uses. That
// keeps this safe to render from a Server Component (loading.tsx files and
// async page.tsx fallbacks both need that).

const DEFAULT_TEXT = "Preparing something beautiful for you...";

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

export function DaisyLoader({
  text = DEFAULT_TEXT,
  variant = "storefront",
  progress
}: {
  text?: string;
  variant?: "storefront" | "admin";
  progress?: number;
}) {
  const determinate = typeof progress === "number";
  const clampedProgress = determinate ? Math.min(100, Math.max(0, progress as number)) : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`daisy-loader-scene ${variant === "admin" ? "is-admin" : "is-storefront"}`}
    >
      <div className="daisy-loader-flower-stage">
        <svg className="daisy-loader-flower" viewBox="-32 -32 64 64" aria-hidden="true">
          <g className="daisy-loader-petals">
            {PETAL_ANGLES.map((angle) => (
              <ellipse key={angle} cx="0" cy="-19" rx="7.5" ry="14" transform={`rotate(${angle})`} />
            ))}
          </g>
          <circle className="daisy-loader-center" cx="0" cy="0" r="9" />
        </svg>

        <span className="daisy-loose-petal daisy-loose-petal-1" aria-hidden="true">
          <svg viewBox="0 0 20 30" className="daisy-loose-petal-svg">
            <ellipse cx="10" cy="15" rx="7" ry="12" />
          </svg>
        </span>
        <span className="daisy-loose-petal daisy-loose-petal-2" aria-hidden="true">
          <svg viewBox="0 0 20 30" className="daisy-loose-petal-svg">
            <ellipse cx="10" cy="15" rx="6" ry="10" />
          </svg>
        </span>
        <span className="daisy-loose-petal daisy-loose-petal-3" aria-hidden="true">
          <svg viewBox="0 0 20 30" className="daisy-loose-petal-svg">
            <ellipse cx="10" cy="15" rx="5.5" ry="9" />
          </svg>
        </span>
      </div>

      <p className="daisy-loader-text">{text}</p>

      <div className="daisy-loader-track">
        <div
          className={`daisy-loader-fill${determinate ? "" : " is-indeterminate"}`}
          style={determinate ? {width: `${clampedProgress}%`} : undefined}
        />
      </div>
    </div>
  );
}
