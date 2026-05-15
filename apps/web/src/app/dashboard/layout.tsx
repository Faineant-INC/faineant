"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <VerifyEmailBanner />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
