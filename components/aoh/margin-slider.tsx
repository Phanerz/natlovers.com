"use client";

import {useEffect, useState} from "react";
import {motion, useReducedMotion, useSpring, useTransform} from "framer-motion";
import {fmtKoma} from "@/lib/aoh-pricing";

export function MarginSlider({
  value,
  min,
  max,
  step,
  onChange
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, {stiffness: 260, damping: 28, mass: 0.8});
  const fillWidth = useTransform(spring, (v) => `${((v - min) / (max - min)) * 100}%`);

  const [editValue, setEditValue] = useState(fmtKoma(value, 2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, min, max, reduceMotion, spring]);

  // While the field isn't focused, its text tracks the animated spring value
  // (so dragging the slider still tweens the number); while focused, typing
  // takes over and the spring stops overwriting what's being typed.
  useEffect(() => {
    if (focused) return;
    setEditValue(fmtKoma(spring.get(), 2));
    const unsubscribe = spring.on("change", (latest) => setEditValue(fmtKoma(latest, 2)));
    return unsubscribe;
  }, [spring, focused]);

  function commitEditValue() {
    const parsed = parseFloat(editValue.replace(",", "."));
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(Math.round(clamped * 100) / 100);
    } else {
      setEditValue(fmtKoma(value, 2));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/60">Margin</span>
        <label className="flex items-baseline gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={editValue}
            onFocus={(event) => {
              setFocused(true);
              event.currentTarget.select();
            }}
            onChange={(event) => setEditValue(event.target.value)}
            onBlur={() => {
              commitEditValue();
              setFocused(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            aria-label="Margin penjualan (angka)"
            className="aoh-font-display w-[3.2em] bg-transparent text-right text-[23px] font-semibold text-[#f3d9a8] outline-none focus:text-[#f6dfae]"
          />
          <span className="aoh-font-display text-[23px] font-semibold text-[#f3d9a8]">&times;</span>
        </label>
      </div>

      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-0 right-0 h-[6px] overflow-hidden rounded-full">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: fillWidth,
              background: "linear-gradient(90deg, #a97a3d, #f0d29c)"
            }}
          />
        </div>
        <input
          type="range"
          className="aoh-slider relative z-10"
          min={min}
          max={max}
          step={step}
          value={value}
          inputMode="decimal"
          onChange={(event) => onChange(parseFloat(event.target.value))}
          aria-label="Margin penjualan"
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] text-white/50">
        <span>{fmtKoma(min, 2)}&times;</span>
        <span>{fmtKoma(max, 2)}&times;</span>
      </div>
    </div>
  );
}
