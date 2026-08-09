"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import styles from "./side-panel.module.css";

type SidePanelProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function SidePanel({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.root} role="presentation">
      <button
        aria-label="Inchide panoul"
        className={styles.backdrop}
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <aside aria-modal="true" className={styles.panel} role="dialog">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Detalii</p>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button
            aria-label="Inchide"
            className={styles.closeButton}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className={styles.content}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </aside>
    </div>,
    document.body,
  );
}
