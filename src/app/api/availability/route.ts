import { NextRequest, NextResponse } from "next/server";
import { parseISO, isValid, addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  getAvailableSlotsForBarber,
  getAvailableSlotsAnyBarber,
  MAX_BOOKING_DAYS_AHEAD,
} from "@/lib/availability";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId");
  const dateParam = searchParams.get("date");

  if (!serviceId || !barberId || !dateParam) {
    return NextResponse.json(
      { error: "serviceId, barberId, and date are required" },
      { status: 400 }
    );
  }

  const date = parseISO(dateParam);
  if (!isValid(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const maxDate = addDays(today, MAX_BOOKING_DAYS_AHEAD);
  if (date < today || date > maxDate) {
    return NextResponse.json({ slots: [] });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  let slots;
  if (barberId === "any") {
    slots = await getAvailableSlotsAnyBarber(date, service.durationMinutes);
  } else {
    const barber = await prisma.barber.findUnique({ where: { id: barberId } });
    if (!barber || !barber.active) {
      return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    }
    slots = await getAvailableSlotsForBarber(barberId, date, service.durationMinutes);
  }

  return NextResponse.json({
    slots: slots.map((slot) => ({
      startAt: slot.startAt.toISOString(),
      endAt: slot.endAt.toISOString(),
      barberId: slot.barberId,
    })),
  });
}
