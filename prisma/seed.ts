import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const shopSettings = {
    shopName: process.env.SHOP_NAME ?? "111 Salon Gents",
    address: process.env.SHOP_ADDRESS ?? "Warsan 1, Dubai, UAE",
    // Left blank (not a loud placeholder) so the site simply omits these
    // rather than showing fake contact info to visitors - see the
    // conditional rendering in ContactPage/SiteFooter.
    phone: process.env.SHOP_PHONE ?? "",
    email: process.env.SHOP_EMAIL ?? "",
    // Left null so the homepage falls back to the translated tagline in both
    // languages (see t.home.aboutFallback) - set this via the admin
    // dashboard only if you want custom copy, in which case it will show
    // as-is regardless of which language the visitor has selected.
    aboutText: null,
    hoursText: "Sat-Thu: 9am - 10pm\nFriday: 2pm - 10pm",
  };

  await prisma.shopSettings.upsert({
    where: { id: "singleton" },
    update: shopSettings,
    create: { id: "singleton", ...shopSettings },
  });

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Shop Owner",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  // Prices are placeholder estimates (AED) - update via the admin dashboard
  // with the shop's real price list.
  const services = [
    { name: "Haircut", description: "Classic cut, tailored to you.", durationMinutes: 30, priceCents: 3500 },
    { name: "Beard Trim", description: "Shape and clean up.", durationMinutes: 15, priceCents: 2000 },
    { name: "Haircut + Beard Trim", description: "The full package.", durationMinutes: 45, priceCents: 5000 },
    { name: "Kids Cut (12 & under)", description: "Quick and painless, we promise.", durationMinutes: 25, priceCents: 2500 },
    { name: "Hot Towel Shave", description: "Straight razor shave with hot towel finish.", durationMinutes: 30, priceCents: 4500 },
  ];

  for (const service of services) {
    const existing = await prisma.service.findFirst({ where: { name: service.name } });
    if (!existing) {
      await prisma.service.create({ data: service });
    }
  }

  // Placeholder names/bios - replace via the admin dashboard with the
  // shop's real barbers. Hours follow a typical Dubai salon week: open
  // daily, with Friday starting later (after Jummah prayer).
  // `oldSlug` lets this migrate barbers seeded under the previous
  // (fictional-example) names in place, preserving their id and any
  // appointments already booked against them.
  const barbers = [
    {
      oldSlug: "marcus-reed",
      slug: "barber-one",
      name: "Barber One",
      bio: "Specializes in fades and classic cuts.",
      specialties: "Fades, Classic Cuts",
      shifts: uaeWeekShifts(),
    },
    {
      oldSlug: "dana-oyelaran",
      slug: "barber-two",
      name: "Barber Two",
      bio: "Loves a good beard sculpt.",
      specialties: "Beard Sculpting",
      shifts: uaeWeekShifts(),
    },
  ];

  for (const barber of barbers) {
    const existing =
      (await prisma.barber.findUnique({ where: { slug: barber.slug } })) ??
      (await prisma.barber.findUnique({ where: { slug: barber.oldSlug } }));

    const data = { slug: barber.slug, name: barber.name, bio: barber.bio, specialties: barber.specialties };

    if (existing) {
      await prisma.workingHour.deleteMany({ where: { barberId: existing.id } });
      await prisma.barber.update({
        where: { id: existing.id },
        data: { ...data, workingHours: { create: barber.shifts } },
      });
    } else {
      await prisma.barber.create({ data: { ...data, workingHours: { create: barber.shifts } } });
    }
  }

  console.log("Seed complete.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

// Sat-Thu: split shift with a midday break. Friday: afternoon/evening only.
function uaeWeekShifts() {
  const regularDays = [6, 0, 1, 2, 3, 4]; // Saturday - Thursday (JS getDay(): 0=Sun ... 6=Sat)
  const shifts = regularDays.flatMap((dayOfWeek) => [
    { dayOfWeek, startMinute: 9 * 60, endMinute: 14 * 60 },
    { dayOfWeek, startMinute: 16 * 60, endMinute: 22 * 60 },
  ]);
  shifts.push({ dayOfWeek: 5, startMinute: 14 * 60, endMinute: 22 * 60 }); // Friday
  return shifts;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
