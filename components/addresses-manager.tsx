"use client";

import {FormEvent, useEffect, useState} from "react";
import {Check, MapPin, Pencil, Plus, Trash2} from "lucide-react";
import {PhoneInput} from "@/components/phone-input";
import type {AddressView} from "@/lib/addresses";

type AddressFormState = {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

function emptyAddressForm(): AddressFormState {
  return {label: "Home", recipientName: "", phone: "", street: "", city: "", province: "", postalCode: "", country: "Indonesia"};
}

function formFromAddress(address: AddressView): AddressFormState {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    street: address.street,
    city: address.city,
    province: address.province ?? "",
    postalCode: address.postalCode,
    country: address.country
  };
}

const fieldClass =
  "w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400";

export function AddressesManager() {
  const [addresses, setAddresses] = useState<AddressView[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(emptyAddressForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/account/addresses", {cache: "no-store"});
    const data: unknown = response.ok ? await response.json().catch(() => []) : [];
    setAddresses(Array.isArray(data) ? (data as AddressView[]) : []);
  }

  useEffect(() => {
    load();
  }, []);

  function startAdd() {
    setEditingId(null);
    setForm(emptyAddressForm());
    setError(null);
    setFormOpen(true);
  }

  function startEdit(address: AddressView) {
    setEditingId(address.id);
    setForm(formFromAddress(address));
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses", {
        method: editingId ? "PATCH" : "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Could not save address.");
        return;
      }
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(address: AddressView) {
    if (!window.confirm(`Remove the "${address.label}" address?`)) {
      return;
    }
    setBusyId(address.id);
    try {
      await fetch(`/api/account/addresses/${address.id}`, {method: "DELETE"});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSetDefault(address: AddressView) {
    setBusyId(address.id);
    try {
      await fetch(`/api/account/addresses/${address.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action: "set_default"})
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-900">My addresses</h2>
        <button
          type="button"
          onClick={startAdd}
          className="glass-btn-primary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-sand-50"
        >
          <Plus className="h-4 w-4" />
          Add address
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3 rounded-2xl border border-[#e4d9c1] bg-white/70 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Label</span>
              <input
                value={form.label}
                onChange={(event) => setForm((current) => ({...current, label: event.target.value}))}
                placeholder="Home, Work, ..."
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Recipient name</span>
              <input
                value={form.recipientName}
                onChange={(event) => setForm((current) => ({...current, recipientName: event.target.value}))}
                required
                className={fieldClass}
              />
            </label>
            <label htmlFor="address-phone" className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Phone</span>
              <PhoneInput
                id="address-phone"
                value={form.phone}
                onChange={(value) => setForm((current) => ({...current, phone: value}))}
                required
                compact
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Street address</span>
              <input
                value={form.street}
                onChange={(event) => setForm((current) => ({...current, street: event.target.value}))}
                required
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">City</span>
              <input
                value={form.city}
                onChange={(event) => setForm((current) => ({...current, city: event.target.value}))}
                required
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Province / state (optional)</span>
              <input
                value={form.province}
                onChange={(event) => setForm((current) => ({...current, province: event.target.value}))}
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Postal code</span>
              <input
                value={form.postalCode}
                onChange={(event) => setForm((current) => ({...current, postalCode: event.target.value}))}
                required
                className={fieldClass}
              />
            </label>
            <label className="space-y-1.5 text-sm text-forest-700">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Country</span>
              <input
                value={form.country}
                onChange={(event) => setForm((current) => ({...current, country: event.target.value}))}
                required
                className={fieldClass}
              />
            </label>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="glass-btn-primary rounded-full px-5 py-2.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add address"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="glass-btn-secondary rounded-full px-5 py-2.5 text-sm font-medium text-forest-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {addresses === null ? (
          <p className="py-8 text-center text-sm text-forest-500">Loading...</p>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#e4d9c1] bg-white/50 py-12 text-center">
            <MapPin className="h-6 w-6 text-forest-400" />
            <p className="text-sm text-forest-600">No saved addresses yet.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border border-[#e4d9c1] bg-white/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {address.isDefault ? (
                    <span className="flex items-center gap-1 rounded-full bg-forest-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-sand-50 shadow-[0_4px_12px_rgba(23,32,21,0.22)]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                      Default
                    </span>
                  ) : null}
                  <p className="font-display text-lg text-forest-900">{address.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(address)}
                    aria-label={`Edit ${address.label}`}
                    className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === address.id}
                    onClick={() => handleDelete(address)}
                    aria-label={`Delete ${address.label}`}
                    className="glass-icon-btn is-danger flex h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-0.5 text-sm text-forest-700">
                <p>{address.recipientName}</p>
                <p>{address.street}</p>
                <p>
                  {address.city}
                  {address.province ? `, ${address.province}` : ""} {address.postalCode}
                </p>
                <p>{address.country}</p>
                <p className="text-forest-500">{address.phone}</p>
              </div>
              {!address.isDefault ? (
                <button
                  type="button"
                  disabled={busyId === address.id}
                  onClick={() => handleSetDefault(address)}
                  className="mt-3 text-sm font-medium text-forest-700 underline decoration-dotted underline-offset-2 hover:text-forest-900 disabled:opacity-50"
                >
                  Set as default
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
