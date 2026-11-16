import type { CompanyDtoStatus } from "@/service-api/generated/models";

export const pageSizeOptions = [10, 25, 50, 100];

export const companyStatusLabels: Record<CompanyDtoStatus, string> = {
  CALLED_NO_ANSWER: "Sunat - fara raspuns",
  DEAL_IN_PROGRESS: "Deal in progres",
  FOLLOW_UP_LATER: "Follow-up",
  INTERESTED: "Interesat",
  LOST: "Pierdut",
  MEETING_REQUIRED: "Necesita meeting",
  MEETING_SCHEDULED: "Meeting programat",
  NEW: "Nou",
  NOT_INTERESTED: "Neinteresat",
  TO_CALL: "De sunat",
  WON: "Castigat",
};

export const companyStatusTones: Record<CompanyDtoStatus, string> = {
  CALLED_NO_ANSWER: "statusToneYellow",
  DEAL_IN_PROGRESS: "statusToneBlue",
  FOLLOW_UP_LATER: "statusToneYellow",
  INTERESTED: "statusToneGreen",
  LOST: "statusToneRed",
  MEETING_REQUIRED: "statusToneBlue",
  MEETING_SCHEDULED: "statusToneBlue",
  NEW: "statusToneNeutral",
  NOT_INTERESTED: "statusToneRed",
  TO_CALL: "statusToneNeutral",
  WON: "statusToneGreen",
};

export function fallback(value?: string | null) {
  return value?.trim() || "-";
}

/** "Nu" e galben: fara echipa IT proprie, deci un client posibil. */
export function getItTeamTone(value: boolean | null) {
  if (value === true) return "statusToneGreen";
  if (value === false) return "statusToneYellow";
  return "statusToneNeutral";
}

export function formatItTeam(value: boolean | null) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  return "Necunoscut";
}

export function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Industriile vin din import ca text liber ("Constructii civile, municipale si
 * infrastructura"), aproape una per companie. Pentru filtrare le strangem in
 * cateva grupe; textul original ramane neatins pe companie.
 *
 * Regulile se aplica in ordine, prima care se potriveste castiga. Ordinea
 * conteaza: "Dezvoltare de proprietati logistice" e imobiliar, nu transport.
 */
const industryGroupRules: [group: string, pattern: RegExp][] = [
  [
    "Agricultura si alimentatie",
    /agri|apicult|silvicult|vinific|producator de vin|panificat|alimentar/,
  ],
  [
    "Productie si energie",
    /^(productie|producator)|chimie|textile|mobilier|tipografi|mestesug|frigorific|energie/,
  ],
  ["Constructii si imobiliare", /imobiliar|proprietati/],
  ["Transport, logistica si auto", /transport|logistic|curierat|freight|^auto/],
  ["Comert si eCommerce", /ecommerce|retail|distribu|librarie/],
  [
    "Sanatate si frumusete",
    /sanatate|stomatolog|clinica|radiolog|optica|farmaci|veterinar|psiholog|beauty|coafor|cosmetic/,
  ],
  [
    "HoReCa, turism si timp liber",
    /horeca|restaurant|hotel|turism|evenimente|divertisment|sport|muzica/,
  ],
  [
    "Constructii si imobiliare",
    /construc|arhitectur|instalat|facility|infrastructura|sisteme de acces|gradinarit|curatenie/,
  ],
  [
    "Servicii profesionale",
    /avocat|juridic|contabil|consultant|marketing|finante|recrut|paza|foto|educat|inchirieri|funerare/,
  ],
];

const otherIndustryGroup = "Altele";

export const industryGroups = [
  ...new Set(industryGroupRules.map(([group]) => group)),
  otherIndustryGroup,
];

export function getIndustryGroup(industry?: string | null) {
  const normalized = (industry ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (!normalized) return null;

  return (
    industryGroupRules.find(([, pattern]) => pattern.test(normalized))?.[0] ??
    otherIndustryGroup
  );
}
