import { z } from "zod";

export const createAppointmentSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  startAt: z.string().datetime(),
  clientName: z.string().trim().min(1, "Name is required").max(120),
  clientEmail: z.string().trim().email("Enter a valid email"),
  clientPhone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  notes: z.string().trim().max(500).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  barberId: z.string().min(1),
  startAt: z.string().datetime(),
});

export const barberInputSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  bio: z.string().trim().max(2000).optional().nullable(),
  photoUrl: z.string().trim().url().optional().nullable().or(z.literal("")),
  specialties: z.string().trim().max(300).optional().nullable(),
  active: z.boolean().optional(),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().max(1000).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(5).max(8 * 60),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean().optional(),
});

export const workingHoursInputSchema = z.object({
  shifts: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startMinute: z.number().int().min(0).max(24 * 60),
      endMinute: z.number().int().min(0).max(24 * 60),
    })
  ),
});

export const timeOffInputSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().max(300).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
