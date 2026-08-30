import { AdminServices } from "@/components/admin/AdminServices";

export const metadata = { title: "Services" };

export default function AdminServicesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Services</h1>
      <AdminServices />
    </div>
  );
}
