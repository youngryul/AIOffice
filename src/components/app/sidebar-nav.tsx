"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  CalendarDaysIcon,
  CheckSquareIcon,
  FileSearchIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  PenLineIcon,
  RadarIcon,
  SettingsIcon,
  UsersIcon,
  NotebookTabsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/office", label: "Office", icon: Building2Icon },
  { href: "/approvals", label: "CEO 결재", icon: CheckSquareIcon, badgeKey: "approvals" as const },
  { href: "/employees", label: "직원", icon: UsersIcon },
  { href: "/tasks", label: "업무", icon: ListTodoIcon },
  { href: "/research", label: "리서치", icon: FileSearchIcon },
  { href: "/trends", label: "Trend Radar", icon: RadarIcon },
  { href: "/opportunities", label: "Opportunity Board", icon: LightbulbIcon },
  { href: "/content", label: "Content Factory", icon: PenLineIcon },
  { href: "/content/calendar", label: "Content Calendar", icon: CalendarDaysIcon },
  { href: "/meetings", label: "회의", icon: MessagesSquareIcon },
  { href: "/projects", label: "프로젝트", icon: FolderKanbanIcon },
  { href: "/notion", label: "Notion", icon: NotebookTabsIcon },
  { href: "/settings", label: "설정", icon: SettingsIcon },
];

export function SidebarNav({ pendingApprovals }: { pendingApprovals: number }) {
  const pathname = usePathname();
  const activeHref = NAV.map((n) => n.href)
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="grid gap-0.5" aria-label="주 메뉴">
      {NAV.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.badgeKey === "approvals" && pendingApprovals > 0 ? (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{pendingApprovals}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="모바일 메뉴">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-xs",
            pathname === item.href ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

