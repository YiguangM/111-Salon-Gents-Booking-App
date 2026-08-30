import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { barberInputSchema } from "@/lib/validation";

export async function GET() {
  const barbers = await prisma.barber.findMany({
    orderBy: { name: "asc" },
    include: { workingHours: true },
  });
  return NextResponse.json({ barbers });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = barberInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.barber.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
  }

  const barber = await prisma.barber.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      bio: parsed.data.bio || null,
      photoUrl: parsed.data.photoUrl || null,
      specialties: parsed.data.specialties || null,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ barber }, { status: 201 });
}
