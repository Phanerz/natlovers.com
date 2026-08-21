"use client";

import {ReactNode, useState} from "react";
import {Plus} from "lucide-react";

export function ProductAccordionRow({title, children}: {title: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-forest-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-forest-800">{title}</span>
        <Plus className={`h-4 w-4 shrink-0 text-forest-500 transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{gridTemplateRows: open ? "1fr" : "0fr"}}
      >
        <div className="overflow-hidden">
          <div className="pb-4 text-sm leading-relaxed text-forest-600">{children}</div>
        </div>
      </div>
    </div>
  );
}
