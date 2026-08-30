"use client";

import { useEffect, useState } from "react";
import { formatPrice, formatDuration } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
};

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetch("/api/admin/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services ?? []));
  }

  useEffect(load, []);

  async function toggleActive(service: Service) {
    await fetch(`/api/admin/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !service.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {showForm ? "Close" : "+ Add Service"}
        </button>
      </div>

      {showForm && (
        <ServiceForm
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {services.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className={`font-medium ${service.active ? "text-stone-900" : "text-stone-400 line-through"}`}>
                {service.name}
              </p>
              <p className="text-sm text-stone-500">
                {formatDuration(service.durationMinutes)} &middot; {formatPrice(service.priceCents)}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => toggleActive(service)} className="text-stone-500 hover:text-stone-800">
                {service.active ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => handleDelete(service.id)} className="text-stone-400 hover:text-red-600">
                Delete
              </button>
            </div>
          </li>
        ))}
        {services.length === 0 && <li className="p-6 text-center text-stone-500">No services yet.</li>}
      </ul>
    </div>
  );
}

function ServiceForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [price, setPrice] = useState("30.00");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const priceCents = Math.round(parseFloat(price) * 100);
    if (!name || Number.isNaN(priceCents)) {
      setError("Name and a valid price are required.");
      return;
    }
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, durationMinutes, priceCents }),
    });
    if (res.ok) onSaved();
    else setError("Couldn't save service.");
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border border-stone-300 p-2" />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-stone-300 p-2"
        />
        <label className="flex items-center gap-2 text-sm text-stone-600">
          Duration (min)
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-24 rounded-lg border border-stone-300 p-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          Price ($)
          <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 rounded-lg border border-stone-300 p-2" />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        className="mt-4 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Save Service
      </button>
    </div>
  );
}
