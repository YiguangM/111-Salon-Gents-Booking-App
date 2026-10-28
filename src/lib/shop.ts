import { prisma } from "@/lib/prisma";

// Exact pin from the shop's Google Maps listing. The free-text address alone
// ("Russia Cluster, Warsan First...") doesn't resolve to the right building.
export const SHOP_MAP_COORDINATES = "25.170763,55.39987";
export const SHOP_GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=111+salon+gents&query_place_id=ChIJ5bHK6z5nXz4RWoYHp4ShC1U";

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
