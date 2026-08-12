import type {
  CallOutcomeDto,
  CompanyStatusDto,
  TaskListItemDto,
} from "@/service-api/generated/models";

export type OutcomeOption = {
  label: string;
  value: CallOutcomeDto;
  tone: "green" | "yellow" | "red" | "blue";
};

export const outcomeOptions: OutcomeOption[] = [
  { label: "Nu a raspuns", value: "NO_ANSWER", tone: "yellow" },
  { label: "Interesat", value: "INTERESTED", tone: "green" },
  { label: "Nu e interesat", value: "NOT_INTERESTED", tone: "red" },
  { label: "Necesita intalnire", value: "MEETING_REQUIRED", tone: "blue" },
  { label: "Deal castigat", value: "DEAL_WON", tone: "green" },
  { label: "Revin mai tarziu", value: "FOLLOW_UP_LATER", tone: "yellow" },
];

export const outcomeByValue = outcomeOptions.reduce<Record<string, OutcomeOption>>(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {},
);

export const companyStatusByValue: Record<
  CompanyStatusDto,
  { label: string; tone: OutcomeOption["tone"] | "neutral" }
> = {
  CALLED_NO_ANSWER: { label: "Nu a raspuns", tone: "yellow" },
  DEAL_IN_PROGRESS: { label: "Deal in progres", tone: "blue" },
  FOLLOW_UP_LATER: { label: "Revin mai tarziu", tone: "yellow" },
  INTERESTED: { label: "Interesat", tone: "green" },
  LOST: { label: "Pierdut", tone: "red" },
  MEETING_REQUIRED: { label: "Necesita intalnire", tone: "blue" },
  MEETING_SCHEDULED: { label: "Meeting programat", tone: "blue" },
  NEW: { label: "Nou", tone: "neutral" },
  NOT_INTERESTED: { label: "Nu e interesat", tone: "red" },
  TO_CALL: { label: "De sunat", tone: "neutral" },
  WON: { label: "Deal castigat", tone: "green" },
};

export const typeLabels: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  TO_INVESTIGATE: "De verificat",
};

export const emptyTasks: TaskListItemDto[] = [];

export function getLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isCompletedToday(task: TaskListItemDto) {
  return Boolean(
    task.completedAt &&
      getLocalDateKey(task.completedAt) === getLocalDateKey(new Date()),
  );
}

export function isTaskCompleted(task: TaskListItemDto) {
  return task.completed || task.status === "COMPLETED" || Boolean(task.completedAt);
}

export function isTaskDueToday(task: TaskListItemDto) {
  return Boolean(
    task.dueDate && getLocalDateKey(task.dueDate) === getLocalDateKey(new Date()),
  );
}

export function isCompletedTodayTask(
  task: TaskListItemDto,
  todaysTaskIds: Set<string>,
) {
  return (
    isTaskCompleted(task) &&
    (isCompletedToday(task) || isTaskDueToday(task) || todaysTaskIds.has(task.id))
  );
}

export function getContactLine(task: TaskListItemDto) {
  if (!task.primaryContactName && !task.primaryContactJobTitle) {
    return "Contact principal necompletat";
  }

  return [task.primaryContactName, task.primaryContactJobTitle]
    .filter(Boolean)
    .join(" · ");
}

export async function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    error.response instanceof Response
  ) {
    try {
      const body = await error.response.json();

      if (typeof body?.message === "string") {
        return body.message;
      }
    } catch {
      return "Nu am putut crea urmatoarele task-uri. Incearca din nou.";
    }
  }

  return "Nu am putut crea urmatoarele task-uri. Incearca din nou.";
}
