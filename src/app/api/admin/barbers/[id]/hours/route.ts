import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { workingHoursInputSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = workingHoursInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({ where: { id } });
  if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });

  for (const shift of parsed.data.shifts) {
    if (shift.endMinute <= shift.startMinute) {
      return NextResponse.json({ error: "Each shift's end time must be after its start time." }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.workingHour.deleteMany({ where: { barberId: id } }),
    prisma.workingHour.createMany({
      data: parsed.data.shifts.map((s) => ({ barberId: id, ...s })),
    }),
  ]);

  const workingHours = await prisma.workingHour.findMany({ where: { barberId: id } });
  return NextResponse.json({ workingHours });
}
