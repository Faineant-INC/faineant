export const BRAND_NAME = "FAINEANT" as const;
export const BRAND_LEGAL_NAME = "Faineant Inc." as const;
export const BRAND_DOMAIN = "faineantapp.com" as const;
export const BRAND_TAGLINE = "House calls for the slow-living." as const;
export const BRAND_SUPPORT_EMAIL = "support@faineantapp.com" as const;

export const CITY = "Chicago" as const;

export const NEIGHBOURHOODS = [
  "West Loop",
  "Logan Square",
  "Wicker Park",
  "Lincoln Park",
  "Fulton Market",
  "River North",
] as const;

export type Neighbourhood = (typeof NEIGHBOURHOODS)[number];

export const SERVICE_CATEGORIES = [
  { slug: "hair", label: "Hair", numberLabel: "№ 01" },
  { slug: "nails", label: "Nails", numberLabel: "№ 02" },
  { slug: "face", label: "Face", numberLabel: "№ 03" },
  { slug: "lash", label: "Lash", numberLabel: "№ 04" },
  { slug: "barber", label: "Barber", numberLabel: "№ 05" },
  { slug: "makeup", label: "Makeup", numberLabel: "№ 06" },
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORIES)[number]["slug"];
