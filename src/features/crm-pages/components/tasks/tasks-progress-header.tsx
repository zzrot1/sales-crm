import { LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import styles from "../index.module.css";

type TasksProgressHeaderProps = {
  completedCount: number;
  generateErrorMessage: string | null;
  hasPendingTasks: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  onGenerate: () => void;
  progressValue: number;
  totalCount: number;
};

export function TasksProgressHeader({
  completedCount,
  generateErrorMessage,
  hasPendingTasks,
  isGenerating,
  isLoading,
  onGenerate,
  progressValue,
  totalCount,
}: TasksProgressHeaderProps) {
  return (
    <section className={styles.tasksHeader}>
      <div className={styles.tasksHeaderCopy}>
        <p className={styles.eyebrow}>Activitate</p>
        <h2 className={styles.title}>Task-uri</h2>
        <p className={styles.description}>
          {completedCount} din {totalCount} task-uri completate azi
        </p>
      </div>

      <div className={styles.dailyProgressCard}>
        <div className={styles.dailyProgressTop}>
          <div>
            <span className={styles.progressLabel}>Progres zilnic</span>
            <strong>{progressValue}%</strong>
          </div>
          <Button
            className={styles.generateTasksButton}
            disabled={hasPendingTasks || isLoading || isGenerating}
            type="button"
            onClick={onGenerate}
          >
            {isGenerating ? <LoaderCircle className={styles.spinner} /> : <Plus />}
            New
          </Button>
        </div>
        <div
          aria-label={`Progres zilnic ${progressValue}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={progressValue}
          className={styles.progressTrack}
          role="progressbar"
        >
          <span style={{ width: `${progressValue}%` }} />
        </div>
        {hasPendingTasks ? (
          <p className={styles.muted}>
            Butonul devine disponibil dupa ce termini task-urile pending de azi.
          </p>
        ) : null}
        {generateErrorMessage ? (
          <p className={styles.formError}>{generateErrorMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
