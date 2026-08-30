import { NextRequest, NextResponse } from "next/server";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/validation";
import { getAvailableSlotsForBarber } from "@/lib/availability";
import { generateManageToken } from "@/lib/tokens";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const barberId = searchParams.get("barberId");

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(barberId ? { barberId } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: parseISO(from) } : {}),
              ...(to ? { lt: parseISO(to) } : {}),
            },
          }
        : {}),
    },
    include: { barber: true, service: true },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    appointments: appointments.map((a) => ({
      id: a.id,
      status: a.status,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      clientName: a.clientName,
      clientEmail: a.clientEmail,
      clientPhone: a.clientPhone,
      notes: a.notes,
      barber: { id: a.barber.id, name: a.barber.name },
      service: { id: a.service.id, name: a.service.name },
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { barberId, serviceId, startAt, clientName, clientEmail, clientPhone, notes } = parsed.data;
  const startDate = parseISO(startAt);
  if (!isValid(startDate)) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const availableSlots = await getAvailableSlotsForBarber(barberId, startDate, service.durationMinutes, {
    ignoreMinNotice: true,
  });
  const matchingSlot = availableSlots.find((slot) => slot.startAt.getTime() === startDate.getTime());
  if (!matchingSlot) {
    return NextResponse.json({ error: "That time overlaps an existing appointment." }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      barberId,
      serviceId,
      startAt: matchingSlot.startAt,
      endAt: matchingSlot.endAt,
      clientName,
      clientEmail,
      clientPhone,
      notes,
      manageToken: generateManageToken(),
    },
  });

  return NextResponse.json({ id: appointment.id }, { status: 201 });
}
