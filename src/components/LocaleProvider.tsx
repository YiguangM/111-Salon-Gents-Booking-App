"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Locale, type Dictionary } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/lib/i18n/server.constants";

type LocaleContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dictionary;
  switchLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState(locale);
  const dir = current === "ar" ? "rtl" : "ltr";

  function switchLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    setCurrent(next);
    router.refresh();
  }

  return (
    <LocaleContext.Provider value={{ locale: current, dir, t: dictionaries[current], switchLocale }}>
      <div
        dir={dir}
        lang={current}
        className={`flex min-h-full flex-1 flex-col ${current === "ar" ? "font-arabic" : ""}`}
      >
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
