"use client";

import {
  Building2,
  ClipboardList,
  Columns3,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/common/routes";
import { cn } from "@/lib/utils";
import styles from "./index.module.css";

const navGroups = [
  {
    label: "Aplicatie",
    items: [
      {
        name: routes.dashboard.name,
        href: routes.dashboard.path,
        icon: LayoutDashboard,
      },
      { name: routes.companies.name, href: routes.companies.path, icon: Building2 },
      { name: routes.deals.name, href: routes.deals.path, icon: Columns3 },
      { name: routes.tasks.name, href: routes.tasks.path, icon: ClipboardList },
      { name: routes.import.name, href: routes.import.path, icon: Upload },
      { name: routes.reports.name, href: routes.reports.path, icon: FileBarChart },
      { name: routes.settings.name, href: routes.settings.path, icon: Settings },
    ],
  },
];

type RegisteredLayoutProps = {
  children: React.ReactNode;
};

export function RegisteredLayout({ children }: RegisteredLayoutProps) {
  const pathname = usePathname();
  const activeItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const quickCreateLabel =
    activeItem?.href === routes.companies.path ? "Company" : "Quick Create";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href={routes.dashboard.path}>
          <span className={styles.brandMark} />
          <span>Acme Inc.</span>
        </Link>

        <nav className={styles.nav}>
          {navGroups.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <p className={styles.navLabel}>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    className={cn(
                      styles.navItem,
                      isActive && styles.activeNavItem,
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon size={16} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.workspace}>
            <span className={styles.workspaceAvatar}>AC</span>
            <div className={styles.workspaceDetails}>
              <p className={styles.workspaceName}>Acme Inc.</p>
              <p className={styles.workspaceHint}>Workspace</p>
            </div>
            <button
              aria-label="Logout"
              className={styles.iconButton}
              type="button"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {activeItem?.name ?? routes.dashboard.name}
          </h1>
          <button className={styles.quickCreate} type="button">
            <PlusCircle size={15} />
            {quickCreateLabel}
          </button>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
