import { prisma } from "@/lib/prisma";
import { BookingWizard } from "@/components/BookingWizard";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Book an Appointment" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ barberId?: string; serviceId?: string }>;
}) {
  const params = await searchParams;
  const [services, barbers, { t }] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getDictionary(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-display text-4xl italic">{t.book.title}</h1>
      <p className="mt-3 text-foreground/70">{t.book.subtitle}</p>

      <BookingWizard
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMinutes: s.durationMinutes,
          priceCents: s.priceCents,
        }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
        initialBarberId={params.barberId}
        initialServiceId={params.serviceId}
      />
    </div>
  );
}
