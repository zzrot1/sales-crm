"use client";

import {
  Building2,
  ClipboardList,
  Columns3,
  AlertCircle,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { useLogout, useMe } from "@/service-api/generated/endpoints/auth/auth";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [ensureModalMessage, setEnsureModalMessage] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const meQuery = useMe();
  const authUser = meQuery.data?.data.user;
  const userDisplayName = authUser?.name?.trim() || authUser?.email || "User";
  const userInitials = getUserInitials(userDisplayName);
  const activeItem = navGroups
    .flatMap((group) => group.items)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
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
  const logoutMutation = useLogout({
    mutation: {
      onSettled: () => {
        queryClient.clear();
        router.replace(routes.login.path);
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

  const confirmLogout = () => {
    logoutMutation.mutate({
      data: {
        refreshToken: "",
      },
    });
  };

  return (
    <div className={styles.shell}>
      <aside
        className={cn(
          styles.sidebar,
          isSidebarCollapsed && styles.sidebarCollapsed,
        )}
      >
        <Link className={styles.brand} href={routes.dashboard.path}>
          <span className={styles.brandMark} />
          <span className={styles.brandName}>sales-crm</span>
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
                    title={isSidebarCollapsed ? item.name : undefined}
                  >
                    <Icon size={16} />
                    <span className={styles.navItemLabel}>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.workspace}>
            <span className={styles.workspaceAvatar}>{userInitials}</span>
            <div className={styles.workspaceDetails}>
              <p className={styles.workspaceName}>{userDisplayName}</p>
              <p className={styles.workspaceHint}>{authUser?.email ?? "Workspace"}</p>
            </div>
            <button
              aria-label="Logout"
              className={styles.iconButton}
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            aria-label={
              isSidebarCollapsed ? "Extinde meniul lateral" : "Restrange meniul lateral"
            }
            className={styles.collapseButton}
            title={
              isSidebarCollapsed ? "Extinde meniul" : "Restrange meniul"
            }
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
            <span className={styles.collapseButtonLabel}>
              {isSidebarCollapsed ? "Extinde" : "Restrange"}
            </span>
          </button>
        </div>
      </aside>

      <div
        className={cn(
          styles.content,
          isSidebarCollapsed && styles.contentCollapsed,
        )}
      >
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {activeItem?.name ?? routes.dashboard.name}
          </h1>
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

      {isLogoutModalOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={() => {
            if (!logoutMutation.isPending) {
              setIsLogoutModalOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="logout-modal-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <LogOut size={20} />
              </div>
              <button
                aria-label="Inchide dialogul"
                className={styles.iconButton}
                disabled={logoutMutation.isPending}
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                x
              </button>
            </div>
            <div className={styles.modalCopy}>
              <p className={styles.modalEyebrow}>Logout</p>
              <h2 id="logout-modal-title">Are you sure you want to logout?</h2>
              <p>You will need to sign in again to access the CRM.</p>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.modalDangerButton}
                disabled={logoutMutation.isPending}
                type="button"
                onClick={confirmLogout}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function getUserInitials(value: string) {
  const parts = value
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts[0]?.[0] ?? "U").concat(parts[1]?.[0] ?? "").toUpperCase();
}
