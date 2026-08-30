type UiLocale = "en" | "ar";

// This shop is in the UAE, so AED is hardcoded rather than configurable -
// swap this (and the locale mapping below) if the app is reused elsewhere.
export function formatPrice(cents: number, locale: UiLocale = "en"): string {
  return (cents / 100).toLocaleString(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
  });
}

export function formatDuration(minutes: number, locale: UiLocale = "en"): string {
  if (locale === "ar") {
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} ساعة` : `${hours} ساعة و${rest} دقيقة`;
  }

  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function minutesToTimeLabel(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTimeLabel(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
