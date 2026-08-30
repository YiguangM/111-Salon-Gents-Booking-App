import { NextRequest, NextResponse } from "next/server";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { rescheduleAppointmentSchema } from "@/lib/validation";
import { getAvailableSlotsForBarber } from "@/lib/availability";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { manageToken: token },
    include: { barber: true, service: true },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: appointment.id,
    status: appointment.status,
    startAt: appointment.startAt.toISOString(),
    endAt: appointment.endAt.toISOString(),
    clientName: appointment.clientName,
    barber: { id: appointment.barber.id, name: appointment.barber.name },
    service: { id: appointment.service.id, name: appointment.service.name, durationMinutes: appointment.service.durationMinutes },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { manageToken: token } });
  if (!appointment || appointment.status === "CANCELLED") {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rescheduleAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startDate = parseISO(parsed.data.startAt);
  if (!isValid(startDate)) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const availableSlots = await getAvailableSlotsForBarber(
    parsed.data.barberId,
    startDate,
    service.durationMinutes
  );
  const matchingSlot = availableSlots.find((slot) => slot.startAt.getTime() === startDate.getTime());
  if (!matchingSlot) {
    return NextResponse.json(
      { error: "That time is no longer available. Please pick another slot." },
      { status: 409 }
    );
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      barberId: parsed.data.barberId,
      startAt: matchingSlot.startAt,
      endAt: matchingSlot.endAt,
    },
  });

  return NextResponse.json({ startAt: updated.startAt.toISOString(), endAt: updated.endAt.toISOString() });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { manageToken: token } });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
