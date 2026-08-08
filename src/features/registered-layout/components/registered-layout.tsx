"use client";

import {
  BarChart3,
  Circle,
  Database,
  FileBarChart,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/common/routes";
import { cn } from "@/lib/utils";
import styles from "./index.module.css";

const navGroups = [
  {
    label: "Home",
    items: [
      {
        name: routes.dashboard.name,
        href: routes.dashboard.path,
        icon: LayoutDashboard,
      },
      { name: "Lifecycle", href: "/lifecycle", icon: Circle },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Projects", href: "/projects", icon: Folder },
      { name: "Team", href: "/team", icon: UsersRound },
    ],
  },
  {
    label: "Documents",
    items: [
      { name: "Data Library", href: "/data-library", icon: Database },
      { name: "Reports", href: "/reports", icon: FileBarChart },
      { name: "Word Assistant", href: "/word-assistant", icon: FileText },
      { name: "More", href: "/more", icon: MoreHorizontal },
    ],
  },
];

type RegisteredLayoutProps = {
  children: React.ReactNode;
};

export function RegisteredLayout({ children }: RegisteredLayoutProps) {
  const pathname = usePathname();

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
                  pathname === item.href ||
                  (pathname === routes.dashboard.path &&
                    item.name === "Analytics");

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
            <div>
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
          <h1 className={styles.pageTitle}>Documents</h1>
          <button className={styles.quickCreate} type="button">
            <PlusCircle size={15} />
            Quick Create
          </button>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
