import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isLaunched } from "@/lib/flags";

const NAV_LEFT = [
  { label: "Services", href: "/services" },
  { label: "Practitioners", href: "/practitioners" },
  { label: "Manifesto", href: "/manifesto" },
];

export function SiteHeader() {
  const launched = isLaunched();
  const navLeft = launched
    ? NAV_LEFT
    : NAV_LEFT.filter((item) => item.href !== "/practitioners");

  return (
    <header className="sticky top-0 z-50 bg-smoke-900/85 backdrop-blur-md border-b border-smoke-700">
      <nav className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center h-16 md:h-18 px-5 md:px-10 lg:px-14 gap-4">
        <ul className="hidden md:flex gap-6 lg:gap-9">
          {navLeft.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-label uppercase tracking-[0.3em] font-medium text-bone-100 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="flex items-center md:justify-center h-5 md:h-6 justify-self-start md:justify-self-auto"
        >
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={170}
            height={24}
            className="h-5 md:h-6 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center justify-end gap-5 lg:gap-9">
          <Link
            href="/login"
            className="hidden md:inline text-label uppercase tracking-[0.3em] font-medium text-bone-100 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
          >
            Sign in
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/#waitlist">{launched ? "Reserve" : "Join the list"}</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
