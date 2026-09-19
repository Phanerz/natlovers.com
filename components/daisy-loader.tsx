// Shared loading treatment used everywhere the site is still fetching
// something. A minimal daisy (eight petals around a gold center, no stem or
// leaves) whose petals are plucked one after another (a small tug, then each
// drifts out the way it faces while fading), then
// grow back one after another with a springy pop. Under it a serif caption
// that wipes away and wipes in as the petals are plucked and regrow, and a thin gold
// progress bar. Flat per DESIGN.md's glass scope: no blur, just a soft CSS
// drop-shadow glow.
//
// Everything runs on ONE shared beat (BEAT_SECONDS, 9s) so the petals, the
// captions and the progress bar move together: within each beat the petals let
// go at 8% and are all gone by about 41%, the old caption is wiped away over
// exactly that stretch, the new caption wipes in behind it while the petals
// grow back, then holds through full bloom. The CSS in globals.css
// (.daisy-petal-*, .daisy-loader-line, .daisy-loader-fill) is written to the
// same 9s beat: change BEAT_SECONDS and those durations together.
//
// layout="page" (default) fills the content area under the header and hides
// the site footer while it is on screen. layout="section" is the same loader,
// smaller and transparent, for a panel or tab that is still loading inside an
// otherwise finished page.
//
// No client-side state (no hooks, no theme lookup): light/dark is handled by
// the existing `.dark` class on <html> via CSS and all motion is pure CSS, so
// this is safe to render from Server and Client Components alike.

const BEAT_SECONDS = 9;
// Within one caption's 9s: 2.7s wiping in, 3.35s held, 2.95s wiping out.
const ENTER_SECONDS = 2.7;
const HOLD_SECONDS = 3.35;
// The petals start letting go 0.72s into a beat (8% of 9s). A caption starts
// wiping out exactly then, so the first caption starts already mid-hold.
const PETALS_LET_GO_SECONDS = 0.72;

// With no `text` or `messages` prop the caption cycles through these. Ordered
// as a small story about what Natlovers is: the making, then the heart in it,
// then the patience it takes.
const DEFAULT_MESSAGES = [
  "Handmaking something for you to cherish...",
  "Woven by hand, one strand at a time...",
  "The best things in life are handmade...",
  "The beauty of handmade is in the imperfections...",
  "We say handcrafted, but really, it comes from the heart...",
  "Preparing something beautiful for you...",
  "Patience is bitter but its fruit is sweet..."
];

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
  delay: `${(index * 0.28).toFixed(2)}s`
}));

// Keyframes for a caption loop of `count` lines (one line per beat), built per
// count so any number of messages stays on the shared beat. The mask slides
// right to left (100% down to 0%): first uncovering the text left to right,
// then covering it again the same way. The line is hidden at both ends and
// only jumps between its hidden ends at the iteration boundary (an atomic
// step), never through a keyframe pair that could be caught between frames
// and flash the text; visibility backs that up.
function lineKeyframes(count: number) {
  const loop = count * BEAT_SECONDS;
  const pct = (seconds: number) => ((seconds / loop) * 100).toFixed(4);
  const sine = "cubic-bezier(0.37, 0, 0.63, 1)";
  const step = (position: number, visibility: "visible" | "hidden", timing?: string) =>
    `-webkit-mask-position: ${position}% 0; mask-position: ${position}% 0; visibility: ${visibility};${
      timing ? ` animation-timing-function: ${timing};` : ""
    }`;
  const beatEnd = Number(pct(BEAT_SECONDS));

  return `@keyframes daisyLine${count} {
  0% { ${step(100, "visible", sine)} }
  ${pct(ENTER_SECONDS)}% { ${step(60, "visible", "linear")} }
  ${pct(ENTER_SECONDS + HOLD_SECONDS)}% { ${step(40, "visible", sine)} }
  ${beatEnd.toFixed(4)}% { ${step(0, "visible")} }
  ${(beatEnd + 0.0001).toFixed(4)}%, 100% { ${step(0, "hidden")} }
}`;
}

export function DaisyLoader({
  text,
  messages = DEFAULT_MESSAGES,
  variant = "storefront",
  layout = "page",
  showProgress = true,
  progress
}: {
  // Pin one fixed line instead of cycling (route-specific copy).
  text?: string;
  messages?: string[];
  variant?: "storefront" | "admin";
  layout?: "page" | "section";
  showProgress?: boolean;
  progress?: number;
}) {
  const determinate = typeof progress === "number";
  const clampedProgress = determinate ? Math.min(100, Math.max(0, progress as number)) : undefined;
  const count = messages.length;
  const firstLineDelay = PETALS_LET_GO_SECONDS - (ENTER_SECONDS + HOLD_SECONDS);
  const sceneClass =
    layout === "section" ? "is-section" : `is-page ${variant === "admin" ? "is-admin" : "is-storefront"}`;

  return (
    <div role="status" aria-live="polite" className={`daisy-loader-scene ${sceneClass}`}>
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
          <style>{lineKeyframes(count)}</style>
          {messages.map((message, index) => (
            <span
              key={message}
              className="daisy-loader-line"
              aria-hidden={index === 0 ? undefined : true}
              style={{
                animationName: `daisyLine${count}`,
                animationDuration: `${count * BEAT_SECONDS}s`,
                animationDelay: `${(firstLineDelay + index * BEAT_SECONDS).toFixed(2)}s`
              }}
            >
              {message}
            </span>
          ))}
        </div>
      )}

      {showProgress ? (
        <div className="daisy-loader-track">
          <div
            className={`daisy-loader-fill${determinate ? "" : " is-indeterminate"}`}
            style={determinate ? {width: `${clampedProgress}%`} : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
