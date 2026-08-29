"use client";

// A literal iOS-style switch: solid colour track, plain white thumb, one
// small shadow. See .glass-toggle in globals.css.
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
  const dims = size === "sm" ? {w: 38, h: 22, thumb: 18, travel: 16} : {w: 44, h: 26, thumb: 22, travel: 18};

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked}
      onClick={() => onChange(!checked)}
      className="glass-toggle shrink-0 rounded-full"
      style={{width: dims.w, height: dims.h}}
    >
      <span
        className="glass-toggle-thumb block rounded-full"
        style={{
          width: dims.thumb,
          height: dims.thumb,
          transform: checked ? `translateX(${dims.travel}px)` : "translateX(0)"
        }}
      />
    </button>
  );
}
