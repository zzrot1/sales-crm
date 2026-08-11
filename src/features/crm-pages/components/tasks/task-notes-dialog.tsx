import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TaskListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { getContactLine } from "./task-helpers";

type TaskNotesDialogProps = {
  isError: boolean;
  isSaving: boolean;
  notes: string;
  onClose: () => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  task: TaskListItemDto;
};

export function TaskNotesDialog({
  isError,
  isSaving,
  notes,
  onClose,
  onNotesChange,
  onSave,
  task,
}: TaskNotesDialogProps) {
  return (
    <div className={styles.dialogOverlay} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="task-notes-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Notes task</p>
            <h3 className={styles.cardTitle} id="task-notes-title">
              {task.companyName ?? task.title}
            </h3>
            <p className={styles.muted}>{getContactLine(task)}</p>
          </div>
          <button
            aria-label="Inchide dialogul"
            className={styles.iconButton}
            disabled={isSaving}
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <label className={styles.dialogField}>
          <span>Notes</span>
          <textarea
            placeholder="Adauga observatii, follow-up sau context pentru task..."
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </label>

        {isError ? (
          <p className={styles.formError}>
            Nu am putut salva notes. Incearca din nou.
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <Button disabled={isSaving} type="button" onClick={onSave}>
            {isSaving ? <LoaderCircle className={styles.spinner} /> : null}
            Salveaza
          </Button>
        </div>
      </section>
    </div>
  );
}
