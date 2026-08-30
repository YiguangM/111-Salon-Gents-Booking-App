import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice, formatDuration } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Services & Pricing" };

export default async function ServicesPage() {
  const [services, { t, locale }] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    getDictionary(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl italic">{t.services.title}</h1>
      <p className="mt-3 text-foreground/70">{t.services.subtitle}</p>

      <ul className="mt-10 divide-y divide-black/10 border-y border-black/10">
        {services.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-4 py-5">
            <div>
              <h2 className="font-medium">{service.name}</h2>
              {service.description && (
                <p className="mt-1 text-sm text-foreground/50">{service.description}</p>
              )}
              <p className="mt-1 text-sm text-foreground/40">{formatDuration(service.durationMinutes, locale)}</p>
            </div>
            <span className="shrink-0 text-lg text-brand">{formatPrice(service.priceCents, locale)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-10 text-center">
        <Link
          href="/book"
          className="inline-block border border-foreground px-7 py-3 text-sm transition-colors hover:bg-foreground hover:text-background"
        >
          {t.nav.bookNow}
        </Link>
      </div>
    </div>
  );
}
