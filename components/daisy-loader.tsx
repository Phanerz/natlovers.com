// Shared loading treatment used everywhere the site needs a loading state:
// route-level loading.tsx files and the few full-page Suspense fallbacks.
// Fills the whole content area under the site header. A minimal daisy (ten
// slim petals around a gold center, no stem or leaves) whose petals drop off
// one after another, tumbling and swaying as they fall, then grow back one
// after another with a springy pop, chasing each other round the flower on a
// loop. Serif line of copy and a thin gold progress bar underneath. Flat per
// DESIGN.md's glass scope: no blur, just a soft CSS drop-shadow glow.
//
// No client-side state (no hooks, no theme lookup): light/dark is handled by
// the existing `.dark` class on <html> via CSS and the petal motion is pure
// CSS, so this stays safe to render from a Server Component.

const DEFAULT_TEXT = "Preparing something beautiful for you...";

const PETAL_COUNT = 10;

// Slim petal pointing straight up: narrow where it tucks under the center,
// widest about two thirds out, softly rounded tip.
const PETAL_PATH =
  "M0 -5 C4.4 -7 6.9 -14 6.6 -21.5 C6.4 -26.8 3.3 -29 0 -29 C-3.3 -29 -6.4 -26.8 -6.6 -21.5 C-6.9 -14 -4.4 -7 0 -5 Z";
const VEIN_PATH = "M0 -9 L0 -23";

// Per-petal sideways sway (and tumble direction) so no two petals fall the
// same way. Deterministic, so server and client render identical markup.
const SWAY = [1, -1, 0.7, -1.2, 1.1, -0.8, 1, -1.1, 0.8, -0.9];

const PETALS = Array.from({length: PETAL_COUNT}, (_, index) => ({
  angle: (360 / PETAL_COUNT) * index,
  sway: SWAY[index],
  delay: `${(index * 0.55).toFixed(2)}s`
}));

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
      <svg className="daisy-loader-flower" viewBox="-36 -36 72 72" aria-hidden="true">
        <defs>
          <linearGradient id="daisy-petal-fill" x1="0" y1="0" x2="0" y2="1">
            <stop className="daisy-stop-tip" offset="0" />
            <stop className="daisy-stop-base" offset="1" />
          </linearGradient>
          <radialGradient id="daisy-center-fill" cx="0.38" cy="0.32" r="0.78">
            <stop className="daisy-stop-center-a" offset="0" />
            <stop className="daisy-stop-center-b" offset="1" />
          </radialGradient>
        </defs>

        {PETALS.map((petal) => {
          const style = {"--s": petal.sway, animationDelay: petal.delay} as React.CSSProperties;
          return (
            <g key={petal.angle} className="daisy-petal-fall" style={style}>
              <g transform={`rotate(${petal.angle})`}>
                <g className="daisy-petal-tumble" style={style}>
                  <path className="daisy-petal-shape" d={PETAL_PATH} fill="url(#daisy-petal-fill)" />
                  <path className="daisy-petal-vein" d={VEIN_PATH} />
                </g>
              </g>
            </g>
          );
        })}

        <circle className="daisy-center-halo" cx="0" cy="0" r="11.4" />
        <circle cx="0" cy="0" r="8.6" fill="url(#daisy-center-fill)" />
      </svg>

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
