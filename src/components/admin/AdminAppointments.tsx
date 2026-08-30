"use client";

import { useEffect, useState } from "react";
import { formatDateTimeLabel } from "@/lib/format";

type Barber = { id: string; name: string };
type Service = { id: string; name: string; durationMinutes: number };
type Appointment = {
  id: string;
  status: string;
  startAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string | null;
  barber: { id: string; name: string };
  service: { id: string; name: string };
};
type Slot = { startAt: string; barberId: string };

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function AdminAppointments({ barbers, services }: { barbers: Barber[]; services: Service[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    const query = showAll ? "" : `?from=${new Date().toISOString()}`;
    fetch(`/api/admin/appointments${query}`)
      .then((res) => res.json())
      .then((data) => setAppointments(data.appointments ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [showAll]);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this appointment record?")) return;
    await fetch(`/api/admin/appointments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show past appointments
        </label>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          {showForm ? "Close" : "+ Add Appointment"}
        </button>
      </div>

      {showForm && (
        <NewAppointmentForm
          barbers={barbers}
          services={services}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 text-stone-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Client</th>
              <th className="p-3">Service</th>
              <th className="p-3">Barber</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="p-3">{formatDateTimeLabel(new Date(a.startAt))}</td>
                <td className="p-3">
                  <div>{a.clientName}</div>
                  <div className="text-xs text-stone-400">{a.clientEmail} &middot; {a.clientPhone}</div>
                </td>
                <td className="p-3">{a.service.name}</td>
                <td className="p-3">{a.barber.name}</td>
                <td className="p-3">
                  <span className={a.status === "CANCELLED" ? "text-red-600" : "text-green-700"}>{a.status}</span>
                </td>
                <td className="p-3 text-right">
                  {a.status !== "CANCELLED" && (
                    <button onClick={() => handleCancel(a.id)} className="mr-3 text-stone-500 hover:text-red-600">
                      Cancel
                    </button>
                  )}
                  <button onClick={() => handleDelete(a.id)} className="text-stone-400 hover:text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && appointments.length === 0 && (
          <p className="p-6 text-center text-stone-500">No appointments found.</p>
        )}
      </div>
    </div>
  );
}

function NewAppointmentForm({
  barbers,
  services,
  onCreated,
}: {
  barbers: Barber[];
  services: Service[];
  onCreated: () => void;
}) {
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!barberId || !serviceId) return;
    setSelectedSlot(null);
    fetch(`/api/availability?serviceId=${serviceId}&barberId=${barberId}&date=${date}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []));
  }, [barberId, serviceId, date]);

  async function handleSubmit() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberId,
        serviceId,
        startAt: selectedSlot.startAt,
        clientName,
        clientEmail,
        clientPhone,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't create appointment.");
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="rounded-lg border border-stone-300 p-2">
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="rounded-lg border border-stone-300 p-2">
          {barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-stone-300 p-2" />
        <input
          type="text"
          placeholder="Client name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="rounded-lg border border-stone-300 p-2"
        />
        <input
          type="email"
          placeholder="Client email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="rounded-lg border border-stone-300 p-2"
        />
        <input
          type="tel"
          placeholder="Client phone"
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          className="rounded-lg border border-stone-300 p-2"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.startAt}
            onClick={() => setSelectedSlot(slot)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              selectedSlot?.startAt === slot.startAt ? "border-brand bg-brand text-white" : "border-stone-200"
            }`}
          >
            {new Date(slot.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </button>
        ))}
        {slots.length === 0 && <p className="text-sm text-stone-500">No open slots that day.</p>}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!selectedSlot || !clientName || !clientEmail || !clientPhone || submitting}
        className="mt-4 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        {submitting ? "Saving..." : "Create Appointment"}
      </button>
    </div>
  );
}
