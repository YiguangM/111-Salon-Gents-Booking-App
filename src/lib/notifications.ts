import nodemailer from "nodemailer";
import { formatDateTimeLabel } from "@/lib/format";

type ConfirmationEmailInput = {
  to: string;
  clientName: string;
  shopName: string;
  barberName: string;
  serviceName: string;
  startAt: Date;
  manageUrl: string;
};

// SMS (e.g. via Twilio) is not wired up. To add it, send a message here the
// same way the email below is sent, using the client's phone number.
//
// Email sending: if SMTP_HOST/SMTP_USER/SMTP_PASS are set, a real email is
// sent. Otherwise the confirmation is just logged to the console so the
// booking flow works out of the box in local dev.
export async function sendAppointmentConfirmation(input: ConfirmationEmailInput) {
  const subject = `Appointment confirmed at ${input.shopName}`;
  const body = [
    `Hi ${input.clientName},`,
    "",
    `Your appointment is confirmed:`,
    `  Service: ${input.serviceName}`,
    `  Barber: ${input.barberName}`,
    `  When: ${formatDateTimeLabel(input.startAt)}`,
    "",
    `Need to cancel or reschedule? ${input.manageUrl}`,
    "",
    `- ${input.shopName}`,
  ].join("\n");

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: input.to,
      subject,
      text: body,
    });
    return;
  }

  console.log(`\n--- Email confirmation (no SMTP configured, logging only) ---`);
  console.log(`To: ${input.to}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log(`--- end email ---\n`);
}
