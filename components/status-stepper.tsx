"use client";

import {Check} from "lucide-react";

// A generic N-stage progress tracker  -  fully agnostic of what the stages
// actually mean, so the same visual serves both the admin's 4-stage
// Submitted/Under review/Approved/Completed view and the customer-facing
// 3-stage collapsed view (see customerFacingStatusSteps in
// lib/custom-studio.ts), rather than two near-identical hand-rolled
// steppers drifting apart over time. A terminal/exception state that isn't
// part of the linear path (e.g. Cancelled) is the caller's job to detect
// and render as its own banner instead of passing it in here.
export function StatusStepper({steps, currentIndex}: {steps: string[]; currentIndex: number}) {
  const count = steps.length;
  const edgeInsetPercent = 100 / (count * 2);
  const spanPercent = 100 - edgeInsetPercent * 2;
  const progressPercent = count > 1 ? (Math.max(0, currentIndex) / (count - 1)) * spanPercent : 0;

  return (
    <div className="relative flex items-start justify-between pt-1">
      <div
        className="absolute top-3.5 h-0.5 bg-[#e7ddc6]"
        style={{left: `${edgeInsetPercent}%`, right: `${edgeInsetPercent}%`}}
      />
      <div
        className="absolute top-3.5 h-0.5 bg-forest-700 transition-all duration-300"
        style={{left: `${edgeInsetPercent}%`, width: `${progressPercent}%`}}
      />
      {steps.map((label, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={label} className="relative z-10 flex flex-col items-center gap-1.5" style={{width: `${100 / count}%`}}>
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                isComplete
                  ? "border-forest-700 bg-forest-700 text-sand-50"
                  : isCurrent
                    ? "border-forest-700 bg-white text-forest-700"
                    : "border-[#d9cfc0] bg-[#fffdf9] text-forest-400"
              }`}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span className={`text-center text-[10.5px] font-medium leading-tight ${isCurrent || isComplete ? "text-forest-800" : "text-forest-400"}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
