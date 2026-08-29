"use client";

// Real Apple-style Liquid Glass toggle (see .glass-toggle in globals.css) -
// the one deliberate exception to the admin panel's flat-inputs rule,
// matched against iOS Control Center's own switches: translucent frosted
// glass off, tinted glass (not flat colour) on, a glossy frosted thumb that
// slides and briefly stretches on press the way a real glass control does.
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
      className="glass-toggle shrink-0 rounded-full backdrop-blur-md backdrop-saturate-150"
      style={{width: dims.w, height: dims.h, "--glass-toggle-travel": `${dims.travel}px`} as React.CSSProperties}
    >
      <span
        className="glass-toggle-thumb block rounded-full backdrop-blur-sm backdrop-saturate-150"
        style={{
          width: dims.thumb,
          height: dims.thumb,
          transform: checked ? `translateX(${dims.travel}px)` : "translateX(0)"
        }}
      />
    </button>
  );
}
