import { getShopSettings } from "@/lib/shop";
import { getDictionary } from "@/lib/i18n/server";

export const metadata = { title: "Location & Hours" };

export default async function ContactPage() {
  const [shop, { t }] = await Promise.all([getShopSettings(), getDictionary()]);
  const mapQuery = encodeURIComponent(shop.address);

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-4xl italic">{t.contact.title}</h1>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="font-medium">{t.contact.address}</h2>
          <p className="mt-1 text-foreground/70">{shop.address}</p>

          {shop.phone && (
            <>
              <h2 className="mt-6 font-medium">{t.contact.phone}</h2>
              <p className="mt-1 text-foreground/70" dir="ltr">{shop.phone}</p>
            </>
          )}

          {shop.email && (
            <>
              <h2 className="mt-6 font-medium">{t.contact.email}</h2>
              <p className="mt-1 text-foreground/70" dir="ltr">{shop.email}</p>
            </>
          )}

          {shop.hoursText && (
            <>
              <h2 className="mt-6 font-medium">{t.contact.hours}</h2>
              <p className="mt-1 whitespace-pre-line text-foreground/70">{shop.hoursText}</p>
            </>
          )}
        </div>

        <div className="overflow-hidden border border-black/10">
          <iframe
            title="Shop location"
            className="h-64 w-full sm:h-full"
            loading="lazy"
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
          />
        </div>
      </div>
    </div>
  );
}
