"use client";

import {FormEvent, useCallback, useEffect, useState} from "react";
import {Plus} from "lucide-react";
import {ManageLocationsPanel} from "./manage-locations-panel";
import {LocationForm} from "./location-form";
import {AdminLocation, LocationFormState, buildLocationFormData, emptyLocationForm, formFromLocation} from "./location-types";
import {Toast, ToastState} from "./toast";
import {useConfirm} from "./use-confirm";

export function OutletsAdmin() {
  const [locationList, setLocationList] = useState<AdminLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [editing, setEditing] = useState<AdminLocation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LocationFormState>(emptyLocationForm());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {confirm, dialog: confirmDialog} = useConfirm();

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/locations", {cache: "no-store"});
      const data: unknown = response.ok ? await response.json().catch(() => []) : [];
      setLocationList(Array.isArray(data) ? (data as AdminLocation[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  function openCreate() {
    setEditing(null);
    setForm(emptyLocationForm());
    setErrorMessage(null);
    setFormOpen(true);
  }

  function openEdit(location: AdminLocation) {
    setEditing(location);
    setForm(formFromLocation(location));
    setErrorMessage(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const formData = buildLocationFormData(form);
      const url = editing ? `/api/admin/locations?id=${encodeURIComponent(editing.id)}` : "/api/admin/locations";
      const response = await fetch(url, {method: editing ? "PATCH" : "POST", body: formData});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data?.error ?? "Could not save the location.");
        return;
      }
      setToast({type: "success", message: editing ? "Location updated." : "Location added."});
      closeForm();
      await loadLocations();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(location: AdminLocation) {
    if (location.isActive) {
      const confirmed = await confirm({
        title: `Deactivate "${location.name}"?`,
        description: "It will no longer show on the public Outlets page. You can reactivate it here anytime.",
        confirmLabel: "Deactivate",
        tone: "danger"
      });
      if (!confirmed) return;
    }
    setBusyId(location.id);
    try {
      const action = location.isActive ? "deactivate" : "activate";
      const response = await fetch(`/api/admin/locations?id=${encodeURIComponent(location.id)}&action=${action}`, {method: "PATCH"});
      if (!response.ok) {
        setToast({type: "error", message: "Could not update the location."});
        return;
      }
      setToast({type: "success", message: location.isActive ? "Location deactivated." : "Location activated."});
      await loadLocations();
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(location: AdminLocation, direction: "up" | "down") {
    setBusyId(location.id);
    try {
      const response = await fetch("/api/admin/locations/reorder", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({id: location.id, direction})
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast({type: "error", message: "Could not reorder locations."});
        return;
      }
      setLocationList(data);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-forest-600">Order here controls the order shown on the public Outlets page.</p>
        {!formOpen ? (
          <button
            type="button"
            onClick={openCreate}
            className="glass-btn-primary flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-sand-50"
          >
            <Plus className="h-4 w-4" />
            Add location
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <LocationForm
          mode={editing ? "edit" : "create"}
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitting={submitting}
          errorMessage={errorMessage}
          onCancel={closeForm}
        />
      ) : null}

      <ManageLocationsPanel
        locationList={locationList}
        loading={loading}
        onEdit={openEdit}
        onToggleActive={handleToggleActive}
        onMove={handleMove}
        busyId={busyId}
      />

      {confirmDialog}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
