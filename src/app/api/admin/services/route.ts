import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceInputSchema } from "@/lib/validation";

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = serviceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
