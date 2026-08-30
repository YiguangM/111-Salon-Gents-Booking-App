import { NextRequest, NextResponse } from "next/server";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/validation";
import { getAvailableSlotsForBarber } from "@/lib/availability";
import { generateManageToken } from "@/lib/tokens";
import { sendAppointmentConfirmation } from "@/lib/notifications";
import { getShopSettings } from "@/lib/shop";

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

  const [barber, service] = await Promise.all([
    prisma.barber.findUnique({ where: { id: barberId } }),
    prisma.service.findUnique({ where: { id: serviceId } }),
  ]);

  if (!barber || !barber.active) {
    return NextResponse.json({ error: "Barber not found" }, { status: 404 });
  }
  if (!service || !service.active) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const availableSlots = await getAvailableSlotsForBarber(barberId, startDate, service.durationMinutes);
  const matchingSlot = availableSlots.find((slot) => slot.startAt.getTime() === startDate.getTime());
  if (!matchingSlot) {
    return NextResponse.json(
      { error: "That time is no longer available. Please pick another slot." },
      { status: 409 }
    );
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

  const shop = await getShopSettings();
  const manageUrl = new URL(`/appointments/${appointment.manageToken}`, request.nextUrl.origin).toString();

  await sendAppointmentConfirmation({
    to: clientEmail,
    clientName,
    shopName: shop.shopName,
    barberName: barber.name,
    serviceName: service.name,
    startAt: appointment.startAt,
    manageUrl,
  }).catch((err) => console.error("Failed to send confirmation email:", err));

  return NextResponse.json({ manageToken: appointment.manageToken }, { status: 201 });
}
