import { prisma } from "@/lib/prisma";

export async function getShopSettings() {
  const settings = await prisma.shopSettings.findUnique({ where: { id: "singleton" } });
  if (settings) return settings;

  return {
    id: "singleton",
    shopName: "Barbershop",
    address: "",
    phone: "",
    email: "",
    aboutText: null,
    hoursText: null,
    heroImageUrl: null,
  };
}
