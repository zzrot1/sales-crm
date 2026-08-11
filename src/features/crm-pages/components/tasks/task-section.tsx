import type { ReactNode } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import type { TaskListItemDto } from "@/service-api/generated/models";
import type { PartialCreateCompanyRequestStatus } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { TaskRow } from "./task-row";

type TaskSectionProps = {
  actionHeader: string;
  emptyIcon?: ReactNode;
  emptyMessage: string;
  icon: ReactNode;
  isLoading: boolean;
  onChangeCompanyStatus?: (
    task: TaskListItemDto,
    status: PartialCreateCompanyRequestStatus,
  ) => void;
  onComplete?: (task: TaskListItemDto) => void;
  onOpenNotes?: (task: TaskListItemDto) => void;
  subtitle: string;
  tasks: TaskListItemDto[];
  title: string;
};

export function TaskSection({
  actionHeader,
  emptyIcon,
  emptyMessage,
  icon,
  isLoading,
  onChangeCompanyStatus,
  onComplete,
  onOpenNotes,
  subtitle,
  tasks,
  title,
}: TaskSectionProps) {
  return (
    <article className={styles.taskSectionCard}>
      <div className={styles.taskSectionHeader}>
        <div>
          <p className={styles.eyebrow}>{title}</p>
          <h3 className={styles.cardTitle}>{subtitle}</h3>
        </div>
        {icon}
      </div>
      <div className={styles.taskTableWrap}>
        <table className={styles.taskTable}>
          <thead>
            <tr>
              <th>Companie</th>
              <th>Contact</th>
              <th>Contactare</th>
              <th>Tip</th>
              <th>{actionHeader}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <EmptyRow icon={<LoaderCircle className={styles.spinner} />} message="Se incarca task-urile..." />
            ) : tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onChangeCompanyStatus={onChangeCompanyStatus}
                  onComplete={onComplete}
                  onOpenNotes={onOpenNotes}
                />
              ))
            ) : (
              <EmptyRow icon={emptyIcon ?? <CheckCircle2 />} message={emptyMessage} />
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function EmptyRow({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <tr>
      <td className={styles.taskEmptyCell} colSpan={5}>
        <span className={styles.taskEmptyState}>
          {icon}
          {message}
        </span>
      </td>
    </tr>
  );
}
