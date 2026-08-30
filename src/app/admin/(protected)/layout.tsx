import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionAdminId } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const adminId = await getSessionAdminId();
  if (!adminId) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
