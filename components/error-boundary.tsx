"use client";

import {Component, ReactNode} from "react";

// Next's app/error.tsx convention only wraps the {children} a layout
// renders — it does not cover the layout itself. Header and Footer render
// as siblings of {children} in app/layout.tsx, outside that boundary, so a
// crash in either (the header especially carries real client logic: the
// drag-to-navigate pill, cart drawer, checkout form, search modal) would
// otherwise propagate all the way to app/global-error.tsx, tearing down the
// entire app shell — losing auth/cart/locale state — instead of just that
// one region. A React error boundary has to be a class component (no hook
// equivalent exists), which is why this is the one class in the codebase.
type Props = {children: ReactNode; fallback: ReactNode};
type State = {hasError: boolean};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false};

  static getDerivedStateFromError() {
    return {hasError: true};
  }

  componentDidCatch(error: unknown) {
    // No error-tracking service is wired up in this app yet — this is the
    // only record of the failure until one is, so it stays a console.error
    // rather than being silently swallowed.
    console.error("Error boundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
