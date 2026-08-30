import { cookies } from "next/headers";
import { LOCALES, DEFAULT_LOCALE, dictionaries, type Locale } from "./dictionaries";
import { LOCALE_COOKIE } from "./server.constants";

export { LOCALE_COOKIE };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(value ?? "") ? (value as Locale) : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, dir: locale === "ar" ? ("rtl" as const) : ("ltr" as const), t: dictionaries[locale] };
}
