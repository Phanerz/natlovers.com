// Shared loading treatment used everywhere the site needs a loading state:
// route-level loading.tsx files and the few full-page Suspense fallbacks.
// Always full screen (fixed, above the header). A big glowing daisy, petals
// and center only, with the PopCap / PVZ loading effect: the petals drop off
// one by one, then grow back one by one, on a loop. Under the flower sit a
// serif line of copy and a thin gold progress bar. Flat per DESIGN.md's
// glass scope: no blur, just a soft CSS drop-shadow glow behind the flower.
//
// No client-side state (no hooks, no theme lookup): light/dark is handled by
// the existing `.dark` class on <html> via CSS, and the petal animation is
// pure CSS, so this stays safe to render from a Server Component.

const DEFAULT_TEXT = "Preparing something beautiful for you...";

const PETAL_COUNT = 8;
const FALL_DISTANCE = 56;

const PETALS = Array.from({length: PETAL_COUNT}, (_, index) => {
  const angle = (360 / PETAL_COUNT) * index;
  const radians = (angle * Math.PI) / 180;
  // The petal lives inside a rotated group, so "straight down the screen" in
  // its local frame is (sin a, cos a). Precomputed so each petal falls
  // toward the bottom of the screen no matter where it sits on the flower.
  return {
    angle,
    index,
    fallX: Number((Math.sin(radians) * FALL_DISTANCE).toFixed(2)),
    fallY: Number((Math.cos(radians) * FALL_DISTANCE).toFixed(2))
  };
});

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
        {PETALS.map((petal) => (
          <g key={petal.angle} transform={`rotate(${petal.angle})`}>
            <ellipse
              className="daisy-petal"
              cx="0"
              cy="-20"
              rx="7.6"
              ry="13.5"
              style={
                {
                  "--fall-x": `${petal.fallX}px`,
                  "--fall-y": `${petal.fallY}px`,
                  "--fall-spin": `${petal.index % 2 === 0 ? 38 : -38}deg`,
                  animationDelay: `${(petal.index * 0.55).toFixed(2)}s`
                } as React.CSSProperties
              }
            />
          </g>
        ))}
        <circle className="daisy-loader-center" cx="0" cy="0" r="9.5" />
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
