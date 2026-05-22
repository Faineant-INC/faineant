import Image from "next/image";
import Link from "next/link";

const SERVICES = [
  {
    n: "№ 01",
    cat: "HAIR",
    price: "$180",
    img: "/brand/photography/tile-hair.png",
    alt: "An hour of nothing on your couch",
    title: "An",
    titleEm: "hour of nothing",
    titleEnd: "on your couch.",
    desc: "A slow shampoo at your kitchen sink. Warm towels she carries up four flights. The conversation is optional.",
    by: "MAEVE LE GAL",
    meta: "90 MIN · WEST LOOP",
    slug: "hour-of-nothing",
  },
  {
    n: "№ 02",
    cat: "NAILS",
    price: "$120",
    img: "/brand/photography/tile-nails.png",
    alt: "A quiet manicure at your coffee table",
    title: "A",
    titleEm: "quiet manicure",
    titleEnd: "at your coffee table.",
    desc: "Yumi brings her own lamp, her own files, and a small jazz record she will not play unless you ask.",
    by: "YUMI WATANABE",
    meta: "75 MIN · LOGAN SQUARE",
    slug: "quiet-manicure",
  },
  {
    n: "№ 03",
    cat: "FACE",
    price: "$280",
    img: "/brand/photography/tile-face.png",
    alt: "A lymphatic facial on your own pillow",
    title: "A",
    titleEm: "lymphatic facial",
    titleEnd: "on your own pillow.",
    desc: "Adèle arrives with one heated towel and the patience of a person who reads books all the way through.",
    by: "ADÈLE BERGÈRE",
    meta: "120 MIN · LINCOLN PARK",
    slug: "lymphatic-facial",
  },
  {
    n: "№ 04",
    cat: "LASH",
    price: "$220",
    img: "/brand/photography/tile-lash.png",
    alt: "Lashes laid on your bed, by Imani",
    title: "Lashes",
    titleEm: "laid on your bed,",
    titleEnd: "by Imani.",
    desc: "A two-hour lie-down in your own dark room while a stranger improves your face one millimetre at a time.",
    by: "IMANI OKAFOR",
    meta: "120 MIN · WICKER PARK",
    slug: "lashes-by-hand",
  },
  {
    n: "№ 05",
    cat: "BARBER",
    price: "$95",
    img: "/brand/photography/tile-barber.png",
    alt: "A barber's chair, placed in your kitchen",
    title: "A barber’s chair,",
    titleEm: "placed in your kitchen.",
    titleEnd: "",
    desc: "A clean fade and a hot towel, performed by a man who has nothing to prove. Bring your own stool.",
    by: "RAFAEL DUARTE",
    meta: "60 MIN · FULTON MARKET",
    slug: "barber-in-kitchen",
  },
  {
    n: "№ 06",
    cat: "MAKEUP",
    price: "$340",
    img: "/brand/photography/tile-makeup.png",
    alt: "Makeup at your own vanity, by Léa",
    title: "Makeup",
    titleEm: "at your own vanity,",
    titleEnd: "by Léa.",
    desc: "Editorial-grade makeup applied at your bathroom mirror. The kit is heavier than it looks. The result is lighter.",
    by: "LÉA HERNANDEZ",
    meta: "90 MIN · RIVER NORTH",
    slug: "makeup-at-vanity",
  },
];

export function IdleCollectionSection() {
  return (
    <section className="py-16 md:py-24 lg:py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-5 md:px-10 lg:px-14">
        <div className="flex justify-between items-start md:items-end mb-10 md:mb-16 pb-6 border-b border-taupe-500 gap-6 md:gap-12 flex-col md:flex-row">
          <h3 className="font-display display-compressed text-[clamp(40px,8vw,64px)] leading-[0.94] text-bone-100">
            The{" "}
            <em className="font-editorial italic font-light text-champagne-400">
              Idle Collection.
            </em>
          </h3>
          <div className="font-mono text-mono text-taupe-300 leading-relaxed text-left md:text-right">
            <strong className="text-bone-100 font-medium">06 RITUALS</strong>
            <br />
            FROM $95 — $480
            <br />
            AVG · 90 MIN · CHICAGO
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-smoke-700">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="group bg-smoke-900 grid grid-cols-1 sm:grid-cols-2 sm:min-h-[380px] hover:bg-smoke-800 transition-colors duration-[350ms] ease-fai-smooth"
            >
              <div className="relative bg-smoke-900 overflow-hidden h-56 sm:h-auto">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  className="object-cover object-center brightness-95 contrast-[1.02]"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div className="p-6 sm:p-8 lg:p-9 flex flex-col gap-3.5">
                <div className="flex justify-between items-start font-mono text-mono text-taupe-300">
                  <span>{s.n} · {s.cat}</span>
                  <span className="text-champagne-400 font-medium text-[14px]">{s.price}</span>
                </div>
                <h4 className="font-display display-compressed text-[clamp(24px,5vw,30px)] leading-[1.04] text-bone-100 mt-1">
                  {s.title}{" "}
                  <em className="font-editorial italic font-light text-champagne-400 tracking-[-0.005em]">
                    {s.titleEm}
                  </em>{" "}
                  {s.titleEnd}
                </h4>
                <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
                  {s.desc}
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-auto pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.3em] text-taupe-300 font-medium text-[10px] gap-2">
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-taupe-500" aria-hidden />
                    {s.by}
                  </span>
                  <span>{s.meta}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
