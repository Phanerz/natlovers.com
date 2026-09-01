"use client";

import {useEffect} from "react";
import {AnimatePresence, motion} from "framer-motion";

export type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
} | null;

// A real dialog, not window.confirm() - blurred/dimmed backdrop, the card
// itself using the same flat `.card` surface as everything else per
// DESIGN.md (subtle shadow, no glass bevel; the blur lives on the backdrop
// scrim behind it, not the panel), with a spring-like scale-in instead of
// an abrupt native popup. Exit is animated too (AnimatePresence), so
// dismissing reads as deliberate rather than the dialog just vanishing.
export function ConfirmDialog({
  state,
  onConfirm,
  onCancel
}: {
  state: ConfirmDialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state, onCancel]);

  return (
    <AnimatePresence>
      {state ? (
        <motion.div
          key="confirm-backdrop"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          transition={{duration: 0.16, ease: "easeOut"}}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1c16]/45 px-4 backdrop-blur-sm"
        >
          <motion.div
            key="confirm-panel"
            initial={{opacity: 0, scale: 0.94, y: 6}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.96, y: 4}}
            transition={{duration: 0.2, ease: [0.22, 1, 0.36, 1]}}
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="card w-full max-w-sm space-y-5 p-6"
          >
            <div className="space-y-2">
              <h2 id="confirm-dialog-title" className="font-display text-lg text-forest-900">
                {state.title}
              </h2>
              <p className="text-sm leading-relaxed text-forest-600">{state.description}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-5 py-2.5 text-sm font-medium text-forest-700 transition-colors duration-150 hover:bg-[#f0e7d4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  state.tone === "danger"
                    ? "rounded-full bg-[#a4402b] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#8f3624]"
                    : "glass-btn-primary rounded-full px-5 py-2.5 text-sm font-semibold text-sand-50"
                }
              >
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
