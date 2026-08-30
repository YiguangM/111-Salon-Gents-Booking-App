import { AdminAppointments } from "@/components/admin/AdminAppointments";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Appointments" };

export default async function AdminAppointmentsPage() {
  const [barbers, services] = await Promise.all([
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Appointments</h1>
      <AdminAppointments
        barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
        services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes }))}
      />
    </div>
  );
}
