"use client";

import {ClipboardEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {Bold, Italic, Underline, Link2, List, ListOrdered, Image as ImageIcon} from "lucide-react";

// Deliberately not a heavier editor framework (Tiptap/Lexical/etc.)  -  this
// is a small, admin-only field with a fixed six-command toolbar, and
// document.execCommand, though legacy, is still universally supported and
// proportionate to that scope. Whatever it produces is re-sanitized to an
// allowlist both here (best-effort UX) and, authoritatively, server-side in
// lib/admin-products.ts before it's ever persisted - see lib/sanitize-html.ts.
//
// Formatting is only ever applied by an explicit toolbar click or keyboard
// shortcut. Selecting text never runs a command  -  the toolbar's pressed
// state below is a read-only reflection of the current selection.

type InlineCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

const trackedCommands: InlineCommand[] = ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"];

const shortcutCommands: Record<string, InlineCommand> = {b: "bold", i: "italic", u: "underline"};

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  labelledBy
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Partial<Record<InlineCommand, boolean>>>({});
  const [focused, setFocused] = useState(false);

  // Mirror the prop into the DOM only when it actually differs from what's
  // already there. While typing, the prop is the editor's own last output, so
  // they match and the caret is never touched; switching to a different
  // product (or any other external reset) differs and is applied.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const refreshActive = useCallback(() => {
    const editor = ref.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
    const next: Partial<Record<InlineCommand, boolean>> = {};
    for (const command of trackedCommands) {
      try {
        next[command] = document.queryCommandState(command);
      } catch {
        next[command] = false;
      }
    }
    setActive(next);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  }, [refreshActive]);

  function exec(command: string, arg?: string) {
    const editor = ref.current;
    if (!editor) return;
    // The toolbar buttons don't take focus (see onMouseDown below), so the
    // editor normally still holds the selection; focus() only matters when
    // the toolbar is used before anything has been clicked.
    if (document.activeElement !== editor) editor.focus();
    document.execCommand(command, false, arg);
    emitChange();
    refreshActive();
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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const command = shortcutCommands[event.key.toLowerCase()];
    if (!command) return;
    event.preventDefault();
    exec(command);
  }

  // Pasted rich text arrives carrying the source's own inline styles and
  // tags (a bold run from a webpage, Word's spans, etc.)  -  paste plain text
  // so nothing is formatted that the admin didn't choose to format.
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (text) exec("insertText", text);
  }

  const textLength = value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").length;

  return (
    <div className="space-y-1.5">
      <div
        role="toolbar"
        aria-label="Description formatting"
        className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-[#d4c5ab] bg-[#f7f1e2] px-2 py-1.5"
      >
        <ToolbarButton label="Bold (Ctrl+B)" pressed={active.bold} onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" pressed={active.italic} onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline (Ctrl+U)" pressed={active.underline} onClick={() => exec("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[#d4c5ab]" aria-hidden />
        <ToolbarButton label="Bullet list" pressed={active.insertUnorderedList} onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" pressed={active.insertOrderedList} onClick={() => exec("insertOrderedList")}>
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
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        spellCheck
        onInput={emitChange}
        onBlur={() => {
          setFocused(false);
          emitChange();
        }}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className={`prose-editor min-h-[140px] cursor-text rounded-b-lg border bg-[#fffdf9] px-4 py-3 text-sm leading-relaxed text-forest-900 outline-none transition-[border-color,box-shadow] duration-150 [caret-color:#172015] ${
          focused ? "border-forest-400 shadow-[0_0_0_3px_rgba(100,138,99,0.28)]" : "border-[#d4c5ab]"
        }`}
      />

      {maxLength ? (
        <p className={`text-right text-xs ${textLength > maxLength ? "text-red-600" : "text-forest-400"}`}>
          {textLength} / {maxLength}
        </p>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  pressed,
  children
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      // Keeps the editor's text selection alive while a toolbar button is
      // pressed (a button normally steals focus on mousedown).
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={label}
      // Explicit bg-transparent/border-none at rest, with focus-visible
      // (not focus) carrying the only "selected-looking" state  -  otherwise
      // the first toolbar button (Bold) picks up the browser's default
      // :focus ring/background as soon as the page loads focus into it,
      // which reads as "stuck on" even though nothing has been clicked.
      className={`flex h-7 w-7 items-center justify-center rounded-md border-none text-forest-700 outline-none transition-colors duration-150 hover:bg-[#eee1c4] hover:text-forest-900 focus-visible:ring-2 focus-visible:ring-forest-400 ${
        pressed ? "bg-[#e4d6ae] text-forest-900" : "bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}
