import { LoaderCircle } from "lucide-react";

import type { CallOutcomeDto, TaskListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { getContactLine, outcomeOptions } from "./task-helpers";

type CompleteTaskDialogProps = {
  isError: boolean;
  isSaving: boolean;
  notes: string;
  onClose: () => void;
  onNotesChange: (notes: string) => void;
  onOutcomeChange: (outcome: CallOutcomeDto) => void;
  onSave: () => void;
  outcome: CallOutcomeDto;
  task: TaskListItemDto;
};

export function CompleteTaskDialog({
  isError,
  isSaving,
  notes,
  onClose,
  onNotesChange,
  onOutcomeChange,
  onSave,
  outcome,
  task,
}: CompleteTaskDialogProps) {
  return (
    <div className={styles.dialogOverlay} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="complete-task-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Completeaza call</p>
            <h3 className={styles.cardTitle} id="complete-task-title">
              {task.companyName ?? task.title}
            </h3>
            <p className={styles.muted}>{getContactLine(task)}</p>
          </div>
          <button
            aria-label="Inchide dialogul"
            className={styles.iconButton}
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <label className={styles.dialogField}>
          <span>Outcome</span>
          <select
            value={outcome}
            onChange={(event) => onOutcomeChange(event.target.value as CallOutcomeDto)}
          >
            {outcomeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.dialogField}>
          <span>Notes</span>
          <textarea
            placeholder="Adauga detalii utile pentru urmatorul pas..."
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </label>

        {isError ? (
          <p className={styles.formError}>
            Nu am putut salva completarea. Incearca din nou.
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <button
            className={styles.button}
            disabled={isSaving}
            type="button"
            onClick={onSave}
          >
            {isSaving ? <LoaderCircle className={styles.spinner} size={16} /> : null}
            Salveaza
          </button>
        </div>
      </section>
    </div>
  );
}
