import type { ReactNode } from "react";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="bg-smoke-900 text-bone-100">
        <article className="max-w-[980px] mx-auto px-5 md:px-10 lg:px-14 py-16 md:py-24">
          <span className="font-mono text-mono uppercase tracking-[0.32em] text-taupe-300">
            {eyebrow}
          </span>
          <h1 className="font-display display-compressed text-[clamp(42px,9vw,72px)] leading-[0.94] mt-4">
            {title}
          </h1>
          <p className="font-editorial italic font-light text-[clamp(19px,3.2vw,25px)] leading-relaxed text-bone-200 mt-8 max-w-[760px]">
            {intro}
          </p>
          <div className="mt-12 space-y-10 border-t border-smoke-700 pt-10 text-body-sm text-bone-200 leading-relaxed [&_h2]:font-display [&_h2]:text-[26px] [&_h2]:text-bone-100 [&_h2]:tracking-[-0.02em] [&_h2]:mb-3 [&_a]:text-champagne-400 [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
