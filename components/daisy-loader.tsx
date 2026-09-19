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

// With no `text` prop the caption gently cycles through these, one every five
// seconds (pure CSS crossfade, see .daisy-loader-line). Ordered as a small
// story about what Natlovers is: first the making, then the heart in it, then
// the patience it takes. The CSS keyframes are written for exactly seven
// lines, so keep this list at seven. Passing `text` pins one fixed line
// instead (route-specific copy like "Loading dashboard...").
const CYCLING_MESSAGES = [
  "Handmaking something for you to cherish...",
  "Woven by hand, one strand at a time...",
  "The best things in life are handmade.",
  "The beauty of handmade is in the imperfections.",
  "We say handcrafted, but really, it comes from the heart.",
  "Preparing something beautiful for you...",
  "Patience is bitter but its fruit is sweet."
];
const MESSAGE_SECONDS = 5;

const PETAL_COUNT = 8;

// Slim petal pointing straight up: narrow where it tucks under the center,
// widest about two thirds out, softly rounded tip.
const PETAL_PATH =
  "M0 -5 C5.2 -7 8.2 -14 7.9 -21.5 C7.6 -26.8 3.9 -29 0 -29 C-3.9 -29 -7.6 -26.8 -7.9 -21.5 C-8.2 -14 -5.2 -7 0 -5 Z";
const VEIN_PATH = "M0 -9 L0 -23";

// Per-petal sideways lean (and turn direction) so no two petals fall the
// same way. Deterministic, so server and client render identical markup.
const SWAY = [1, -1, 0.7, -1.2, 1.1, -0.8, 1, -1.1];

const PETALS = Array.from({length: PETAL_COUNT}, (_, index) => ({
  angle: (360 / PETAL_COUNT) * index,
  sway: SWAY[index],
  delay: `${(index * 0.2).toFixed(2)}s`
}));

export function DaisyLoader({
  text,
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

      {text ? (
        <p className="daisy-loader-text">{text}</p>
      ) : (
        <div className="daisy-loader-text daisy-loader-messages">
          {CYCLING_MESSAGES.map((message, index) => (
            <span
              key={message}
              className="daisy-loader-line"
              aria-hidden={index === 0 ? undefined : true}
              style={{animationDelay: `${index * MESSAGE_SECONDS}s`}}
            >
              {message}
            </span>
          ))}
        </div>
      )}

      <div className="daisy-loader-track">
        <div
          className={`daisy-loader-fill${determinate ? "" : " is-indeterminate"}`}
          style={determinate ? {width: `${clampedProgress}%`} : undefined}
        />
      </div>
    </div>
  );
}
