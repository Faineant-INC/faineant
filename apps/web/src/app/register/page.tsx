import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";
import { redirect } from "next/navigation";
import { isLaunched } from "@/lib/flags";

export default function RegisterPage() {
  if (!isLaunched()) {
    redirect("/#waitlist");
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] bg-smoke-900">
      <div className="flex flex-col gap-10 px-5 py-10 sm:px-8 sm:py-12 lg:p-14 lg:gap-0 lg:justify-between">
        <Link href="/" className="block">
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={170}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>
        <div className="w-full max-w-sm sm:max-w-md lg:max-w-[420px] flex flex-col gap-6">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300">
            Create an account
          </span>
          <h1 className="font-display display-compressed text-[clamp(2.25rem,9vw,3.5rem)] leading-[0.95] text-bone-100">
            An hour{" "}
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
              of nothing
            </em>{" "}
            awaits.
          </h1>
          <p className="font-editorial italic text-editorial text-bone-200">
            Five details, no junk mail. Cancellation is always free.
          </p>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
          <p className="font-mono text-mono text-taupe-300">
            Already a client?{" "}
            <Link href="/login" className="text-champagne-400 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
        <div className="font-mono text-mono text-taupe-400">© FAINEANT · CHICAGO</div>
      </div>
      <div className="hidden lg:block relative bg-smoke-950 overflow-hidden">
        <Image
          src="/brand/photography/hero.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="60vw"
        />
      </div>
    </main>
  );
}
