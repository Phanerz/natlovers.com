"use client";

import Image from "next/image";
import {ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2} from "lucide-react";
import {AdminTestimonialGroup, groupImageUrl} from "./testimonial-types";

export function ManageTestimonialsPanel({
  groups,
  loading,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onReorder,
  busyGroupId
}: {
  groups: AdminTestimonialGroup[];
  loading: boolean;
  onEdit: (group: AdminTestimonialGroup) => void;
  onDeactivate: (group: AdminTestimonialGroup) => void;
  onActivate: (group: AdminTestimonialGroup) => void;
  onDelete: (group: AdminTestimonialGroup) => void;
  onReorder: (group: AdminTestimonialGroup, direction: "up" | "down") => void;
  busyGroupId: string | null;
}) {
  const ordered = [...groups].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Manage Testimonials ({ordered.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading testimonials...</p>
      ) : ordered.length ? (
        <div className="space-y-3">
          {ordered.map((group, index) => {
            const testimony = group.cards.find((card) => card.cardType === "testimony");
            const bagUrl = groupImageUrl(group, 1);
            const bagCustomerUrl = groupImageUrl(group, 3);
            const busy = busyGroupId === group.groupId;

            return (
              <div
                key={group.groupId}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] p-4"
              >
                <div className="flex gap-2">
                  {[bagUrl, bagCustomerUrl].map((url, i) => (
                    <div
                      key={i}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#d9ccb3] bg-[#f2ecdc]"
                    >
                      {url ? <Image src={url} alt="Testimonial image" fill className="object-cover" /> : null}
                    </div>
                  ))}
                </div>

                <div className="min-w-[12rem] flex-1">
                  <p className="font-display text-base text-forest-900">{testimony?.customerName ?? "Untitled"}</p>
                  <p className="line-clamp-2 text-sm text-forest-600">{testimony?.testimonyText}</p>
                </div>

                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    group.isActive ? "bg-[#dcead0] text-[#2f5b2b]" : "bg-[#f6ddc9] text-[#8a4a1f]"
                  }`}
                >
                  {group.isActive ? "Active" : "Inactive"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => onReorder(group, "up")}
                    aria-label="Move up"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === ordered.length - 1}
                    onClick={() => onReorder(group, "down")}
                    aria-label="Move down"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(group)}
                    aria-label="Edit testimonial"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {group.isActive ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDeactivate(group)}
                      aria-label="Deactivate testimonial"
                      className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-50"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onActivate(group)}
                      aria-label="Reactivate testimonial"
                      className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-50"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(group)}
                    aria-label="Delete testimonial"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No testimonials yet.</p>
      )}
    </div>
  );
}
