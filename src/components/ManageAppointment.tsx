"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";
import { useLocale } from "@/components/LocaleProvider";
import { Arrow } from "@/components/DirectionalArrow";

type Appointment = {
  id: string;
  status: string;
  startAt: string;
  endAt: string;
  clientName: string;
  barber: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
};

type Slot = { startAt: string; endAt: string; barberId: string };

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ManageAppointment({ token }: { token: string }) {
  const { t, locale } = useLocale();
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/appointments/${token}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => data && setAppointment(data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token]);

  useEffect(() => {
    if (!rescheduling || !appointment) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/availability?serviceId=${appointment.service.id}&barberId=${appointment.barber.id}&date=${date}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [rescheduling, date, appointment]);

  async function handleCancel() {
    if (!confirm(t.manage.confirmCancelPrompt)) return;
    setActionInProgress(true);
    const res = await fetch(`/api/appointments/${token}`, { method: "DELETE" });
    setActionInProgress(false);
    if (res.ok) load();
    else setError(t.manage.cancelFailed);
  }

  async function handleReschedule() {
    if (!selectedSlot || !appointment) return;
    setActionInProgress(true);
    setError(null);
    const res = await fetch(`/api/appointments/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId: selectedSlot.barberId, startAt: selectedSlot.startAt }),
    });
    const data = await res.json();
    setActionInProgress(false);
    if (res.ok) {
      setRescheduling(false);
      load();
    } else {
      setError(typeof data.error === "string" ? data.error : t.manage.rescheduleFailed);
    }
  }

  if (loading) return <p className="text-foreground/50">{t.manage.loading}</p>;
  if (notFound || !appointment) {
    return <p className="text-foreground/70">{t.manage.notFound}</p>;
  }

  const startDate = new Date(appointment.startAt);
  const isCancelled = appointment.status === "CANCELLED";

  return (
    <div className="border border-black/10 p-8">
      <h1 className="font-display text-2xl italic">{t.manage.title}</h1>

      <dl className="mt-7 space-y-2">
        <div className="flex justify-between">
          <dt className="text-foreground/50">{t.manage.status}</dt>
          <dd className={isCancelled ? "font-medium text-red-600" : "font-medium text-green-700"}>
            {isCancelled ? t.manage.cancelled : t.manage.confirmed}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground/50">{t.manage.service}</dt>
          <dd>{appointment.service.name} ({formatDuration(appointment.service.durationMinutes, locale)})</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground/50">{t.manage.barber}</dt>
          <dd>{appointment.barber.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-foreground/50">{t.manage.when}</dt>
          <dd>
            {startDate.toLocaleString(dateLocale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </dd>
        </div>
      </dl>

      {!isCancelled && !rescheduling && (
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => setRescheduling(true)}
            className="border border-foreground px-5 py-2 text-sm transition-colors hover:bg-foreground hover:text-background"
          >
            {t.manage.reschedule}
          </button>
          <button
            onClick={handleCancel}
            disabled={actionInProgress}
            className="border border-red-300 px-5 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            {t.manage.cancelAppointment}
          </button>
        </div>
      )}

      {rescheduling && (
        <div className="mt-8 border-t border-black/10 pt-6">
          <h2 className="font-medium">{t.manage.pickNewTime}</h2>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-3 w-full border border-black/15 p-3"
          />

          {loadingSlots && <p className="mt-3 text-foreground/50">{t.manage.loadingTimes}</p>}
          {!loadingSlots && slots.length === 0 && <p className="mt-3 text-foreground/50">{t.manage.noTimes}</p>}
          {!loadingSlots && slots.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const selected = selectedSlot?.startAt === slot.startAt;
                return (
                  <button
                    key={slot.startAt}
                    onClick={() => setSelectedSlot(slot)}
                    className={`border p-2 text-sm transition ${
                      selected ? "border-foreground bg-foreground text-background" : "border-black/10 hover:border-foreground/40"
                    }`}
                  >
                    {new Date(slot.startAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setRescheduling(false)}
              className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
            >
              <Arrow direction="back" /> {t.manage.backToView}
            </button>
            <button
              disabled={!selectedSlot || actionInProgress}
              onClick={handleReschedule}
              className="border border-foreground px-6 py-2.5 text-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              {actionInProgress ? t.manage.saving : t.manage.confirmNewTime}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
