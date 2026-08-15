"use client";

import {Reorder, useDragControls} from "framer-motion";
import {useRef, useState} from "react";
import {GripVertical, Plus, X} from "lucide-react";
import {MAX_WIDGETS, WIDGET_CATALOG, WIDGET_KEYS, WidgetKey} from "@/lib/admin-widgets";

// Same Reorder/useDragControls pattern already proven in
// manage-hero-cards-panel.tsx — a drag handle starts the gesture
// explicitly (dragListener={false}) rather than the whole row being
// draggable, so the Remove button underneath it stays clickable.
function SelectedWidgetRow({widgetKey, onRemove}: {widgetKey: WidgetKey; onRemove: () => void}) {
  const dragControls = useDragControls();
  const meta = WIDGET_CATALOG[widgetKey];

  return (
    <Reorder.Item
      value={widgetKey}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-3 rounded-2xl border border-[#e4d9c1] bg-white/70 p-3"
      whileDrag={{boxShadow: "0 14px 32px rgba(23,32,21,0.18)", scale: 1.01}}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={(event) => dragControls.start(event)}
        className="glass-icon-btn flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-full text-forest-500 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <meta.icon className="h-4 w-4 shrink-0 text-forest-600" />
      <span className="flex-1 text-sm font-medium text-forest-800">{meta.label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${meta.label}`}
        className="glass-icon-btn is-danger flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-600"
      >
        <X className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

export function AdminWidgetPicker({initialWidgets, onSaved}: {initialWidgets: WidgetKey[]; onSaved: (widgets: WidgetKey[]) => void}) {
  const [selected, setSelected] = useState<WidgetKey[]>(initialWidgets);
  // Same reasoning as manage-hero-cards-panel.tsx's orderRef: Reorder's own
  // onReorder already updates `selected` on every drag frame, but a stale
  // closure risk exists anywhere `selected` gets read async (here, the
  // save handler), so the save button reads this ref instead.
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const available = WIDGET_KEYS.filter((key) => !selected.includes(key));

  function addWidget(key: WidgetKey) {
    if (selected.length >= MAX_WIDGETS) {
      return;
    }
    setSelected((current) => [...current, key]);
  }

  function removeWidget(key: WidgetKey) {
    setSelected((current) => current.filter((item) => item !== key));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "set_admin_widgets", widgets: selectedRef.current})
      });
      if (response.ok) {
        const data: {adminWidgets?: WidgetKey[]} = await response.json().catch(() => ({}));
        onSaved(data.adminWidgets ?? selectedRef.current);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-forest-900">Pinned overview widgets</h3>
      <p className="mt-1 text-xs text-forest-500">
        Choose up to {MAX_WIDGETS} metrics to show on your profile overview. Drag to reorder.
      </p>

      <div className="mt-4 space-y-2">
        {selected.length ? (
          <Reorder.Group axis="y" values={selected} onReorder={setSelected} className="space-y-2">
            {selected.map((key) => (
              <SelectedWidgetRow key={key} widgetKey={key} onRemove={() => removeWidget(key)} />
            ))}
          </Reorder.Group>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#e4d9c1] p-4 text-center text-xs text-forest-500">
            No widgets pinned — pick from below.
          </p>
        )}
      </div>

      {available.length ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Add a metric</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {available.map((key) => {
              const meta = WIDGET_CATALOG[key];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={selected.length >= MAX_WIDGETS}
                  onClick={() => addWidget(key)}
                  className="glass-btn-secondary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-forest-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="glass-btn-primary rounded-full px-5 py-2 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save widget layout"}
        </button>
        {saved ? <span className="text-sm text-forest-600">Saved.</span> : null}
      </div>
    </div>
  );
}
