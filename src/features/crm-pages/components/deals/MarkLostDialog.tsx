import { useState } from "react";

import type { DealsListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";

export function MarkLostDialog({
  deal,
  isSaving,
  onClose,
  onConfirm,
}: {
  deal: DealsListItemDto | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!deal) {
    return null;
  }

  return (
    <div
      className={styles.dialogOverlay}
      role="presentation"
      onMouseDown={() => {
        if (!isSaving) onClose();
      }}
    >
      <section
        aria-labelledby="mark-lost-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Deal pierdut</p>
            <h3 className={styles.cardTitle} id="mark-lost-title">
              Marcheaza {deal.title} ca pierdut
            </h3>
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
          <span>Motiv</span>
          <textarea
            value={reason}
            placeholder="De ce s-a pierdut deal-ul?"
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <div className={styles.dialogActions}>
          <button
            className={styles.button}
            disabled={isSaving || !reason.trim()}
            type="button"
            onClick={() => onConfirm(reason)}
          >
            Confirma
          </button>
        </div>
      </section>
    </div>
  );
}
