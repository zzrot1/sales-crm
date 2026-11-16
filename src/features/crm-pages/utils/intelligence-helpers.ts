import type { CompanySizeDto } from "@/service-api/generated/models";

const compactFormatter = new Intl.NumberFormat("ro-RO", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const countFormatter = new Intl.NumberFormat("ro-RO");
const dateFormatter = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** `8706154345` -> "8,7 mld. lei". Sumele ANAF sunt in lei intregi. */
export function formatLei(value: number | null | undefined) {
  return value === null || value === undefined
    ? "-"
    : `${compactFormatter.format(value)} lei`;
}

export function formatCount(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : countFormatter.format(value);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

export type Growth = { label: string; direction: "up" | "down" | "flat" };

/** Schimbarea fata de anul anterior. `null` cand nu avem cu ce compara. */
export function getGrowth(
  current: number | null | undefined,
  previous: number | null | undefined,
): Growth | null {
  if (current === null || current === undefined || !previous) return null;

  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);

  return {
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
    label: `${percent > 0 ? "+" : ""}${percent}%`,
  };
}

// --- Segmentele din tabel ---------------------------------------------------

export type CompanySizeFilter = CompanySizeDto | "all";

/** Pragurile sunt aplicate pe server; aici sunt doar etichetele lor. */
export const companySizeFilters: { id: CompanySizeFilter; label: string }[] = [
  { id: "small", label: "Mici · 5-10" },
  { id: "medium", label: "Medii · 11-49" },
  { id: "large", label: "Mari · 50+" },
  { id: "all", label: "Toate" },
  { id: "unknown", label: "Fara date ANAF" },
];

export type CalledFilter = "all" | "notCalled" | "called";

export const calledFilters: { id: CalledFilter; label: string }[] = [
  { id: "all", label: "Toate" },
  { id: "notCalled", label: "Nesunate" },
  { id: "called", label: "Sunate" },
];

const sizeDescriptions: Record<CompanySizeDto, string> = {
  large: "cu peste 50 de angajati",
  medium: "cu 11-49 de angajati",
  small: "cu 5-10 angajati",
  unknown: "fara date ANAF",
};

export function getEmptyCompaniesMessage(
  size: CompanySizeFilter,
  withoutDataCount: number | undefined,
) {
  if (size === "all") return "Nu exista companii importate inca.";
  if (size === "unknown") return "Toate companiile au date ANAF.";

  // Marimea vine din bilantul ANAF, deci o companie fara CUI nu apare aici.
  return withoutDataCount
    ? `Nicio companie ${sizeDescriptions[size]} deocamdata. ${withoutDataCount} companii nu au inca date ANAF: apasa "Gaseste CUI-urile".`
    : `Nicio companie ${sizeDescriptions[size]}.`;
}

// --- Ce le propun la telefon ------------------------------------------------

export type OfferSuggestion = { offer: string; reason: string };

/** Comert cu ridicata (46) si cu amanuntul (47). */
const tradeCaenPrefixes = ["46", "47"];

/**
 * O propunere de pornire, dedusa din marime, activitate si existenta unei
 * echipe IT. E o regula simpla, nu o analiza: `null` cat timp nu stim cati
 * angajati are firma.
 */
export function suggestOffer(company: {
  employees: number | null;
  hasItTeam: boolean | null;
  caenCode: string | null;
}): OfferSuggestion | null {
  const { employees, hasItTeam, caenCode } = company;

  if (employees === null) return null;

  if (hasItTeam) {
    return {
      offer: "Testare sau oameni in completarea echipei",
      reason: "Au echipa IT proprie, deci nu cauta un furnizor complet.",
    };
  }

  if (caenCode && tradeCaenPrefixes.some((prefix) => caenCode.startsWith(prefix))) {
    return {
      offer: "Magazin online sau platforma de comenzi",
      reason: "Firma de comert, fara echipa IT.",
    };
  }

  if (employees >= 50) {
    return {
      offer: "Aplicatie interna sau portal de clienti",
      reason: `${formatCount(employees)} angajati si nicio echipa IT cunoscuta.`,
    };
  }

  if (employees >= 11) {
    return {
      offer: "Aplicatie web pe procesele lor, cu mentenanta",
      reason: `${formatCount(employees)} angajati: destui cat sa lucreze in Excel si pe email.`,
    };
  }

  return {
    offer: "Site nou sau refacerea site-ului, cu mentenanta",
    reason: "Firma mica: site-ul e de obicei singurul lor produs digital.",
  };
}
