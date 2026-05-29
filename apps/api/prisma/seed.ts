import { PrismaClient, ServiceCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface SeedService {
  slug: string;
  name: string;
  category: ServiceCategory;
  duration: number;
  price: number;
  description: string;
}

interface SeedPractitioner {
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  neighbourhood: string;
  yearsExperience: number;
  rating: number;
  services: SeedService[];
}

// Six FAINEANT canonical practitioners across the six service categories.
// Schema notes:
//   - `neighbourhood` is stored in ProviderProfile.address (no dedicated column).
//   - `yearsExperience` is currently informational only — woven into the bio
//     where appropriate; no schema column exists yet (TODO: add when needed).
//   - Service category enum maps:
//       HAIR -> HAIRCUT, LASH -> LASHES, BARBER -> FADE,
//       FACE -> FACIAL, NAILS -> NAILS, MAKEUP -> MAKEUP.
const practitioners: SeedPractitioner[] = [
  {
    email: "maeve@faineantapp.com",
    firstName: "Maeve",
    lastName: "Le Gal",
    bio: "Trained at Cristophe in Paris. Twenty-two years cutting hair, the last six entirely in clients' homes. Speaks slowly. Plays Erik Satie.",
    neighbourhood: "West Loop",
    yearsExperience: 22,
    rating: 4.94,
    services: [
      {
        slug: "hour-of-nothing",
        name: "Hour of nothing",
        category: "HAIRCUT",
        duration: 90,
        price: 18000,
        description: "Cut, shampoo, blow-dry, slowly.",
      },
      {
        slug: "trim-only",
        name: "Trim only",
        category: "HAIRCUT",
        duration: 45,
        price: 11000,
        description: "For clients she already knows.",
      },
    ],
  },
  {
    email: "yumi@faineantapp.com",
    firstName: "Yumi",
    lastName: "Watanabe",
    bio: "Three-month waitlist for her natural-look manicure. Plays only Bill Evans.",
    neighbourhood: "Logan Square",
    yearsExperience: 11,
    rating: 5.0,
    services: [
      {
        slug: "quiet-manicure",
        name: "Quiet manicure",
        category: "NAILS",
        duration: 75,
        price: 12000,
        description:
          "Cuticle attention bordering on sculpture. Champagne service is included, unironically.",
      },
    ],
  },
  {
    email: "adele@faineantapp.com",
    firstName: "Adèle",
    lastName: "Bergère",
    bio: "Speaks of skin the way a sommelier speaks of soil. Will not work on phones.",
    neighbourhood: "Lincoln Park",
    yearsExperience: 14,
    rating: 4.97,
    services: [
      {
        slug: "lymphatic-facial",
        name: "Lymphatic facial",
        category: "FACIAL",
        duration: 120,
        price: 28000,
        description: "Lymphatic, ceremonial, faintly ascetic.",
      },
    ],
  },
  {
    email: "imani@faineantapp.com",
    firstName: "Imani",
    lastName: "Okafor",
    bio: "Soft, full, never looks like work.",
    neighbourhood: "Wicker Park",
    yearsExperience: 9,
    rating: 4.92,
    services: [
      {
        slug: "lashes-by-hand",
        name: "Lashes by hand",
        category: "LASHES",
        duration: 120,
        price: 22000,
        description: "A two-hour lie-down in your own dark room.",
      },
    ],
  },
  {
    email: "rafael@faineantapp.com",
    firstName: "Rafael",
    lastName: "Duarte",
    bio: "No music, no chatter. The most expensive haircut on the platform. Worth it.",
    neighbourhood: "Fulton Market",
    yearsExperience: 17,
    rating: 4.91,
    services: [
      {
        slug: "barber-in-kitchen",
        name: "Barber, in your kitchen",
        category: "FADE",
        duration: 60,
        price: 9500,
        description:
          "A clean fade and a hot towel, performed by a man who has nothing to prove.",
      },
    ],
  },
  {
    email: "lea@faineantapp.com",
    firstName: "Léa",
    lastName: "Hernandez",
    bio: "Editorial-grade makeup applied at your bathroom mirror. The kit is heavier than it looks.",
    neighbourhood: "River North",
    yearsExperience: 13,
    rating: 4.95,
    services: [
      {
        slug: "makeup-at-vanity",
        name: "Makeup at your own vanity",
        category: "MAKEUP",
        duration: 90,
        price: 34000,
        description: "Editorial-grade makeup. The result is lighter.",
      },
    ],
  },
];

function slugify(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@faineantapp.com" },
    update: {},
    create: {
      email: "admin@faineantapp.com",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });

  // Create the six FAINEANT canonical practitioners.
  const providerPassword = await bcrypt.hash("provider123", 12);

  for (const p of practitioners) {
    const slug = slugify(p.firstName, p.lastName);
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: providerPassword,
        firstName: p.firstName,
        lastName: p.lastName,
        role: "PROVIDER",
        providerProfile: {
          create: {
            slug,
            bio: p.bio,
            businessName: `${p.firstName} ${p.lastName}`,
            // Neighbourhood lives in `address` until a dedicated column exists.
            address: `${p.neighbourhood}, Chicago, IL`,
            serviceRadius: 15,
            isVerified: true,
            averageRating: p.rating,
            totalReviews: 0,
          },
        },
      },
      include: { providerProfile: true },
    });

    if (!user.providerProfile) {
      throw new Error(`Provider profile missing for ${p.email}`);
    }

    const profileId = user.providerProfile.id;

    for (const svc of p.services) {
      // Idempotent service creation: match on profile + name.
      const existing = await prisma.service.findFirst({
        where: { providerProfileId: profileId, name: svc.name },
      });
      if (!existing) {
        await prisma.service.create({
          data: {
            providerProfileId: profileId,
            name: svc.name,
            description: svc.description,
            category: svc.category,
            durationMinutes: svc.duration,
            priceInCents: svc.price,
          },
        });
      }
    }

    // Weekly availability Tue-Sat 10:00-19:00 (FAINEANT-style schedule).
    for (let day = 2; day <= 6; day++) {
      await prisma.availability.upsert({
        where: {
          providerProfileId_dayOfWeek_startTime: {
            providerProfileId: profileId,
            dayOfWeek: day,
            startTime: "10:00",
          },
        },
        update: {},
        create: {
          providerProfileId: profileId,
          dayOfWeek: day,
          startTime: "10:00",
          endTime: "19:00",
        },
      });
    }
  }

  // Create demo client
  const clientPassword = await bcrypt.hash("client123", 12);
  await prisma.user.upsert({
    where: { email: "demo.client@faineantapp.com" },
    update: {},
    create: {
      email: "demo.client@faineantapp.com",
      passwordHash: clientPassword,
      firstName: "Sasha",
      lastName: "Chen",
      role: "CLIENT",
    },
  });

  console.log("Seed complete!");
  console.log(`Admin: admin@faineantapp.com / admin123`);
  console.log(
    `Practitioners: ${practitioners.map((p) => p.email).join(", ")} / provider123`
  );
  console.log(`Client: demo.client@faineantapp.com / client123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
