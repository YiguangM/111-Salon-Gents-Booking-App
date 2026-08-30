import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/lib/i18n/server";
import { Arrow } from "@/components/DirectionalArrow";

export const metadata = { title: "Meet the Barbers" };

export default async function BarbersPage() {
  const [barbers, { t }] = await Promise.all([
    prisma.barber.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    getDictionary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl italic">{t.barbers.title}</h1>

      <div className="mt-10 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
        {barbers.map((barber) => (
          <div key={barber.id} className="bg-background p-6">
            <h2 className="text-lg font-medium">{barber.name}</h2>
            {barber.specialties && <p className="mt-1 text-sm text-brand">{barber.specialties}</p>}
            {barber.bio && <p className="mt-3 text-sm text-foreground/60">{barber.bio}</p>}
            <Link
              href={`/book?barberId=${barber.id}`}
              className="mt-4 inline-flex items-center gap-1 text-sm hover:underline"
            >
              {t.barbers.bookWith} {barber.name.split(" ")[0]} <Arrow direction="forward" />
            </Link>
          </div>
        ))}
      </div>

      {barbers.length === 0 && <p className="mt-8 text-foreground/50">{t.barbers.none}</p>}
    </div>
  );
}
