"use client";

import Image from "next/image";
import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const homeHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-smoke-700 bg-smoke-900/95 backdrop-blur px-5 h-14">
          <SidebarTrigger
            className="text-bone-200 hover:bg-smoke-800 hover:text-bone-100"
            aria-label="Open navigation"
          />
          <Link
            href={homeHref}
            className="flex items-center hover:opacity-80 transition-opacity duration-[250ms] ease-fai-smooth"
          >
            <Image
              src="/brand/faineant-wordmark-white.png"
              alt="FAINEANT"
              width={112}
              height={16}
              className="h-4 w-auto"
              priority
            />
          </Link>
          <span className="w-7" aria-hidden />
        </header>
        <VerifyEmailBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
