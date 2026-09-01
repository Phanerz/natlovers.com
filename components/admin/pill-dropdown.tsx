"use client";

import {useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown} from "lucide-react";
import {useClickOutside} from "@/components/use-click-outside";

// A pill control: reads as a status badge at rest, opens a small floating
// menu on click instead of rendering as a boxy native <select>. Used for
// anything that's really "pick one of a few states" (Active/Draft/
// Archived, Active/Inactive) rather than a long list, since the trigger
// itself has to stay pill-shaped and readable as a badge. Shares its press
// feedback with every other button site-wide (.button-lift) and its open/
// close motion with the confirm dialog (short, easeOut), rather than
// inventing a one-off animation language just for this control.
export function PillDropdown<T extends string>({
  value,
  options,
  onChange,
  pillClassName,
  disabled,
  align = "left"
}: {
  value: T;
  options: {value: T; label: string}[];
  onChange: (value: T) => void;
  // Caller owns the colour per current value (e.g. green for "active",
  // amber for "draft")  -  keeps this component generic instead of baking
  // in one fixed palette.
  pillClassName: string;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  const current = options.find((option) => option.value === value);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`button-lift flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${pillClassName}`}
      >
        {current?.label ?? value}
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="pill-dropdown-menu"
            role="listbox"
            initial={{opacity: 0, scale: 0.96, y: -4}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.97, y: -2}}
            transition={{duration: 0.14, ease: "easeOut"}}
            className={`absolute top-full z-20 mt-1.5 min-w-[8rem] origin-top space-y-0.5 rounded-xl border border-[#d7cab2] bg-[#fffaf1] p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  setOpen(false);
                  if (option.value !== value) {
                    onChange(option.value);
                  }
                }}
                className={`block w-full whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors duration-150 ${
                  option.value === value ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
