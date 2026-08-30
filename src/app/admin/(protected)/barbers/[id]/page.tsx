import { BarberEditor } from "@/components/admin/BarberEditor";

export const metadata = { title: "Manage Barber" };

export default async function AdminBarberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Manage Barber</h1>
      <BarberEditor barberId={id} />
    </div>
  );
}
