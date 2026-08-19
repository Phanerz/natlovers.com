"use client";

import {useEffect} from "react";
import {motion, useReducedMotion, useSpring, useTransform} from "framer-motion";
import {AnimatedNumber} from "@/components/aoh/animated-number";
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

  useEffect(() => {
    if (reduceMotion) {
      spring.jump(value);
    } else {
      spring.set(value);
    }
  }, [value, min, max, reduceMotion, spring]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Margin</span>
        <span className="font-mono text-2xl font-semibold text-[#f0d29c]">
          <AnimatedNumber value={value} format={(v) => fmtKoma(v, 2)} />
          &times;
        </span>
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

      <div className="flex justify-between font-mono text-[10px] text-white/40">
        <span>{fmtKoma(min, 2)}&times;</span>
        <span>{fmtKoma(max, 2)}&times;</span>
      </div>
    </div>
  );
}
