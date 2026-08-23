"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

import styles from "./notifications.module.css";

type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
};

type NotificationsValue = {
  notify: (type: Toast["type"], message: string) => void;
};

const NotificationsContext = createContext<NotificationsValue>({
  notify: () => {},
});

const durations = { error: 6000, success: 3500 };

let lastId = 0;

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type: Toast["type"], message: string) => {
      lastId += 1;
      const id = lastId;

      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => dismiss(id), durations[type]);
    },
    [dismiss],
  );

  return (
    <NotificationsContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className={styles.viewport} role="status">
        {toasts.map((toast) => (
          <div className={`${styles.toast} ${styles[toast.type]}`} key={toast.id}>
            {toast.type === "success" ? (
              <CircleCheck className={styles.icon} size={18} />
            ) : (
              <CircleAlert className={styles.icon} size={18} />
            )}
            <p className={styles.message}>{toast.message}</p>
            <button
              aria-label="Inchide notificarea"
              className={styles.close}
              type="button"
              onClick={() => dismiss(toast.id)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
