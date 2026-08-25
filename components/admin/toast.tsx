"use client";

import {CheckCircle2, X, XCircle} from "lucide-react";

export type ToastState = {type: "success" | "error"; message: string} | null;

export function Toast({toast, onDismiss}: {toast: ToastState; onDismiss: () => void}) {
  if (!toast) {
    return null;
  }

  const isSuccess = toast.type === "success";

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-lg border px-5 py-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
        isSuccess ? "border-[#2f5b2b]/30 bg-forest-900 text-sand-50" : "border-red-900/30 bg-red-900 text-red-50"
      }`}
    >
      {isSuccess ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />}
      <p className="flex-1 text-sm font-medium leading-6">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="icon-button shrink-0 rounded-full p-1 text-white/70 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
