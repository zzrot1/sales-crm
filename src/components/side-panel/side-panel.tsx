"use client";

import { X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

import styles from "./side-panel.module.css";

/** Latimea implicita din CSS (31rem); sub ea panoul nu se poate strange. */
const MIN_WIDTH_PX = 496;
const KEYBOARD_STEP_PX = 32;
const DEFAULT_STORAGE_KEY = "side-panel-width";

/** Cel mult jumatate de ecran. */
const getMaxWidth = () => Math.floor(window.innerWidth / 2);

const clampWidth = (width: number) =>
  Math.min(Math.max(width, MIN_WIDTH_PX), Math.max(getMaxWidth(), MIN_WIDTH_PX));

function readStoredWidth(storageKey: string): number | null {
  if (typeof window === "undefined") return null;

  try {
    const value = Number(window.sessionStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeWidth(storageKey: string, width: number | null) {
  try {
    if (width === null) window.sessionStorage.removeItem(storageKey);
    else window.sessionStorage.setItem(storageKey, String(Math.round(width)));
  } catch {
    // Fara sessionStorage (mod privat, blocat): latimea ramane doar in pagina.
  }
}

type SidePanelProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  /** Unde se tine latimea trasa de utilizator, pe durata sesiunii. */
  storageKey?: string;
};

export function SidePanel({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
  storageKey = DEFAULT_STORAGE_KEY,
}: SidePanelProps) {
  const [width, setWidth] = useState<number | null>(() => readStoredWidth(storageKey));

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

  // Pe ecrane inguste jumatatea de ecran e sub latimea minima: nimic de tras.
  const canResize = getMaxWidth() > MIN_WIDTH_PX;
  const panelWidth = canResize && width !== null ? clampWidth(width) : null;

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    document.body.style.userSelect = "none";
    let latest = panelWidth ?? MIN_WIDTH_PX;

    const onMove = (moveEvent: PointerEvent) => {
      latest = clampWidth(window.innerWidth - moveEvent.clientX);
      setWidth(latest);
    };
    const onEnd = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onEnd);
      handle.removeEventListener("pointercancel", onEnd);
      document.body.style.userSelect = "";
      storeWidth(storageKey, latest);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onEnd);
    handle.addEventListener("pointercancel", onEnd);
  };

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: KEYBOARD_STEP_PX, ArrowRight: -KEYBOARD_STEP_PX }[event.key];
    if (!step) return;

    event.preventDefault();
    const next = clampWidth((panelWidth ?? MIN_WIDTH_PX) + step);
    setWidth(next);
    storeWidth(storageKey, next);
  };

  const resetWidth = () => {
    setWidth(null);
    storeWidth(storageKey, null);
  };

  return createPortal(
    <div className={styles.root} role="presentation">
      <button
        aria-label="Inchide panoul"
        className={styles.backdrop}
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <aside
        aria-modal="true"
        className={styles.panel}
        role="dialog"
        style={panelWidth ? { width: `${panelWidth}px` } : undefined}
      >
        {canResize ? (
          <div
            aria-label="Latimea panoului (trage, sageti stanga/dreapta, dublu click pentru resetare)"
            aria-orientation="vertical"
            aria-valuemax={getMaxWidth()}
            aria-valuemin={MIN_WIDTH_PX}
            aria-valuenow={panelWidth ?? MIN_WIDTH_PX}
            className={styles.resizeHandle}
            onDoubleClick={resetWidth}
            onKeyDown={resizeWithKeyboard}
            onPointerDown={startResize}
            role="separator"
            tabIndex={0}
            title="Trage ca sa maresti panoul. Dublu click: latimea initiala."
          />
        ) : null}
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
