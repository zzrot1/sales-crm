import { CheckCircle2, Mail, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CallOutcomeDto, TaskListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { getContactLine, outcomeByValue, typeLabels } from "./task-helpers";

type TaskRowProps = {
  task: TaskListItemDto;
  onComplete?: (task: TaskListItemDto) => void;
};

export function TaskRow({ task, onComplete }: TaskRowProps) {
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
      <td>
        {onComplete ? (
          <Button
            aria-label={`Completeaza task-ul pentru ${task.companyName ?? task.title}`}
            className={styles.completeTaskButton}
            size="icon"
            type="button"
            onClick={() => onComplete(task)}
          >
            <CheckCircle2 />
          </Button>
        ) : (
          <OutcomeBadge outcome={task.outcome} />
        )}
      </td>
    </tr>
  );
}

function TaskTypeBadge({ type }: { type: string }) {
  return <span className={styles.taskTypeBadge}>{typeLabels[type] ?? type}</span>;
}

function OutcomeBadge({ outcome }: { outcome: CallOutcomeDto | null }) {
  const option = outcome ? outcomeByValue[outcome] : undefined;

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
