"use client";

import {ReactNode, useState} from "react";
import {Plus} from "lucide-react";

export function ProductAccordionRow({title, children}: {title: string; children: ReactNode}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pdp-accordion">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="pdp-accordion-button"
      >
        <span>{title}</span>
        <Plus className={`h-4 w-4 shrink-0 transition-transform duration-300 ${open ? "rotate-45" : ""}`} aria-hidden />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{gridTemplateRows: open ? "1fr" : "0fr"}}
      >
        <div className="overflow-hidden">
          <div className="pdp-accordion-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
