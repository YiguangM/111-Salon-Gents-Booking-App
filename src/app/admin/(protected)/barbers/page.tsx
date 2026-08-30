import { AdminBarbers } from "@/components/admin/AdminBarbers";

export const metadata = { title: "Barbers" };

export default function AdminBarbersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Barbers</h1>
      <AdminBarbers />
    </div>
  );
}
