"use client";

import { useEffect, useState } from "react";
import { DAY_NAMES, formatDateTimeLabel } from "@/lib/format";

type WorkingHour = { id?: string; dayOfWeek: number; startMinute: number; endMinute: number };
type TimeOff = { id: string; startAt: string; endAt: string; reason: string | null };
type Barber = {
  id: string;
  name: string;
  bio: string | null;
  specialties: string | null;
  active: boolean;
  workingHours: WorkingHour[];
  timeOffs: TimeOff[];
};

function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function BarberEditor({ barberId }: { barberId: string }) {
  const [barber, setBarber] = useState<Barber | null>(null);
  const [shifts, setShifts] = useState<WorkingHour[]>([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const [timeOffStart, setTimeOffStart] = useState("");
  const [timeOffEnd, setTimeOffEnd] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");

  function load() {
    fetch(`/api/admin/barbers/${barberId}`)
      .then((res) => res.json())
      .then((data) => {
        setBarber(data.barber);
        setShifts(data.barber.workingHours);
        setName(data.barber.name);
        setBio(data.barber.bio ?? "");
        setSpecialties(data.barber.specialties ?? "");
      });
  }

  useEffect(load, [barberId]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    await fetch(`/api/admin/barbers/${barberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, specialties }),
    });
    setSavingProfile(false);
    load();
  }

  function addShift(dayOfWeek: number) {
    setShifts((prev) => [...prev, { dayOfWeek, startMinute: 9 * 60, endMinute: 17 * 60 }]);
    setHoursSaved(false);
  }

  function updateShift(index: number, field: "startMinute" | "endMinute", value: string) {
    setShifts((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: timeInputToMinutes(value) } : s)));
    setHoursSaved(false);
  }

  function removeShift(index: number) {
    setShifts((prev) => prev.filter((_, i) => i !== index));
    setHoursSaved(false);
  }

  async function handleSaveHours() {
    setSavingHours(true);
    const res = await fetch(`/api/admin/barbers/${barberId}/hours`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shifts: shifts.map(({ dayOfWeek, startMinute, endMinute }) => ({ dayOfWeek, startMinute, endMinute })) }),
    });
    setSavingHours(false);
    if (res.ok) setHoursSaved(true);
  }

  async function handleAddTimeOff() {
    if (!timeOffStart || !timeOffEnd) return;
    await fetch(`/api/admin/barbers/${barberId}/time-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(timeOffStart).toISOString(),
        endAt: new Date(timeOffEnd).toISOString(),
        reason: timeOffReason || undefined,
      }),
    });
    setTimeOffStart("");
    setTimeOffEnd("");
    setTimeOffReason("");
    load();
  }

  async function handleRemoveTimeOff(id: string) {
    await fetch(`/api/admin/barbers/${barberId}/time-off/${id}`, { method: "DELETE" });
    load();
  }

  if (!barber) return <p className="mt-4 text-stone-500">Loading...</p>;

  return (
    <div className="mt-6 space-y-8">
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Profile</h2>
        <div className="mt-3 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-stone-300 p-2" />
          <input
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            placeholder="Specialties (comma-separated)"
            className="w-full rounded-lg border border-stone-300 p-2"
          />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="w-full rounded-lg border border-stone-300 p-2" />
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {savingProfile ? "Saving..." : "Save Profile"}
        </button>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Weekly Working Hours</h2>
        <p className="mt-1 text-sm text-stone-500">Add multiple shifts per day (e.g. morning + afternoon) to carve out a lunch break.</p>

        <div className="mt-4 space-y-4">
          {DAY_NAMES.map((dayName, dayOfWeek) => (
            <div key={dayOfWeek}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-700">{dayName}</p>
                <button onClick={() => addShift(dayOfWeek)} className="text-sm text-brand hover:underline">
                  + Add shift
                </button>
              </div>
              <div className="mt-1 space-y-2">
                {shifts
                  .map((shift, index) => ({ shift, index }))
                  .filter(({ shift }) => shift.dayOfWeek === dayOfWeek)
                  .map(({ shift, index }) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={minutesToTimeInput(shift.startMinute)}
                        onChange={(e) => updateShift(index, "startMinute", e.target.value)}
                        className="rounded-lg border border-stone-300 p-1.5 text-sm"
                      />
                      <span className="text-stone-400">to</span>
                      <input
                        type="time"
                        value={minutesToTimeInput(shift.endMinute)}
                        onChange={(e) => updateShift(index, "endMinute", e.target.value)}
                        className="rounded-lg border border-stone-300 p-1.5 text-sm"
                      />
                      <button onClick={() => removeShift(index)} className="text-sm text-stone-400 hover:text-red-600">
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSaveHours}
          disabled={savingHours}
          className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {savingHours ? "Saving..." : "Save Hours"}
        </button>
        {hoursSaved && <span className="ml-3 text-sm text-green-700">Saved.</span>}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold text-stone-900">Time Off / Blocked Time</h2>
        <p className="mt-1 text-sm text-stone-500">Block vacation, personal appointments, or one-off schedule changes.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          <input type="datetime-local" value={timeOffStart} onChange={(e) => setTimeOffStart(e.target.value)} className="rounded-lg border border-stone-300 p-2 text-sm" />
          <input type="datetime-local" value={timeOffEnd} onChange={(e) => setTimeOffEnd(e.target.value)} className="rounded-lg border border-stone-300 p-2 text-sm" />
          <input placeholder="Reason (optional)" value={timeOffReason} onChange={(e) => setTimeOffReason(e.target.value)} className="rounded-lg border border-stone-300 p-2 text-sm" />
          <button onClick={handleAddTimeOff} className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Add Block
          </button>
        </div>

        <ul className="mt-4 divide-y divide-stone-100">
          {barber.timeOffs.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {formatDateTimeLabel(new Date(t.startAt))} &rarr; {formatDateTimeLabel(new Date(t.endAt))}
                {t.reason ? ` (${t.reason})` : ""}
              </span>
              <button onClick={() => handleRemoveTimeOff(t.id)} className="text-stone-400 hover:text-red-600">
                Remove
              </button>
            </li>
          ))}
          {barber.timeOffs.length === 0 && <li className="py-2 text-sm text-stone-400">No blocked time.</li>}
        </ul>
      </section>
    </div>
  );
}
