import { LoaderCircle } from "lucide-react";

import type { CompanyListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";

export type ContactForm = {
  email: string;
  jobTitle: string;
  phone: string;
};

export function EditContactDialog({
  company,
  contactForm,
  isError,
  isSaving,
  onClose,
  onFormChange,
  onSave,
}: {
  company: CompanyListItemDto;
  contactForm: ContactForm;
  isError: boolean;
  isSaving: boolean;
  onClose: () => void;
  onFormChange: (contactForm: ContactForm) => void;
  onSave: () => void;
}) {
  const updateField = (field: keyof ContactForm, value: string) => {
    onFormChange({
      ...contactForm,
      [field]: value,
    });
  };

  return (
    <div
      className={styles.dialogOverlay}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        aria-labelledby="edit-contact-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogHeader}>
          <div>
            <p className={styles.eyebrow}>Contact principal</p>
            <h3 className={styles.cardTitle} id="edit-contact-title">
              Editeaza {company.name}
            </h3>
            <p className={styles.muted}>
              Actualizeaza datele folosite in task-uri si in tabel.
            </p>
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

        {!company.primaryContactId ? (
          <p className={styles.formError}>
            Compania nu are contact principal de editat.
          </p>
        ) : null}

        <label className={styles.dialogField}>
          <span>Email</span>
          <input
            value={contactForm.email}
            placeholder="contact@companie.ro"
            onChange={(event) => updateField("email", event.target.value)}
          />
        </label>

        <label className={styles.dialogField}>
          <span>Telefon</span>
          <input
            value={contactForm.phone}
            placeholder="+40..."
            onChange={(event) => updateField("phone", event.target.value)}
          />
        </label>

        <label className={styles.dialogField}>
          <span>Functie</span>
          <input
            value={contactForm.jobTitle}
            placeholder="CEO, Founder, Director..."
            onChange={(event) => updateField("jobTitle", event.target.value)}
          />
        </label>

        {isError ? (
          <p className={styles.formError}>
            Nu am putut salva contactul. Incearca din nou.
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <button
            className={styles.button}
            disabled={!company.primaryContactId || isSaving}
            type="button"
            onClick={onSave}
          >
            {isSaving ? (
              <LoaderCircle className={styles.spinner} size={16} />
            ) : null}
            Salveaza
          </button>
        </div>
      </section>
    </div>
  );
}
