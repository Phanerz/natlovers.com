"use client";

import {useEffect, useMemo, useState} from "react";
import {ArchiveRestore, Archive as ArchiveIcon, Circle, Pencil, Search, Square} from "lucide-react";
import {summarizeBodyShapeDimensions} from "@/lib/body-shapes";
import {DEFAULT_PAGE_SIZE, PageSize, PaginationBar} from "./pagination-bar";
import {AdminBodyShape} from "./body-shape-types";

type ShapeTypeFilter = "all" | "box" | "round";

function ShapeTypeIcon({shapeType}: {shapeType: "box" | "round"}) {
  return shapeType === "round" ? (
    <Circle className="h-4 w-4 shrink-0 text-forest-500" />
  ) : (
    <Square className="h-4 w-4 shrink-0 text-forest-500" />
  );
}

function Row({
  shape,
  onEdit,
  onArchive,
  onUnarchive,
  busy
}: {
  shape: AdminBodyShape;
  onEdit: (shape: AdminBodyShape) => void;
  onArchive: (shape: AdminBodyShape) => void;
  onUnarchive: (shape: AdminBodyShape) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3.5 transition-colors duration-150 hover:bg-[#f6efdd]">
      <ShapeTypeIcon shapeType={shape.shapeType} />

      <div className="min-w-[10rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base text-forest-900">{shape.name}</p>
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
        {shape.notes ? <p className="mt-0.5 text-xs text-forest-500">{shape.notes}</p> : null}
      </div>

      <p className="w-36 shrink-0 text-right font-mono text-xs text-forest-600 sm:text-sm">
        {summarizeBodyShapeDimensions(shape)}
      </p>

      <div className="flex shrink-0 items-center gap-2">
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
            disabled={busy}
            onClick={() => onUnarchive(shape)}
            aria-label={`Unarchive ${shape.name}`}
            className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-50"
          >
            <ArchiveRestore className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
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
  const [query, setQuery] = useState("");
  const [shapeTypeFilter, setShapeTypeFilter] = useState<ShapeTypeFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const archivedCount = useMemo(() => shapes.filter((shape) => shape.isArchived).length, [shapes]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return shapes
      .filter((shape) => showArchived || !shape.isArchived)
      .filter((shape) => shapeTypeFilter === "all" || shape.shapeType === shapeTypeFilter)
      .filter((shape) => !term || shape.name.toLowerCase().includes(term));
  }, [shapes, query, shapeTypeFilter, showArchived]);

  useEffect(() => {
    setPage(1);
  }, [query, shapeTypeFilter, showArchived, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-900">Manage Body Shapes ({shapes.length})</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search bodies by name..."
            className="w-full rounded-full border border-[#d4c5ab] bg-[#fffdf9] py-2.5 pl-11 pr-4 text-sm text-forest-900 outline-none focus:border-forest-400"
          />
        </div>

        {(
          [
            {value: "all", label: "All shapes"},
            {value: "box", label: "Box"},
            {value: "round", label: "Round"}
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setShapeTypeFilter(option.value)}
            className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors duration-150 ${
              shapeTypeFilter === option.value
                ? "bg-forest-900 text-sand-50"
                : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
            }`}
          >
            {option.label}
          </button>
        ))}

        {archivedCount ? (
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-forest-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border border-[#c9bfa8] accent-forest-900"
            />
            Show {archivedCount} archived
          </label>
        ) : null}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading body shapes...</p>
      ) : pageItems.length ? (
        <>
          <div className="space-y-2.5">
            {pageItems.map((shape) => (
              <Row
                key={shape.id}
                shape={shape}
                onEdit={onEdit}
                onArchive={onArchive}
                onUnarchive={onUnarchive}
                busy={busyId === shape.id}
              />
            ))}
          </div>
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : shapes.length ? (
        <p className="py-10 text-center text-sm text-forest-600">No body shapes match.</p>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No body shapes yet.</p>
      )}
    </div>
  );
}
