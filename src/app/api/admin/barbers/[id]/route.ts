import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { barberInputSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const barber = await prisma.barber.findUnique({
    where: { id },
    include: { workingHours: true, timeOffs: { orderBy: { startAt: "asc" } } },
  });
  if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });
  return NextResponse.json({ barber });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = barberInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const barber = await prisma.barber
    .update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio || null } : {}),
        ...(parsed.data.photoUrl !== undefined ? { photoUrl: parsed.data.photoUrl || null } : {}),
        ...(parsed.data.specialties !== undefined ? { specialties: parsed.data.specialties || null } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    })
    .catch(() => null);

  if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });
  return NextResponse.json({ barber });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.barber.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    await prisma.barber.update({ where: { id }, data: { active: false } }).catch(() => null);
    return NextResponse.json({
      ok: true,
      note: "Barber has past appointments and was deactivated instead of deleted.",
    });
  }
}
