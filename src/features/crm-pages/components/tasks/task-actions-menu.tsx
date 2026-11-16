"use client";

import {
  Building2,
  CheckCircle2,
  MoreHorizontal,
  StickyNote,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { routes } from "@/common/routes";
import type {
  CallOutcomeDto,
  PartialCreateCompanyRequestStatus,
  TaskListItemDto,
} from "@/service-api/generated/models";

import styles from "../index.module.css";
import { outcomeOptions } from "./task-helpers";

// --- Un singur meniu deschis in toata pagina --------------------------------

let openMenuId: string | null = null;
const listeners = new Set<() => void>();

function setOpenMenuId(id: string | null) {
  openMenuId = id;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useExclusiveMenu(id: string) {
  const currentId = useSyncExternalStore(
    subscribe,
    () => openMenuId,
    () => null,
  );

  return {
    close: () => {
      if (openMenuId === id) setOpenMenuId(null);
    },
    isOpen: currentId === id,
    toggle: () => setOpenMenuId(openMenuId === id ? null : id),
  };
}

// --- Meniul -----------------------------------------------------------------

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

/** Rezultatele de call care creeaza un deal pe server. */
const dealCreatingOutcomes: ReadonlySet<CallOutcomeDto> = new Set([
  "INTERESTED",
  "MEETING_REQUIRED",
  "DEAL_WON",
]);

const companyStatusByOutcome: Record<CallOutcomeDto, PartialCreateCompanyRequestStatus> =
  {
    DEAL_WON: "WON",
    FOLLOW_UP_LATER: "FOLLOW_UP_LATER",
    INTERESTED: "INTERESTED",
    MEETING_REQUIRED: "MEETING_REQUIRED",
    NOT_INTERESTED: "NOT_INTERESTED",
    NO_ANSWER: "CALLED_NO_ANSWER",
  };

export type TaskActionsMenuProps = {
  task: TaskListItemDto;
  onChangeCompanyStatus?: (
    task: TaskListItemDto,
    status: PartialCreateCompanyRequestStatus,
    outcome: CallOutcomeDto,
  ) => void;
  onComplete?: (task: TaskListItemDto) => void;
  onDelete?: (task: TaskListItemDto) => void;
  onOpenNotes?: (task: TaskListItemDto) => void;
};

/**
 * Meniul de actiuni al unui task. Panoul e randat in `body`, cu pozitie fixa,
 * ca sa nu fie taiat de tabel si sa nu-i adauge scrollbar. Se inchide la click
 * in afara, la Escape si la scroll.
 */
export function TaskActionsMenu({
  task,
  onChangeCompanyStatus,
  onComplete,
  onDelete,
  onOpenNotes,
}: TaskActionsMenuProps) {
  const menu = useExclusiveMenu(task.id);
  const { close, isOpen } = menu;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasNotes = Boolean(task.notes?.trim());
  const label = task.companyName ?? task.title;
  const companyHref = `${routes.companies.path}?search=${encodeURIComponent(label)}`;
  const removesDeal = task.outcome !== null && dealCreatingOutcomes.has(task.outcome);

  // Pozitia se scrie direct pe element: o masuram dupa randare, fara inca un render.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!isOpen || !trigger || !panel) return;

    const anchor = trigger.getBoundingClientRect();
    const { offsetHeight: height, offsetWidth: width } = panel;
    const fitsBelow =
      anchor.bottom + TRIGGER_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
    const top = fitsBelow
      ? anchor.bottom + TRIGGER_GAP
      : Math.max(VIEWPORT_MARGIN, anchor.top - TRIGGER_GAP - height);
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchor.right - width),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.visibility = "visible";
  }, [isOpen, isConfirmingDelete]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [close, isOpen]);

  const run = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Actiuni pentru ${label}`}
        className={styles.taskActionMenuButton}
        onClick={() => {
          setIsConfirmingDelete(false);
          menu.toggle();
        }}
        ref={triggerRef}
        title="Actiuni"
        type="button"
      >
        <MoreHorizontal />
      </button>

      {isOpen
        ? createPortal(
            <div
              aria-label={`Actiuni pentru ${label}`}
              className={styles.taskActionMenuPanel}
              ref={panelRef}
              role="menu"
            >
              {onComplete ? (
                <Link className={styles.taskActionMenuItem} href={companyHref} onClick={close}>
                  <Building2 />
                  Vezi compania
                </Link>
              ) : null}

              {!onComplete && task.dealId ? (
                <Link
                  className={`${styles.taskActionMenuItem} ${styles.taskActionMenuItemPrimary}`}
                  href={`${routes.deals.path}/${task.dealId}`}
                  onClick={close}
                >
                  <Building2 />
                  Vezi deal-ul
                </Link>
              ) : null}

              {onOpenNotes ? (
                <button
                  className={`${styles.taskActionMenuItem} ${
                    hasNotes ? styles.taskActionMenuItemActive : ""
                  }`}
                  onClick={run(() => onOpenNotes(task))}
                  type="button"
                >
                  <StickyNote />
                  {hasNotes ? "Vezi notes" : "Adauga notes"}
                </button>
              ) : null}

              {onChangeCompanyStatus && task.companyId && !onComplete ? (
                <>
                  <span className={styles.taskActionMenuLabel}>Schimba status</span>
                  {outcomeOptions.map((option) => (
                    <button
                      className={`${styles.taskActionMenuItem} ${
                        task.companyStatus === companyStatusByOutcome[option.value]
                          ? styles.taskActionMenuItemActive
                          : ""
                      }`}
                      key={option.value}
                      onClick={run(() =>
                        onChangeCompanyStatus(
                          task,
                          companyStatusByOutcome[option.value],
                          option.value,
                        ),
                      )}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </>
              ) : null}

              {onComplete ? (
                <button
                  className={styles.taskActionMenuItem}
                  onClick={run(() => onComplete(task))}
                  type="button"
                >
                  <CheckCircle2 />
                  Completeaza
                </button>
              ) : null}

              {onDelete ? (
                isConfirmingDelete ? (
                  <div className={styles.taskActionMenuConfirm}>
                    <p>
                      {removesDeal
                        ? "Task-ul si deal-ul creat din acest call dispar din aplicatie."
                        : "Task-ul dispare din aplicatie."}
                    </p>
                    <div>
                      <button
                        className={styles.taskActionMenuDanger}
                        onClick={run(() => onDelete(task))}
                        type="button"
                      >
                        Da, sterge
                      </button>
                      <button
                        className={styles.taskActionMenuItem}
                        onClick={() => setIsConfirmingDelete(false)}
                        type="button"
                      >
                        Renunta
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={`${styles.taskActionMenuItem} ${styles.taskActionMenuItemDanger}`}
                    onClick={() => setIsConfirmingDelete(true)}
                    type="button"
                  >
                    <Trash2 />
                    Sterge
                  </button>
                )
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
