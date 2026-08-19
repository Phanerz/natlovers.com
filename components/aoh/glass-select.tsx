"use client";

import {useRef, useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {ChevronDown} from "lucide-react";
import {useClickOutside} from "@/components/use-click-outside";

export type GlassSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

export function GlassSelect({
  label,
  value,
  options,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  options: GlassSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const spring = {type: "spring" as const, stiffness: 380, damping: 30};

  useClickOutside(wrapRef, () => setOpen(false), open);

  const current = options.find((option) => option.value === value);

  return (
    <div className="flex flex-col gap-2" ref={wrapRef}>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">{label}</span>
      <div className="relative">
        <motion.button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          whileTap={reduceMotion || disabled ? undefined : {scale: 0.97}}
          transition={spring}
          className="aoh-squircle aoh-glass relative flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left text-[16px] text-[var(--aoh-ink)] disabled:opacity-40"
        >
          <span className="truncate">{current ? current.label : "Pilih"}</span>
          <motion.span
            animate={{rotate: open ? 180 : 0}}
            transition={spring}
            className="shrink-0 text-white/60"
          >
            <ChevronDown size={18} />
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={reduceMotion ? {opacity: 0} : {opacity: 0, scale: 0.94, y: -6}}
              animate={reduceMotion ? {opacity: 1} : {opacity: 1, scale: 1, y: 0}}
              exit={reduceMotion ? {opacity: 0} : {opacity: 0, scale: 0.96, y: -4}}
              transition={reduceMotion ? {duration: 0.12} : spring}
              className="aoh-squircle-sm aoh-glass aoh-panel-solid absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 origin-top overflow-y-auto p-1.5"
              style={{transformOrigin: "top center"}}
            >
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full min-h-[44px] items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-[14px] transition-colors ${
                      active ? "bg-white/16 text-[var(--aoh-ink)]" : "text-white/85 active:bg-white/10"
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.hint ? (
                      <span className="shrink-0 font-mono text-[11px] text-[#e0b477]">{option.hint}</span>
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
