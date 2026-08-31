"use client";

import {ArchiveRestore, Archive as ArchiveIcon, Pencil} from "lucide-react";
import {summarizeBodyShapeDimensions} from "@/lib/body-shapes";
import {AdminBodyShape} from "./body-shape-types";

export function ManageBodyShapesPanel({
  shapes,
  loading,
  onEdit,
  onArchive,
  onUnarchive,
  busyId
}: {
  shapes: AdminBodyShape[];
  loading: boolean;
  onEdit: (shape: AdminBodyShape) => void;
  onArchive: (shape: AdminBodyShape) => void;
  onUnarchive: (shape: AdminBodyShape) => void;
  busyId: string | null;
}) {
  const active = shapes.filter((shape) => !shape.isArchived);
  const archived = shapes.filter((shape) => shape.isArchived);

  function Row({shape}: {shape: AdminBodyShape}) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e7ddc6] bg-[#fffdf9] p-4">
        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-base text-forest-900">{shape.name}</p>
            <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-600">
              {shape.shapeType === "round" ? "Round" : "Box"}
            </span>
            {!shape.inStock ? (
              <span className="rounded-full bg-[#f6ddc9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8a4a1f]">
                Out of stock
              </span>
            ) : null}
            {shape.isArchived ? (
              <span className="rounded-full bg-[#e6e0d8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-500">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-forest-600">{summarizeBodyShapeDimensions(shape)}</p>
          {shape.notes ? <p className="mt-1 text-xs text-forest-500">{shape.notes}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(shape)}
            aria-label={`Edit ${shape.name}`}
            className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {shape.isArchived ? (
            <button
              type="button"
              disabled={busyId === shape.id}
              onClick={() => onUnarchive(shape)}
              aria-label={`Unarchive ${shape.name}`}
              className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-50"
            >
              <ArchiveRestore className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={busyId === shape.id}
              onClick={() => onArchive(shape)}
              aria-label={`Archive ${shape.name}`}
              className="glass-icon-btn is-danger flex h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
            >
              <ArchiveIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Manage Body Shapes ({shapes.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading body shapes...</p>
      ) : shapes.length ? (
        <div className="space-y-6">
          <div className="space-y-3">
            {active.length ? (
              active.map((shape) => <Row key={shape.id} shape={shape} />)
            ) : (
              <p className="py-4 text-center text-sm text-forest-600">No active body shapes.</p>
            )}
          </div>

          {archived.length ? (
            <div className="space-y-3 border-t border-[#e7ddc6] pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">Archived</p>
              {archived.map((shape) => (
                <Row key={shape.id} shape={shape} />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No body shapes yet.</p>
      )}
    </div>
  );
}
