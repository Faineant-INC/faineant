import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-smoke-900 text-bone-100 flex items-center justify-center px-5 py-10 sm:px-6">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-xl border border-smoke-700 bg-smoke-800 p-6 sm:p-10 md:p-12 flex flex-col gap-6">
        <span className="text-label uppercase tracking-[0.32em] text-champagne-400">
          Verify your email
        </span>

        <h1 className="font-display text-[clamp(1.75rem,7vw,2.25rem)] leading-[1.05]">
          Check your <em className="font-editorial italic font-light text-champagne-400">inbox.</em>
        </h1>

        <p className="font-editorial italic text-body-lg text-taupe-300">
          We sent a confirmation link to your email. Open it to finish setting
          up your account. Nothing urgent — the link will be waiting.
        </p>

        <Link
          href="/login"
          className="self-start mt-4 px-6 py-3 bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium"
        >
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
