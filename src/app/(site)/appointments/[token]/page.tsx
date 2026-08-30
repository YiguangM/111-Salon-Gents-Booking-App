import { ManageAppointment } from "@/components/ManageAppointment";

export const metadata = { title: "Manage Your Appointment" };

export default async function ManageAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <ManageAppointment token={token} />
    </div>
  );
}
