"use client";

import {useEffect, useRef} from "react";
import {Bold, Italic, Underline, Link2, List, ListOrdered, Image as ImageIcon} from "lucide-react";

// Deliberately not a heavier editor framework (Tiptap/Lexical/etc.)  -  this
// is a small, admin-only field with a fixed six-command toolbar, and
// document.execCommand, though legacy, is still universally supported and
// proportionate to that scope. Whatever it produces is re-sanitized to an
// allowlist both here (best-effort UX) and, authoritatively, server-side in
// lib/admin-products.ts before it's ever persisted - see lib/sanitize-html.ts.
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  maxLength
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks whether the last DOM change came from typing in this editor
  // (skip the sync-from-prop effect) vs. an external reset (e.g. switching
  // which product is being edited), so the caret never jumps mid-typing.
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  function emitChange() {
    if (!ref.current) return;
    isInternalUpdate.current = true;
    onChange(ref.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt("Link URL (https://...)");
    if (!url) return;
    exec("createLink", url);
  }

  function insertImage() {
    const url = window.prompt("Image URL");
    if (!url) return;
    exec("insertImage", url);
  }

  const textLength = ref.current?.textContent?.length ?? value.replace(/<[^>]+>/g, "").length;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[#d4c5ab] bg-[#f7f1e2] px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[#d4c5ab]" aria-hidden />
        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[#d4c5ab]" aria-hidden />
        <ToolbarButton label="Insert link" onClick={insertLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={insertImage}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="prose-editor min-h-[140px] rounded-b-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-sm leading-relaxed text-forest-900 outline-none focus:border-forest-400"
      />

      {maxLength ? (
        <p className={`text-right text-xs ${textLength > maxLength ? "text-red-600" : "text-forest-400"}`}>
          {textLength} / {maxLength}
        </p>
      ) : null}
    </div>
  );
}

function ToolbarButton({label, onClick, children}: {label: string; onClick: () => void; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      // Explicit bg-transparent/border-none at rest, with focus-visible
      // (not focus) carrying the only "selected-looking" state  -  otherwise
      // the first toolbar button (Bold) picks up the browser's default
      // :focus ring/background as soon as the page loads focus into it,
      // which reads as "stuck on" even though nothing has been clicked.
      className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-forest-700 outline-none transition-colors duration-150 hover:bg-[#eee1c4] hover:text-forest-900 focus-visible:ring-2 focus-visible:ring-forest-400"
    >
      {children}
    </button>
  );
}
