"use client";

// On/off switch styled after Apple's Liquid Glass switch: a recessed track that
// tints soft sage when on, and a wide frosted-glass capsule thumb that
// stretches slightly while pressed. All the visuals live in .glass-toggle in
// globals.css. The thumb carries Tailwind's backdrop-blur utilities directly
// because this build's CSS pipeline drops hand-written backdrop-filter
// declarations (see the note above .liquid-glass-on-light in globals.css).
export function GlassToggle({
  checked,
  onChange,
  size = "md",
  label
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: "sm" | "md";
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked}
      onClick={() => onChange(!checked)}
      className={`glass-toggle shrink-0 rounded-full${size === "sm" ? " is-sm" : ""}`}
    >
      <span className="glass-toggle-thumb backdrop-blur-[8px] backdrop-saturate-[150%]" />
    </button>
  );
}
