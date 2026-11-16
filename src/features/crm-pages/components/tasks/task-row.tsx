import { Mail, Phone } from "lucide-react";

import type { CallOutcomeDto, TaskListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { TaskActionsMenu, type TaskActionsMenuProps } from "./task-actions-menu";
import { companyStatusByValue, getContactLine, outcomeByValue, typeLabels } from "./task-helpers";

type TaskRowProps = Omit<TaskActionsMenuProps, "task"> & {
  task: TaskListItemDto;
};

export function TaskRow({
  task,
  onChangeCompanyStatus,
  onComplete,
  onDelete,
  onOpenNotes,
}: TaskRowProps) {
  const menu = (
    <TaskActionsMenu
      task={task}
      onChangeCompanyStatus={onChangeCompanyStatus}
      onComplete={onComplete}
      onDelete={onDelete}
      onOpenNotes={onOpenNotes}
    />
  );

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
        <td>{menu}</td>
      ) : (
        <>
          <td>
            <OutcomeBadge companyStatus={task.companyStatus} outcome={task.outcome} />
          </td>
          <td>{menu}</td>
        </>
      )}
    </tr>
  );
}

function TaskTypeBadge({ type }: { type: string }) {
  return (
    <span className={`${styles.taskTypeBadge} ${styles[`taskType${type}`] ?? ""}`}>
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
      <span className={`${styles.outcomeBadge} ${styles.outcomeneutral}`}>
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

  return <span className={`${styles.contactMethod} ${styles.contactMethodMuted}`}>-</span>;
}
