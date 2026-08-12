import { useState } from "react";

import styles from "../index.module.css";

export function MarkDealLostButton({
  isSaving,
  onConfirm,
}: {
  isSaving: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <button
        className={styles.ghostButton}
        disabled={isSaving}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Marcheaza ca pierdut
      </button>

      {isOpen ? (
        <div
          className={styles.dialogOverlay}
          role="presentation"
          onMouseDown={() => {
            if (!isSaving) setIsOpen(false);
          }}
        >
          <section
            aria-labelledby="deal-lost-title"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>Deal pierdut</p>
                <h3 className={styles.cardTitle} id="deal-lost-title">
                  Motiv pierdere
                </h3>
              </div>
              <button
                aria-label="Inchide dialogul"
                className={styles.iconButton}
                disabled={isSaving}
                type="button"
                onClick={() => setIsOpen(false)}
              >
                x
              </button>
            </div>
            <label className={styles.dialogField}>
              <span>Motiv</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className={styles.dialogActions}>
              <button
                className={styles.button}
                disabled={isSaving || !reason.trim()}
                type="button"
                onClick={() => {
                  onConfirm(reason.trim());
                  setIsOpen(false);
                  setReason("");
                }}
              >
                Confirma
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
