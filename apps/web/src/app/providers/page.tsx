import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export const metadata = {
  title: "The Salon — FAINEANT",
  description:
    "Fourteen practitioners. Chicago only. Hair, nails, face, lash, barber, makeup — at home.",
};

interface PractitionerCard {
  slug: string;
  firstName: string;
  surname: string;
  neighbourhood: string;
  specialty: string;
  numberLabel: string;
  image: string;
}

// TODO(impl): replace with Prisma query
const PRACTITIONERS: PractitionerCard[] = [
  {
    slug: "maeve-le-gal",
    firstName: "Maeve",
    surname: "Le Gal",
    neighbourhood: "West Loop",
    specialty: "Hair · cut & colour",
    numberLabel: "№ 01",
    image: "/brand/photography/portrait-maeve.png",
  },
  {
    slug: "noor-amari",
    firstName: "Noor",
    surname: "Amari",
    neighbourhood: "Logan Square",
    specialty: "Nails · gel & natural",
    numberLabel: "№ 02",
    image: "/brand/photography/tile-nails.png",
  },
  {
    slug: "isolde-vance",
    firstName: "Isolde",
    surname: "Vance",
    neighbourhood: "Lincoln Park",
    specialty: "Face · facials & dermaplane",
    numberLabel: "№ 03",
    image: "/brand/photography/tile-face.png",
  },
  {
    slug: "june-hartwell",
    firstName: "June",
    surname: "Hartwell",
    neighbourhood: "Wicker Park",
    specialty: "Lash · classic & volume",
    numberLabel: "№ 04",
    image: "/brand/photography/tile-lash.png",
  },
  {
    slug: "augustin-roe",
    firstName: "Augustin",
    surname: "Roe",
    neighbourhood: "Fulton Market",
    specialty: "Barber · cut & shave",
    numberLabel: "№ 05",
    image: "/brand/photography/tile-barber.png",
  },
  {
    slug: "céleste-mori",
    firstName: "Céleste",
    surname: "Mori",
    neighbourhood: "River North",
    specialty: "Makeup · day & evening",
    numberLabel: "№ 06",
    image: "/brand/photography/tile-makeup.png",
  },
  {
    slug: "henrik-lund",
    firstName: "Henrik",
    surname: "Lund",
    neighbourhood: "West Loop",
    specialty: "Hair · long & curly",
    numberLabel: "№ 07",
    image: "/brand/photography/tile-hair.png",
  },
  {
    slug: "ottilie-renner",
    firstName: "Ottilie",
    surname: "Renner",
    neighbourhood: "Logan Square",
    specialty: "Face · acne & rosacea",
    numberLabel: "№ 08",
    image: "/brand/photography/tile-face.png",
  },
];

export default function ProvidersPage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24 border-b border-smoke-700">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
            № 02 · The Directory
          </span>
          <h1 className="font-display display-compressed text-[clamp(48px,10vw,80px)] leading-[0.94] text-bone-100 mt-4">
            The{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              Salon.
            </em>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-start md:items-end gap-6 md:gap-8 mt-10 pt-8 border-t border-taupe-500">
            <p className="font-editorial italic font-light text-[clamp(18px,3vw,24px)] leading-snug text-bone-200 max-w-[680px]">
              Fourteen practitioners, chosen one at a time. Each one travels.
              Each one keeps their own calendar. Tap a name to read about them
              and reserve an hour.
            </p>
            <p className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300 text-left md:text-right">
              Chicago only
              <br />
              Currently shown · 8 of 14
            </p>
          </div>
        </section>

        <section className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-20">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-smoke-700">
            {PRACTITIONERS.map((p) => (
              <li
                key={p.slug}
                className="border-r border-b border-smoke-700 group bg-smoke-900"
              >
                <Link
                  href={`/providers/${p.slug}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-400"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-smoke-950">
                    <Image
                      src={p.image}
                      alt={`${p.firstName} ${p.surname}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover object-top transition-transform duration-[600ms] ease-fai-smooth group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col gap-4">
                    <span className="font-mono text-mono uppercase tracking-[0.3em] text-taupe-300">
                      {p.numberLabel} · {p.neighbourhood}
                    </span>
                    <h3 className="font-display display-compressed text-[clamp(28px,5vw,36px)] leading-[0.95] text-bone-100">
                      {p.firstName}{" "}
                      <em className="font-editorial italic font-light text-champagne-400">
                        {p.surname}.
                      </em>
                    </h3>
                    <p className="font-editorial italic text-body-lg text-bone-200">
                      {p.specialty}
                    </p>
                    <span className="mt-4 pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.32em] text-bone-100 group-hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth font-medium">
                      Book →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
