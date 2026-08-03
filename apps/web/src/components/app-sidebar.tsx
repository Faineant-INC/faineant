"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  CreditCard,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Scissors,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const CLIENT_NAV: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Bookings", href: "/dashboard/client/bookings", icon: Calendar },
  { title: "Messages", href: "/dashboard/client/messages", icon: MessageSquare },
  { title: "Profile", href: "/dashboard/client/profile", icon: User },
];

const PROVIDER_NAV: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Bookings", href: "/dashboard/provider/bookings", icon: Calendar },
  { title: "Schedule", href: "/dashboard/provider/schedule", icon: CalendarDays },
  { title: "Services", href: "/dashboard/provider/services", icon: Scissors },
  { title: "Portfolio", href: "/dashboard/provider/portfolio", icon: ImageIcon },
  { title: "Messages", href: "/dashboard/provider/messages", icon: MessageSquare },
  { title: "Earnings", href: "/dashboard/provider/earnings", icon: CreditCard },
  { title: "Calendar", href: "/dashboard/provider/settings", icon: Plug },
  { title: "Profile", href: "/dashboard/provider/profile", icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { title: "Overview", href: "/admin", icon: ShieldCheck },
  { title: "Practitioners", href: "/practitioners", icon: Users },
  { title: "Services", href: "/services", icon: Scissors },
];

function navForRole(role: string | undefined): { label: string; items: NavItem[] } {
  switch (role) {
    case "ADMIN":
      return { label: "Admin", items: ADMIN_NAV };
    case "PROVIDER":
      return { label: "Practitioner", items: PROVIDER_NAV };
    case "CLIENT":
    default:
      return { label: "Client", items: CLIENT_NAV };
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { label, items } = navForRole(user?.role);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link
          href={user?.role === "ADMIN" ? "/admin" : "/dashboard"}
          className="flex items-center h-[18px] px-2 py-3 hover:opacity-80 transition-opacity duration-[250ms] ease-fai-smooth"
        >
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={128}
            height={18}
            className="h-[18px] w-auto"
            priority
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{label}</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
