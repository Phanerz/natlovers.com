"use client";

import {useCallback, useRef, useState} from "react";
import {ConfirmDialog, ConfirmDialogState} from "./confirm-dialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
};

// Promise-based replacement for window.confirm() - `await confirm({...})`
// reads exactly like the native call did at every existing call site, but
// resolves through a real animated dialog (see confirm-dialog.tsx) instead
// of an unstyleable browser popup. Render `dialog` once near the root of
// whatever component calls this.
export function useConfirm() {
  const [state, setState] = useState<ConfirmDialogState>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }

  const dialog = <ConfirmDialog state={state} onConfirm={() => settle(true)} onCancel={() => settle(false)} />;

  return {confirm, dialog};
}
