"use client";

import {useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {Check, ChevronDown} from "lucide-react";
import {useClickOutside} from "@/components/use-click-outside";

// A pill control: reads as a status badge at rest, opens a small floating
// menu on click instead of rendering as a boxy native <select>. Used for
// anything that's really "pick one of a few states" (Active/Draft/
// Archived, Active/Inactive) rather than a long list, since the trigger
// itself has to stay pill-shaped and readable as a badge. Deliberately has
// no hover or press motion  -  the trigger sits perfectly still until it is
// clicked, and only the menu itself animates in and out (short, easeOut,
// the same as the confirm dialog).
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
        className={`inline-flex items-center gap-2 transition-none rounded-full px-3.5 py-1.5 text-xs font-semibold leading-none ring-1 ring-inset ring-black/[0.07] outline-none focus-visible:ring-2 focus-visible:ring-forest-400 disabled:cursor-not-allowed disabled:opacity-50 ${pillClassName}`}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
        {current?.label ?? value}
        <ChevronDown className={`h-3 w-3 shrink-0 opacity-70 ${open ? "rotate-180" : ""}`} />
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
            className={`absolute top-full z-20 mt-1.5 min-w-[9.5rem] origin-top space-y-0.5 rounded-2xl border border-[#e0d4bb] bg-[#fffdf8] p-1.5 shadow-[0_12px_28px_-8px_rgba(40,50,30,0.22),0_2px_6px_rgba(40,50,30,0.06)] ${
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
                className={`flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-medium ${
                  option.value === value ? "bg-[#f1ead9] text-forest-900" : "text-forest-700 hover:bg-[#f7f1e2]"
                }`}
              >
                {option.label}
                {option.value === value ? <Check className="h-3.5 w-3.5 text-forest-600" /> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
