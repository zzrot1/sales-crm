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

export function formatItTeam(value: boolean | null) {
  if (value === true) return "Da";
  if (value === false) return "Nu";
  return "Necunoscut";
}

export function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
