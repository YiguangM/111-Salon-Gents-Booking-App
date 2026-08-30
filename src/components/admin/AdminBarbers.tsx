"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Barber = { id: string; name: string; slug: string; active: boolean };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/barbers")
      .then((res) => res.json())
      .then((data) => setBarbers(data.barbers ?? []));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!name.trim()) return;
    const res = await fetch("/api/admin/barbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slugify(name) }),
    });
    if (res.ok) {
      setName("");
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't create barber.");
    }
  }

  async function toggleActive(barber: Barber) {
    await fetch(`/api/admin/barbers/${barber.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !barber.active }),
    });
    load();
  }

  return (
    <div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {showForm ? "Close" : "+ Add Barber"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 flex gap-3 rounded-lg border border-stone-200 bg-white p-5">
          <input
            placeholder="Barber name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-stone-300 p-2"
          />
          <button onClick={handleCreate} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white">
            Add
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
        {barbers.map((barber) => (
          <li key={barber.id} className="flex items-center justify-between gap-4 p-4">
            <Link href={`/admin/barbers/${barber.id}`} className={`font-medium ${barber.active ? "text-stone-900" : "text-stone-400 line-through"} hover:underline`}>
              {barber.name}
            </Link>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/admin/barbers/${barber.id}`} className="text-brand hover:underline">
                Manage schedule
              </Link>
              <button onClick={() => toggleActive(barber)} className="text-stone-500 hover:text-stone-800">
                {barber.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </li>
        ))}
        {barbers.length === 0 && <li className="p-6 text-center text-stone-500">No barbers yet.</li>}
      </ul>
    </div>
  );
}
