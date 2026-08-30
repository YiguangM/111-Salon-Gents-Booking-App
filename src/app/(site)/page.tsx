import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getShopSettings } from "@/lib/shop";
import { formatPrice, formatDuration } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { Arrow } from "@/components/DirectionalArrow";

export default async function HomePage() {
  const [shop, { t, locale }] = await Promise.all([getShopSettings(), getDictionary()]);
  const [services, barbers] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, take: 4, orderBy: { priceCents: "asc" } }),
    prisma.barber.findMany({ where: { active: true }, take: 3 }),
  ]);

  return (
    <div>
      <section className="border-b border-black/10">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center sm:py-36">
          <h1 className="font-display text-5xl italic tracking-tight sm:text-6xl">{shop.shopName}</h1>
          <p className="mx-auto mt-5 max-w-lg text-lg text-foreground/70">
            {shop.aboutText ?? t.home.aboutFallback}
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/book"
              className="border border-foreground px-7 py-3 text-sm transition-colors hover:bg-foreground hover:text-background"
            >
              {t.nav.bookNow}
            </Link>
            <Link href="/services" className="border-b border-foreground/30 pb-0.5 text-sm hover:border-foreground">
              {t.home.viewServices}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-2xl italic">{t.home.popularServices}</h2>
        <div className="mt-8 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div key={service.id} className="bg-background p-6">
              <h3 className="font-medium">{service.name}</h3>
              <p className="mt-1 text-sm text-foreground/50">{formatDuration(service.durationMinutes, locale)}</p>
              <p className="mt-4 text-lg text-brand">{formatPrice(service.priceCents, locale)}</p>
            </div>
          ))}
        </div>
        <Link href="/services" className="mt-8 inline-flex items-center gap-1 text-sm hover:underline">
          {t.home.seeAllServices} <Arrow direction="forward" />
        </Link>
      </section>

      {barbers.length > 0 && (
        <section className="border-t border-black/10">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="font-display text-2xl italic">{t.home.meetBarbers}</h2>
            <div className="mt-8 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
              {barbers.map((barber) => (
                <div key={barber.id} className="bg-background p-6">
                  <h3 className="font-medium">{barber.name}</h3>
                  {barber.specialties && <p className="mt-1 text-sm text-brand">{barber.specialties}</p>}
                  {barber.bio && <p className="mt-3 text-sm text-foreground/60">{barber.bio}</p>}
                </div>
              ))}
            </div>
            <Link href="/barbers" className="mt-8 inline-flex items-center gap-1 text-sm hover:underline">
              {t.home.meetWholeTeam} <Arrow direction="forward" />
            </Link>
          </div>
        </section>
      )}

      <section className="border-t border-black/10 px-6 py-24 text-center">
        <h2 className="font-display text-3xl italic">{t.home.ctaHeading}</h2>
        <p className="mt-2 text-foreground/70">{t.home.ctaSub}</p>
        <Link
          href="/book"
          className="mt-8 inline-block border border-foreground px-7 py-3 text-sm transition-colors hover:bg-foreground hover:text-background"
        >
          {t.nav.bookNow}
        </Link>
      </section>
    </div>
  );
}
