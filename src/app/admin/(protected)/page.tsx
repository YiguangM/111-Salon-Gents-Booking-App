import { startOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatDateTimeLabel } from "@/lib/format";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  const [todaysAppointments, upcomingCount, barberCount, serviceCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        startAt: { gte: todayStart, lt: tomorrowStart },
      },
      include: { barber: true, service: true },
      orderBy: { startAt: "asc" },
    }),
    prisma.appointment.count({
      where: { status: "CONFIRMED", startAt: { gte: tomorrowStart } },
    }),
    prisma.barber.count({ where: { active: true } }),
    prisma.service.count({ where: { active: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Today's appointments" value={todaysAppointments.length} />
        <StatCard label="Upcoming appointments" value={upcomingCount} />
        <StatCard label="Active barbers / services" value={`${barberCount} / ${serviceCount}`} />
      </div>

      <h2 className="mt-10 font-semibold text-stone-900">Today&apos;s Schedule</h2>
      {todaysAppointments.length === 0 ? (
        <p className="mt-3 text-stone-500">No appointments booked for today.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
          {todaysAppointments.map((a) => (
            <li key={a.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-stone-900">
                  {a.clientName} &mdash; {a.service.name}
                </p>
                <p className="text-sm text-stone-500">
                  {formatDateTimeLabel(a.startAt)} with {a.barber.name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
    </div>
  );
}
