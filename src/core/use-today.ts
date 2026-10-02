"use client";

import { useSyncExternalStore } from "react";

/** `YYYY-MM-DD` in ora locala — `toISOString` ar muta ziua dupa fusul orar. */
function toLocalIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const getToday = () => toLocalIsoDate(new Date());
const getServerToday = () => null;

/**
 * Ziua de azi a browserului, ca `YYYY-MM-DD`. Pe server e `null`: acolo nu stim
 * fusul orar al utilizatorului, iar o zi diferita ar strica hidratarea. Se
 * reciteste cand fereastra revine in fata, ca un tab lasat peste noapte sa nu
 * ramana pe ziua de ieri.
 */
export function useToday() {
  return useSyncExternalStore(subscribe, getToday, getServerToday);
}
