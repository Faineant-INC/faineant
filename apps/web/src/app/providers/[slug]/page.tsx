import Image from "next/image";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

// TODO(impl): replace static lookup with Prisma query in a server action
const PRACTITIONERS: Record<string, {
  name: string; nameEm: string; tagline: string; bio: string;
  metaItems: { dt: string; dd: string }[];
  services: { name: string; sub: string; dur: string; price: string }[];
  imgSrc: string;
  quote: string;
}> = {
  "maeve-le-gal": {
    name: "Maeve",
    nameEm: "Le Gal.",
    tagline: "Hairdressing — twenty-two years",
    bio: "Trained at Cristophe in Paris. Twenty-two years cutting hair, the last six entirely in clients' homes. Specialises in long, soft, deliberate haircuts. Speaks slowly. Plays Erik Satie. Will not work on your phone.",
    metaItems: [
      { dt: "Years", dd: "22" },
      { dt: "Speaks", dd: "English, French" },
      { dt: "Neighbourhood", dd: "West Loop" },
      { dt: "House call radius", dd: "10 mi" },
      { dt: "Visits in 2025", dd: "312" },
      { dt: "Rating", dd: "4.94 / 5" },
    ],
    services: [
      { name: "Hour of nothing", sub: "Cut, shampoo, blow-dry, slowly", dur: "90 MIN", price: "$180" },
      { name: "Trim only", sub: "For clients she already knows", dur: "45 MIN", price: "$110" },
      { name: "Cut + colour, edited", sub: "Single-process or root-only", dur: "180 MIN", price: "$420" },
    ],
    imgSrc: "/brand/photography/portrait-maeve.png",
    quote: "I cut hair for people who would rather lie down than stand at a salon for two hours. The work is the same. The chair is just yours.",
  },
  "imani-okafor": {
    name: "Imani",
    nameEm: "Okafor.",
    tagline: "Lash work — eleven years",
    bio: "Eleven years of lash work, four of them house calls only. Trained in Lagos, certified in London. Believes in the lying-down hour: a single client, a clean light, no music with words. Will gently refuse a fill that should be a removal.",
    metaItems: [
      { dt: "Years", dd: "11" },
      { dt: "Speaks", dd: "English, Igbo" },
      { dt: "Neighbourhood", dd: "Bed-Stuy" },
      { dt: "House call radius", dd: "8 mi" },
      { dt: "Visits in 2025", dd: "248" },
      { dt: "Rating", dd: "4.97 / 5" },
    ],
    services: [
      { name: "Full set, classic", sub: "Two hours flat on your couch", dur: "120 MIN", price: "$240" },
      { name: "Fill, two-week", sub: "For clients she already knows", dur: "75 MIN", price: "$130" },
      { name: "Removal", sub: "Soak, lift, rest your eyes", dur: "45 MIN", price: "$80" },
    ],
    imgSrc: "/brand/photography/tile-lash.png",
    quote: "Lashes are an hour you owe yourself. I close the curtains, I put on something quiet, I do the work. You wake up looking like you slept well.",
  },
  "yumi-watanabe": {
    name: "Yumi",
    nameEm: "Watanabe.",
    tagline: "Manicure — sixteen years",
    bio: "Sixteen years of nails, the last five entirely at home. Studied gel structure in Tokyo. Files in one direction. Doesn't paint while you scroll. Prefers to work at your kitchen table with the window cracked.",
    metaItems: [
      { dt: "Years", dd: "16" },
      { dt: "Speaks", dd: "English, Japanese" },
      { dt: "Neighbourhood", dd: "Logan Square" },
      { dt: "House call radius", dd: "12 mi" },
      { dt: "Visits in 2025", dd: "286" },
      { dt: "Rating", dd: "4.96 / 5" },
    ],
    services: [
      { name: "Manicure, edited", sub: "Shape, cuticle, single colour", dur: "60 MIN", price: "$95" },
      { name: "Gel, structured", sub: "Builder base, long-wear", dur: "90 MIN", price: "$145" },
      { name: "Pedicure, slow", sub: "Soak, file, polish, sit", dur: "75 MIN", price: "$120" },
    ],
    imgSrc: "/brand/photography/tile-nails.png",
    quote: "A manicure is a small ritual. Sixty minutes, one colour, no rush. I would rather you sat still than that we hurried.",
  },
  "leo-aragon": {
    name: "Leo",
    nameEm: "Aragón.",
    tagline: "Barbering — nineteen years",
    bio: "Nineteen years behind a chair, the last three entirely in clients' homes. Trained in Madrid, learned the hot towel in Havana. Cuts to a metronome. Will not cut while you take a call. Brings his own apron, his own broom.",
    metaItems: [
      { dt: "Years", dd: "19" },
      { dt: "Speaks", dd: "English, Spanish" },
      { dt: "Neighbourhood", dd: "Pilsen" },
      { dt: "House call radius", dd: "10 mi" },
      { dt: "Visits in 2025", dd: "334" },
      { dt: "Rating", dd: "4.95 / 5" },
    ],
    services: [
      { name: "Full cut + hot towel", sub: "Scissor, clipper, finish", dur: "60 MIN", price: "$120" },
      { name: "Beard, edited", sub: "Trim, line, oil", dur: "30 MIN", price: "$60" },
      { name: "Cut + beard", sub: "The whole hour, properly", dur: "75 MIN", price: "$160" },
    ],
    imgSrc: "/brand/photography/tile-barber.png",
    quote: "A good cut takes an hour. Not forty minutes between two other men. An hour, in your kitchen, with the radio low.",
  },
};

export default function PractitionerPage({ params }: { params: { slug: string } }) {
  const p = PRACTITIONERS[params.slug];
  if (!p) notFound();

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] lg:min-h-[680px] border border-smoke-700">
          <div className="relative bg-smoke-900 overflow-hidden min-h-[420px] sm:min-h-[520px] lg:min-h-0">
            <Image src={p.imgSrc} alt={`${p.name} ${p.nameEm}`} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 55vw" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10">
              <p className="font-editorial italic font-light text-[clamp(18px,3vw,24px)] text-bone-100 leading-snug">
                &ldquo;{p.quote}&rdquo;
              </p>
            </div>
          </div>
          <div className="bg-smoke-900 p-6 sm:p-10 lg:p-14 pb-8 flex flex-col gap-6">
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">In Practice &middot; No 01 / 14</span>
            <h2 className="font-display display-compressed text-[clamp(40px,9vw,64px)] leading-[0.94] text-bone-100">
              {p.name}{" "}
              <em className="font-editorial italic font-light text-champagne-400">{p.nameEm}</em>
            </h2>
            <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed max-w-[520px]">
              {p.bio}
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-6 border-t border-smoke-700 border-b border-smoke-700">
              {p.metaItems.map((m) => (
                <div key={m.dt}>
                  <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">{m.dt}</dt>
                  <dd className="font-editorial italic text-body-lg text-bone-100 leading-snug">{m.dd}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <h5 className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">{p.name}&apos;s menu</h5>
              {p.services.map((s) => (
                <div key={s.name} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-3 sm:gap-4 items-center p-4 px-4 border border-smoke-700">
                  <div className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                    {s.name}<small className="block font-editorial italic font-light text-bone-200 text-[13px] mt-0.5">{s.sub}</small>
                  </div>
                  <span className="hidden sm:inline font-mono text-mono text-taupe-300 tracking-[0.04em]">{s.dur}</span>
                  <span className="font-mono text-[14px] text-champagne-400 font-medium">{s.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
