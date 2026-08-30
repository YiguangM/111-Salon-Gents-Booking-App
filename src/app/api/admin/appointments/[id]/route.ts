import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getAvailableSlotsForBarber } from "@/lib/availability";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]).optional(),
  barberId: z.string().optional(),
  startAt: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.status && !parsed.data.startAt) {
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ status: updated.status });
  }

  if (parsed.data.startAt) {
    const barberId = parsed.data.barberId ?? appointment.barberId;
    const startDate = parseISO(parsed.data.startAt);
    if (!isValid(startDate)) {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: appointment.serviceId } });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const availableSlots = await getAvailableSlotsForBarber(barberId, startDate, service.durationMinutes, {
      ignoreMinNotice: true,
    });
    const matchingSlot = availableSlots.find((slot) => slot.startAt.getTime() === startDate.getTime());
    if (!matchingSlot) {
      return NextResponse.json({ error: "That time overlaps an existing appointment." }, { status: 409 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { barberId, startAt: matchingSlot.startAt, endAt: matchingSlot.endAt },
    });
    return NextResponse.json({ startAt: updated.startAt.toISOString(), endAt: updated.endAt.toISOString() });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.appointment.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
