import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; timeOffId: string }> }
) {
  const { timeOffId } = await params;
  await prisma.timeOff.delete({ where: { id: timeOffId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
