import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getShopSettings } from "@/lib/shop";
import { getLocale } from "@/lib/i18n/server";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [shop, locale] = await Promise.all([getShopSettings(), getLocale()]);

  return (
    <LocaleProvider locale={locale}>
      <SiteHeader shopName={shop.shopName} />
      <main className="flex-1">{children}</main>
      <SiteFooter shopName={shop.shopName} address={shop.address} phone={shop.phone} />
      <WhatsAppButton />
    </LocaleProvider>
  );
}
