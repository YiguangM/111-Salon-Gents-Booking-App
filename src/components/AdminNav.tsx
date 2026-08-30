"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/barbers", label: "Barbers" },
  { href: "/admin/services", label: "Services" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-stone-200 bg-stone-900 text-stone-50">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold">Shop Admin</span>
        <nav className="flex items-center gap-5 text-sm font-medium text-stone-300">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "text-white" : "hover:text-white"}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="hover:text-white">
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
