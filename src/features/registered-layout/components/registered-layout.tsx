"use client";

import {
  Building2,
  ClipboardList,
  Columns3,
  AlertCircle,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { routes } from "@/common/routes";
import { cn } from "@/lib/utils";
import {
  getGetTasksQueryKey,
  getGetTodaysTasksQueryKey,
  useEnsureDailyCallTasks,
} from "@/service-api/generated/endpoints/tasks/tasks";
import { getGetCompaniesQueryKey } from "@/service-api/generated/endpoints/companies/companies";
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

type EnsureTaskLike = {
  completedAt?: string | null;
  dueDate?: string | null;
  status?: string;
};

let hasRequestedDailyCallsEnsure = false;

function getLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hasOverduePendingTasks(tasks: EnsureTaskLike[]) {
  const todayKey = getLocalDateKey(new Date());

  return tasks.some((task) => {
    if (!task.dueDate || task.completedAt || task.status === "COMPLETED") {
      return false;
    }

    return getLocalDateKey(task.dueDate) < todayKey;
  });
}

export function RegisteredLayout({ children }: RegisteredLayoutProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [ensureModalMessage, setEnsureModalMessage] = useState<string | null>(null);
  const activeItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const quickCreateLabel =
    activeItem?.href === routes.companies.path ? "Company" : "Quick Create";
  const ensureDailyCallsMutation = useEnsureDailyCallTasks({
    mutation: {
      onSuccess: async (response) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetTodaysTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }),
        ]);

        if (
          response.data.action === "HAS_PENDING_TASKS" &&
          response.data.message &&
          hasOverduePendingTasks(response.data.data)
        ) {
          setEnsureModalMessage(response.data.message);
        }
      },
    },
  });

  useEffect(() => {
    if (hasRequestedDailyCallsEnsure) {
      return;
    }

    hasRequestedDailyCallsEnsure = true;
    ensureDailyCallsMutation.mutate({ data: { limit: 10 } });
  }, [ensureDailyCallsMutation]);

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

      {ensureModalMessage ? (
        <div className={styles.modalOverlay} role="presentation">
          <section
            aria-labelledby="daily-calls-modal-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <div className={styles.modalIcon}>
              <AlertCircle size={20} />
            </div>
            <div className={styles.modalCopy}>
              <p className={styles.modalEyebrow}>Task-uri pending</p>
              <h2 id="daily-calls-modal-title">Ai call-uri de terminat</h2>
              <p>{ensureModalMessage}</p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalGhostButton}
                type="button"
                onClick={() => setEnsureModalMessage(null)}
              >
                Închid
              </button>
              <Link
                className={styles.modalPrimaryButton}
                href={routes.tasks.path}
                onClick={() => setEnsureModalMessage(null)}
              >
                Vezi task-urile
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
