"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";

export function SiteHeader({ shopName }: { shopName: string }) {
  const { t, locale, switchLocale } = useLocale();
  const pathname = usePathname();

  const navLinks = [
    { href: "/services", label: t.nav.services },
    { href: "/barbers", label: t.nav.barbers },
    { href: "/contact", label: t.nav.contact },
  ];

  return (
    <header className="border-b border-black/10 bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-xl italic tracking-tight">
          {shopName}
        </Link>
        <nav className="hidden items-center gap-8 text-sm sm:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b pb-0.5 transition-colors ${
                  active ? "border-foreground" : "border-transparent hover:border-foreground/40"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-sm text-foreground/50">
            <button
              onClick={() => switchLocale("en")}
              className={locale === "en" ? "text-foreground" : "hover:text-foreground"}
              aria-current={locale === "en"}
            >
              EN
            </button>
            <span>/</span>
            <button
              onClick={() => switchLocale("ar")}
              className={locale === "ar" ? "text-foreground" : "hover:text-foreground"}
              aria-current={locale === "ar"}
            >
              عربي
            </button>
          </div>
          <Link
            href="/book"
            className="border border-foreground px-5 py-2 text-sm transition-colors hover:bg-foreground hover:text-background"
          >
            {t.nav.bookNow}
          </Link>
        </div>
      </div>
    </header>
  );
}
