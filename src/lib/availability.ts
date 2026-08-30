import { addMinutes, areIntervalsOverlapping, isBefore, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

// All appointment times are stored and computed in the server's local
// timezone. That's fine for a single physical shop; if this ever needs to
// serve clients across timezones, this is the place to introduce one.
export const SLOT_INTERVAL_MINUTES = 15;
export const MIN_BOOKING_NOTICE_MINUTES = 60;
export const MAX_BOOKING_DAYS_AHEAD = 30;

export type Slot = {
  startAt: Date;
  endAt: Date;
  barberId: string;
};

function minutesToDateOnDay(day: Date, minutes: number): Date {
  const base = startOfDay(day);
  return addMinutes(base, minutes);
}

/** Available slots for one specific barber on one calendar day. */
export async function getAvailableSlotsForBarber(
  barberId: string,
  day: Date,
  serviceDurationMinutes: number,
  options?: { ignoreMinNotice?: boolean }
): Promise<Slot[]> {
  const dayStart = startOfDay(day);
  const dayEnd = addMinutes(dayStart, 24 * 60);
  const dayOfWeek = dayStart.getDay();

  const [shifts, timeOffs, appointments] = await Promise.all([
    prisma.workingHour.findMany({
      where: { barberId, dayOfWeek },
    }),
    prisma.timeOff.findMany({
      where: {
        barberId,
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    }),
    prisma.appointment.findMany({
      where: {
        barberId,
        status: "CONFIRMED",
        startAt: { lt: dayEnd },
        endAt: { gt: dayStart },
      },
    }),
  ]);

  const blockedIntervals = [
    ...timeOffs.map((t) => ({ start: t.startAt, end: t.endAt })),
    ...appointments.map((a) => ({ start: a.startAt, end: a.endAt })),
  ];

  const earliestBookable = options?.ignoreMinNotice
    ? new Date()
    : addMinutes(new Date(), MIN_BOOKING_NOTICE_MINUTES);

  const slots: Slot[] = [];

  for (const shift of shifts) {
    const shiftStart = minutesToDateOnDay(dayStart, shift.startMinute);
    const shiftEnd = minutesToDateOnDay(dayStart, shift.endMinute);

    let candidate = shiftStart;
    while (true) {
      const candidateEnd = addMinutes(candidate, serviceDurationMinutes);
      if (isBefore(shiftEnd, candidateEnd)) break;

      const isPastNotice = isBefore(candidate, earliestBookable);
      const overlapsBlocked = blockedIntervals.some((interval) =>
        areIntervalsOverlapping(
          { start: candidate, end: candidateEnd },
          interval,
          { inclusive: false }
        )
      );

      if (!isPastNotice && !overlapsBlocked) {
        slots.push({ startAt: candidate, endAt: candidateEnd, barberId });
      }

      candidate = addMinutes(candidate, SLOT_INTERVAL_MINUTES);
    }
  }

  return slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Available slots across all active barbers, used for the "any available
 * barber" option. Each slot is tagged with the specific barber it belongs to.
 */
export async function getAvailableSlotsAnyBarber(
  day: Date,
  serviceDurationMinutes: number
): Promise<Slot[]> {
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    select: { id: true },
  });

  const perBarber = await Promise.all(
    barbers.map((b) => getAvailableSlotsForBarber(b.id, day, serviceDurationMinutes))
  );

  return perBarber.flat().sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
