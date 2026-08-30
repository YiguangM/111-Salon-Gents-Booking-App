import { NextRequest, NextResponse } from "next/server";
import { parseISO, isValid } from "date-fns";
import { prisma } from "@/lib/prisma";
import { timeOffInputSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = timeOffInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startAt = parseISO(parsed.data.startAt);
  const endAt = parseISO(parsed.data.endAt);
  if (!isValid(startAt) || !isValid(endAt) || endAt <= startAt) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({ where: { id } });
  if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });

  const timeOff = await prisma.timeOff.create({
    data: { barberId: id, startAt, endAt, reason: parsed.data.reason || null },
  });

  return NextResponse.json({ timeOff }, { status: 201 });
}
