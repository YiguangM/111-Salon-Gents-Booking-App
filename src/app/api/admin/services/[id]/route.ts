import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceInputSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = serviceInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = await prisma.service
    .update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}),
        ...(parsed.data.durationMinutes !== undefined ? { durationMinutes: parsed.data.durationMinutes } : {}),
        ...(parsed.data.priceCents !== undefined ? { priceCents: parsed.data.priceCents } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    })
    .catch(() => null);

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  return NextResponse.json({ service });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    // Likely referenced by existing appointments; deactivate instead.
    await prisma.service.update({ where: { id }, data: { active: false } }).catch(() => null);
    return NextResponse.json({
      ok: true,
      note: "Service has past appointments and was deactivated instead of deleted.",
    });
  }
}
