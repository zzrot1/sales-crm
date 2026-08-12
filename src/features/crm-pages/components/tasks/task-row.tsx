import {
  Building2,
  CheckCircle2,
  Mail,
  MoreHorizontal,
  Phone,
  StickyNote,
} from "lucide-react";
import Link from "next/link";

import { routes } from "@/common/routes";
import type {
  CallOutcomeDto,
  PartialCreateCompanyRequestStatus,
  TaskListItemDto,
} from "@/service-api/generated/models";

import styles from "../index.module.css";
import {
  companyStatusByValue,
  getContactLine,
  outcomeByValue,
  outcomeOptions,
  typeLabels,
} from "./task-helpers";

type TaskRowProps = {
  task: TaskListItemDto;
  onChangeCompanyStatus?: (
    task: TaskListItemDto,
    status: PartialCreateCompanyRequestStatus,
    outcome: CallOutcomeDto,
  ) => void;
  onComplete?: (task: TaskListItemDto) => void;
  onOpenNotes?: (task: TaskListItemDto) => void;
};

const companyStatusByOutcome: Record<
  CallOutcomeDto,
  PartialCreateCompanyRequestStatus
> = {
  DEAL_WON: "WON",
  FOLLOW_UP_LATER: "FOLLOW_UP_LATER",
  INTERESTED: "INTERESTED",
  MEETING_REQUIRED: "MEETING_REQUIRED",
  NOT_INTERESTED: "NOT_INTERESTED",
  NO_ANSWER: "CALLED_NO_ANSWER",
};

export function TaskRow({
  task,
  onChangeCompanyStatus,
  onComplete,
  onOpenNotes,
}: TaskRowProps) {
  return (
    <tr>
      <td>
        <div className={styles.taskCompany}>
          <span>{task.companyName ?? "Companie fara nume"}</span>
          <small>{task.title}</small>
        </div>
      </td>
      <td>
        <div className={styles.taskContact}>
          <span>{task.primaryContactName ?? "Contact necunoscut"}</span>
          <small>{task.primaryContactJobTitle ?? getContactLine(task)}</small>
        </div>
      </td>
      <td>
        <ContactMethod task={task} />
      </td>
      <td>
        <TaskTypeBadge type={task.type} />
      </td>
      {onComplete ? (
        <td>
          <TaskActionsMenu
            task={task}
            onChangeCompanyStatus={onChangeCompanyStatus}
            onComplete={onComplete}
            onOpenNotes={onOpenNotes}
          />
        </td>
      ) : (
        <>
          <td>
            <OutcomeBadge
              companyStatus={task.companyStatus}
              outcome={task.outcome}
            />
          </td>
          <td>
            <TaskActionsMenu
              task={task}
              onChangeCompanyStatus={onChangeCompanyStatus}
              onOpenNotes={onOpenNotes}
            />
          </td>
        </>
      )}
    </tr>
  );
}

function TaskActionsMenu({
  task,
  onChangeCompanyStatus,
  onComplete,
  onOpenNotes,
}: {
  task: TaskListItemDto;
  onChangeCompanyStatus?: (
    task: TaskListItemDto,
    status: PartialCreateCompanyRequestStatus,
    outcome: CallOutcomeDto,
  ) => void;
  onComplete?: (task: TaskListItemDto) => void;
  onOpenNotes?: (task: TaskListItemDto) => void;
}) {
  const hasNotes = Boolean(task.notes?.trim());
  const companyHref = `${routes.companies.path}?search=${encodeURIComponent(
    task.companyName ?? task.title,
  )}`;

  return (
    <details className={styles.taskActionMenu}>
      <summary
        aria-label={`Actiuni pentru ${task.companyName ?? task.title}`}
        className={styles.taskActionMenuButton}
        title="Actiuni"
      >
        <MoreHorizontal />
      </summary>
      <div className={styles.taskActionMenuPanel}>
        {onComplete ? (
          <Link className={styles.taskActionMenuItem} href={companyHref}>
            <Building2 />
            Vezi compania
          </Link>
        ) : null}

        {!onComplete && task.dealId ? (
          <Link
            className={`${styles.taskActionMenuItem} ${styles.taskActionMenuItemPrimary}`}
            href={`${routes.deals.path}/${task.dealId}`}
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
            type="button"
            onClick={() => onOpenNotes(task)}
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
                type="button"
                onClick={() =>
                  onChangeCompanyStatus(
                    task,
                    companyStatusByOutcome[option.value],
                    option.value,
                  )
                }
              >
                {option.label}
              </button>
            ))}
          </>
        ) : null}

        {onComplete ? (
          <button
            className={styles.taskActionMenuItem}
            type="button"
            onClick={() => onComplete(task)}
          >
            <CheckCircle2 />
            Completeaza
          </button>
        ) : null}
      </div>
    </details>
  );
}

function TaskTypeBadge({ type }: { type: string }) {
  const isInvestigation = type === "TO_INVESTIGATE";

  return (
    <span
      className={`${styles.taskTypeBadge} ${
        isInvestigation ? styles.taskTypeBadgeInvestigation : ""
      }`}
    >
      {typeLabels[type] ?? type}
    </span>
  );
}

function OutcomeBadge({
  companyStatus,
  outcome,
}: {
  companyStatus: TaskListItemDto["companyStatus"];
  outcome: CallOutcomeDto | null;
}) {
  const option =
    (companyStatus ? companyStatusByValue[companyStatus] : undefined) ??
    (outcome ? outcomeByValue[outcome] : undefined);

  if (!option) {
    return (
      <span className={`${styles.outcomeBadge} ${styles.outcomeNeutral}`}>
        Fara outcome
      </span>
    );
  }

  return (
    <span className={`${styles.outcomeBadge} ${styles[`outcome${option.tone}`]}`}>
      {option.label}
    </span>
  );
}

function ContactMethod({ task }: { task: TaskListItemDto }) {
  if (task.primaryContactPhone) {
    return (
      <a className={styles.contactMethod} href={`tel:${task.primaryContactPhone}`}>
        <Phone />
        {task.primaryContactPhone}
      </a>
    );
  }

  if (task.primaryContactEmail) {
    return (
      <a className={styles.contactMethod} href={`mailto:${task.primaryContactEmail}`}>
        <Mail />
        {task.primaryContactEmail}
      </a>
    );
  }

  return (
    <span className={`${styles.contactMethod} ${styles.contactMethodMuted}`}>
      -
    </span>
  );
}
