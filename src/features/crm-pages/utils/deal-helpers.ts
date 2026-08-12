import type {
  DealsDealStageDto,
  DealsListItemDto,
} from "@/service-api/generated/models";

export const dealStages: DealsDealStageDto[] = [
  "NEW",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
];

export const dealStageLabels: Record<DealsDealStageDto, string> = {
  LOST: "Lost",
  NEW: "New",
  PROPOSAL: "Proposal",
  QUALIFIED: "Qualified",
  WON: "Won",
};

export const activityLabels = {
  CALL: "Call",
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  MEETING: "Meeting",
  NOTE: "Nota",
} as const;

export const taskTypeLabels = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  TO_INVESTIGATE: "De verificat",
} as const;

export function groupDealsByStage(deals: DealsListItemDto[]) {
  return dealStages.reduce<Record<DealsDealStageDto, DealsListItemDto[]>>(
    (groups, stage) => {
      groups[stage] = deals.filter((deal) => deal.stage === stage);
      return groups;
    },
    {
      LOST: [],
      NEW: [],
      PROPOSAL: [],
      QUALIFIED: [],
      WON: [],
    },
  );
}

export function getContactName(
  contact?: { firstName: string; lastName: string } | null,
) {
  return [contact?.firstName, contact?.lastName].filter(Boolean).join(" ");
}

export function formatDealValue(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return new Intl.NumberFormat("ro-RO", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(numericValue);
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function toDateInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function sortByNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function isOpenDealTask(task: { completed: boolean; status: string }) {
  return !task.completed && task.status !== "COMPLETED";
}
