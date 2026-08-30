"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, formatDuration } from "@/lib/format";
import { useLocale } from "@/components/LocaleProvider";
import { Arrow } from "@/components/DirectionalArrow";

type Service = { id: string; name: string; durationMinutes: number; priceCents: number };
type Barber = { id: string; name: string };
type Slot = { startAt: string; endAt: string; barberId: string };

const ANY_BARBER = "any";

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function maxISODate(): string {
  const max = new Date();
  max.setDate(max.getDate() + 30);
  return `${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, "0")}-${String(max.getDate()).padStart(2, "0")}`;
}

export function BookingWizard({
  services,
  barbers,
  initialBarberId,
  initialServiceId,
}: {
  services: Service[];
  barbers: Barber[];
  initialBarberId?: string;
  initialServiceId?: string;
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const dateLocale = locale === "ar" ? "ar" : "en-US";
  const [step, setStep] = useState(1);

  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [barberId, setBarberId] = useState(initialBarberId ?? "");
  const [date, setDate] = useState(todayISODate());

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);
  const selectedBarber = useMemo(() => barbers.find((b) => b.id === selectedSlot?.barberId), [barbers, selectedSlot]);

  useEffect(() => {
    if (step !== 3 || !serviceId || !barberId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);

    fetch(`/api/availability?serviceId=${serviceId}&barberId=${barberId}&date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setSlots([]);
        } else {
          setSlots(data.slots ?? []);
        }
      })
      .catch(() => setError(t.book.loadFailed))
      .finally(() => setLoadingSlots(false));
  }, [step, serviceId, barberId, date, t]);

  async function handleSubmit() {
    if (!selectedSlot || !selectedService) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: selectedSlot.barberId,
          serviceId: selectedService.id,
          startAt: selectedSlot.startAt,
          clientName,
          clientEmail,
          clientPhone,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t.book.genericError);
        if (res.status === 409) setStep(3);
        return;
      }
      setManageToken(data.manageToken);
      setStep(5);
    } catch {
      setError(t.book.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 5 && manageToken) {
    return (
      <div className="mt-10 border border-black/10 p-8 text-center">
        <h2 className="font-display text-2xl italic">{t.book.bookedHeading}</h2>
        <p className="mt-3 text-foreground/70">
          {selectedService?.name} {t.book.with} {selectedBarber?.name} {t.book.on}{" "}
          {selectedSlot &&
            new Date(selectedSlot.startAt).toLocaleString(dateLocale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          .
        </p>
        <p className="mt-2 text-sm text-foreground/50">
          {t.book.confirmationSentTo} {clientEmail}.
        </p>
        <button
          onClick={() => router.push(`/appointments/${manageToken}`)}
          className="mt-7 border border-foreground px-6 py-2.5 text-sm transition-colors hover:bg-foreground hover:text-background"
        >
          {t.book.viewManage}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-8">
      <Steps current={step} />

      {step === 1 && (
        <div>
          <h2 className="font-medium">{t.book.chooseService}</h2>
          <div className="mt-4 space-y-2">
            {services.map((service) => {
              const selected = serviceId === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => {
                    setServiceId(service.id);
                    setStep(2);
                  }}
                  className={`flex w-full items-center justify-between border p-4 text-left transition ${
                    selected ? "border-foreground bg-foreground text-background" : "border-black/10 hover:border-foreground/40"
                  }`}
                >
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className={`text-sm ${selected ? "text-background/70" : "text-foreground/50"}`}>
                      {formatDuration(service.durationMinutes, locale)}
                    </p>
                  </div>
                  <span className={selected ? "text-background" : "text-brand"}>
                    {formatPrice(service.priceCents, locale)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="font-medium">{t.book.chooseBarber}</h2>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => {
                setBarberId(ANY_BARBER);
                setStep(3);
              }}
              className={`w-full border p-4 text-left transition ${
                barberId === ANY_BARBER ? "border-foreground bg-foreground text-background" : "border-black/10 hover:border-foreground/40"
              }`}
            >
              {t.book.anyBarber}
            </button>
            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => {
                  setBarberId(barber.id);
                  setStep(3);
                }}
                className={`w-full border p-4 text-left transition ${
                  barberId === barber.id ? "border-foreground bg-foreground text-background" : "border-black/10 hover:border-foreground/40"
                }`}
              >
                {barber.name}
              </button>
            ))}
          </div>
          <BackButton onClick={() => setStep(1)} label={t.book.back} />
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="font-medium">{t.book.chooseDateTime}</h2>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            max={maxISODate()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-4 w-full border border-black/15 p-3"
          />

          <div className="mt-4">
            {loadingSlots && <p className="text-foreground/50">{t.book.loadingTimes}</p>}
            {!loadingSlots && slots.length === 0 && <p className="text-foreground/50">{t.book.noTimes}</p>}
            {!loadingSlots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const selected = selectedSlot?.startAt === slot.startAt && selectedSlot?.barberId === slot.barberId;
                  return (
                    <button
                      key={`${slot.barberId}-${slot.startAt}`}
                      onClick={() => setSelectedSlot(slot)}
                      className={`border p-2 text-sm transition ${
                        selected ? "border-foreground bg-foreground text-background" : "border-black/10 hover:border-foreground/40"
                      }`}
                    >
                      {new Date(slot.startAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit" })}
                      {barberId === ANY_BARBER && (
                        <span className="mt-0.5 block text-xs opacity-75">
                          {barbers.find((b) => b.id === slot.barberId)?.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <BackButton onClick={() => setStep(2)} label={t.book.back} />
            <button
              disabled={!selectedSlot}
              onClick={() => setStep(4)}
              className="border border-foreground px-6 py-2.5 text-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              {t.book.continueLabel}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="font-medium">{t.book.yourDetails}</h2>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              placeholder={t.book.fullName}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full border border-black/15 p-3"
            />
            <input
              type="email"
              placeholder={t.book.emailField}
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full border border-black/15 p-3"
              dir="ltr"
            />
            <input
              type="tel"
              placeholder={t.book.phoneField}
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full border border-black/15 p-3"
              dir="ltr"
            />
            <textarea
              placeholder={t.book.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-black/15 p-3"
              rows={3}
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            <BackButton onClick={() => setStep(3)} label={t.book.back} />
            <button
              disabled={!clientName || !clientEmail || !clientPhone || submitting}
              onClick={handleSubmit}
              className="border border-foreground px-6 py-2.5 text-sm transition-colors hover:bg-foreground hover:text-background disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              {submitting ? t.book.booking : t.book.confirmBooking}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground">
      <Arrow direction="back" /> {label}
    </button>
  );
}

function Steps({ current }: { current: number }) {
  const { t } = useLocale();
  const labels = [t.book.stepService, t.book.stepBarber, t.book.stepTime, t.book.stepDetails];
  return (
    <div className="flex items-center gap-2 text-xs text-foreground/40">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span className={i + 1 <= current ? "text-brand" : ""}>{label}</span>
          {i < labels.length - 1 && <Arrow direction="forward" />}
        </div>
      ))}
    </div>
  );
}
