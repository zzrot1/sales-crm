"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Phone,
  PhoneCall,
  Plus,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  getGetTasksQueryKey,
  getGetTodaysTasksQueryKey,
  useCompleteCallTask,
  useGenerateDailyCallTasks,
  useGetTodaysTasks,
} from "@/service-api/generated/endpoints/tasks/tasks";
import { getGetCompaniesQueryKey } from "@/service-api/generated/endpoints/companies/companies";
import type { CallOutcomeDto, TaskListItemDto } from "@/service-api/generated/models";

import styles from "./index.module.css";

type OutcomeOption = {
  label: string;
  value: CallOutcomeDto;
  tone: "green" | "yellow" | "red" | "blue";
};

const outcomeOptions: OutcomeOption[] = [
  { label: "Nu a răspuns", value: "NO_ANSWER", tone: "yellow" },
  { label: "Interesat", value: "INTERESTED", tone: "green" },
  { label: "Nu e interesat", value: "NOT_INTERESTED", tone: "red" },
  { label: "Necesită întâlnire", value: "MEETING_REQUIRED", tone: "blue" },
  { label: "Deal câștigat", value: "DEAL_WON", tone: "green" },
  { label: "Revin mai târziu", value: "FOLLOW_UP_LATER", tone: "yellow" },
];

const outcomeByValue = outcomeOptions.reduce<Record<string, OutcomeOption>>(
  (acc, option) => {
    acc[option.value] = option;
    return acc;
  },
  {},
);

const typeLabels: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
};

const emptyTasks: TaskListItemDto[] = [];

function getLocalDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isCompletedToday(task: TaskListItemDto) {
  return Boolean(task.completedAt && getLocalDateKey(task.completedAt) === getLocalDateKey(new Date()));
}

function getContactLine(task: TaskListItemDto) {
  if (!task.primaryContactName && !task.primaryContactJobTitle) {
    return "Contact principal necompletat";
  }

  return [task.primaryContactName, task.primaryContactJobTitle].filter(Boolean).join(" · ");
}

function TaskTypeBadge({ type }: { type: string }) {
  return <span className={styles.taskTypeBadge}>{typeLabels[type] ?? type}</span>;
}

function OutcomeBadge({ outcome }: { outcome: CallOutcomeDto | null }) {
  const option = outcome ? outcomeByValue[outcome] : undefined;

  if (!option) {
    return <span className={`${styles.outcomeBadge} ${styles.outcomeNeutral}`}>Fără outcome</span>;
  }

  return (
    <span className={`${styles.outcomeBadge} ${styles[`outcome${option.tone}`]}`}>
      {option.label}
    </span>
  );
}

function ContactMethod({ task }: { task: TaskListItemDto }) {
  if (task.primaryContactPhone) {
    return (
      <a className={styles.contactMethod} href={`tel:${task.primaryContactPhone}`}>
        <Phone />
        {task.primaryContactPhone}
      </a>
    );
  }

  if (task.primaryContactEmail) {
    return (
      <a className={styles.contactMethod} href={`mailto:${task.primaryContactEmail}`}>
        <Mail />
        {task.primaryContactEmail}
      </a>
    );
  }

  return (
    <span className={`${styles.contactMethod} ${styles.contactMethodMuted}`}>
      -
    </span>
  );
}

function TaskRow({
  task,
  onComplete,
}: {
  task: TaskListItemDto;
  onComplete?: (task: TaskListItemDto) => void;
}) {
  return (
    <tr>
      <td>
        <div className={styles.taskCompany}>
          <span>{task.companyName ?? "Companie fără nume"}</span>
          <small>{task.title}</small>
        </div>
      </td>
      <td>
        <div className={styles.taskContact}>
          <span>{task.primaryContactName ?? "Contact necunoscut"}</span>
          <small>{task.primaryContactJobTitle ?? getContactLine(task)}</small>
        </div>
      </td>
      <td>
        <ContactMethod task={task} />
      </td>
      <td>
        <TaskTypeBadge type={task.type} />
      </td>
      <td>
        {onComplete ? (
          <Button
            className={styles.completeTaskButton}
            size="icon"
            type="button"
            aria-label={`Completează task-ul pentru ${task.companyName ?? task.title}`}
            onClick={() => onComplete(task)}
          >
            <CheckCircle2 />
          </Button>
        ) : (
          <OutcomeBadge outcome={task.outcome} />
        )}
      </td>
    </tr>
  );
}

export function TasksPage() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<TaskListItemDto | null>(null);
  const [outcome, setOutcome] = useState<CallOutcomeDto>("NO_ANSWER");
  const [notes, setNotes] = useState("");
  const [generateErrorMessage, setGenerateErrorMessage] = useState<string | null>(null);

  const todaysTasksQuery = useGetTodaysTasks();
  const tasks = todaysTasksQuery.data?.data ?? emptyTasks;

  const { pendingTasks, completedTodayTasks, completedCount, progressValue } = useMemo(() => {
    const pending = tasks.filter((task) => !task.completedAt);
    const completedToday = tasks.filter(isCompletedToday);
    const completed = tasks.filter((task) => Boolean(task.completedAt)).length;

    return {
      pendingTasks: pending,
      completedTodayTasks: completedToday,
      completedCount: completed,
      progressValue: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const hasPendingTasks = pendingTasks.length > 0;

  const refreshTasks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetTodaysTasksQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }),
    ]);
  };

  const generateTasksMutation = useGenerateDailyCallTasks({
    mutation: {
      onSuccess: async () => {
        setGenerateErrorMessage(null);
        await refreshTasks();
      },
      onError: (error) => {
        void getApiErrorMessage(error).then((message) => setGenerateErrorMessage(message));
      },
    },
  });

  const completeTaskMutation = useCompleteCallTask({
    mutation: {
      onSuccess: async () => {
        await refreshTasks();
        setSelectedTask(null);
        setNotes("");
        setOutcome("NO_ANSWER");
      },
    },
  });

  const openCompleteDialog = (task: TaskListItemDto) => {
    setSelectedTask(task);
    setOutcome("NO_ANSWER");
    setNotes("");
  };

  const closeCompleteDialog = () => {
    if (completeTaskMutation.isPending) {
      return;
    }

    setSelectedTask(null);
  };

  const saveCompletion = () => {
    if (!selectedTask) {
      return;
    }

    completeTaskMutation.mutate({
      taskId: selectedTask.id,
      data: {
        notes: notes.trim() || null,
        outcome,
      },
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.tasksHeader}>
        <div className={styles.tasksHeaderCopy}>
          <p className={styles.eyebrow}>Activitate</p>
          <h2 className={styles.title}>Task-uri</h2>
          <p className={styles.description}>
            {completedCount} din {tasks.length} task-uri completate azi
          </p>
        </div>

        <div className={styles.dailyProgressCard}>
          <div className={styles.dailyProgressTop}>
            <div>
              <span className={styles.progressLabel}>Progres zilnic</span>
              <strong>{progressValue}%</strong>
            </div>
            <Button
              className={styles.generateTasksButton}
              disabled={
                hasPendingTasks || todaysTasksQuery.isLoading || generateTasksMutation.isPending
              }
              type="button"
              onClick={() => generateTasksMutation.mutate({ data: { limit: 10 } })}
            >
              {generateTasksMutation.isPending ? (
                <LoaderCircle className={styles.spinner} />
              ) : (
                <Plus />
              )}
              Generează task-uri noi
            </Button>
          </div>
          <div
            aria-label={`Progres zilnic ${progressValue}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progressValue}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span style={{ width: `${progressValue}%` }} />
          </div>
          {hasPendingTasks ? (
            <p className={styles.muted}>
              Butonul devine disponibil după ce termini task-urile pending de azi.
            </p>
          ) : null}
          {generateErrorMessage ? (
            <p className={styles.formError}>{generateErrorMessage}</p>
          ) : null}
        </div>
      </section>

      <section className={styles.taskSections}>
        <article className={styles.taskSectionCard}>
          <div className={styles.taskSectionHeader}>
            <div>
              <p className={styles.eyebrow}>De făcut</p>
              <h3 className={styles.cardTitle}>{pendingTasks.length} task-uri pending</h3>
            </div>
            <PhoneCall />
          </div>
          <div className={styles.taskTableWrap}>
            <table className={styles.taskTable}>
              <thead>
                <tr>
                  <th>Companie</th>
                  <th>Contact</th>
                  <th>Contactare</th>
                  <th>Tip</th>
                  <th>Acțiune</th>
                </tr>
              </thead>
              <tbody>
                {todaysTasksQuery.isLoading ? (
                  <tr>
                    <td className={styles.taskEmptyCell} colSpan={5}>
                      <span className={styles.taskEmptyState}>
                        <LoaderCircle className={styles.spinner} />
                        Se încarcă task-urile...
                      </span>
                    </td>
                  </tr>
                ) : pendingTasks.length > 0 ? (
                  pendingTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onComplete={openCompleteDialog} />
                  ))
                ) : (
                  <tr>
                    <td className={styles.taskEmptyCell} colSpan={5}>
                      <span className={styles.taskEmptyState}>
                        <CheckCircle2 />
                        Nu mai ai task-uri pending pentru azi.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className={styles.taskSectionCard}>
          <div className={styles.taskSectionHeader}>
            <div>
              <p className={styles.eyebrow}>Completate azi</p>
              <h3 className={styles.cardTitle}>{completedTodayTasks.length} task-uri închise</h3>
            </div>
            <CalendarClock />
          </div>
          <div className={styles.taskTableWrap}>
            <table className={styles.taskTable}>
              <thead>
                <tr>
                  <th>Companie</th>
                  <th>Contact</th>
                  <th>Contactare</th>
                  <th>Tip</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {todaysTasksQuery.isLoading ? (
                  <tr>
                    <td className={styles.taskEmptyCell} colSpan={5}>
                      <span className={styles.taskEmptyState}>
                        <LoaderCircle className={styles.spinner} />
                        Se încarcă task-urile...
                      </span>
                    </td>
                  </tr>
                ) : completedTodayTasks.length > 0 ? (
                  completedTodayTasks.map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <tr>
                    <td className={styles.taskEmptyCell} colSpan={5}>
                      <span className={styles.taskEmptyState}>
                        <CalendarClock />
                        Încă nu ai task-uri completate azi.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {selectedTask ? (
        <div className={styles.dialogOverlay} role="presentation" onMouseDown={closeCompleteDialog}>
          <section
            aria-labelledby="complete-task-title"
            aria-modal="true"
            className={styles.dialog}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>Completează call</p>
                <h3 className={styles.cardTitle} id="complete-task-title">
                  {selectedTask.companyName ?? selectedTask.title}
                </h3>
                <p className={styles.muted}>{getContactLine(selectedTask)}</p>
              </div>
              <button aria-label="Închide dialogul" className={styles.iconButton} onClick={closeCompleteDialog} type="button">
                ×
              </button>
            </div>

            <label className={styles.dialogField}>
              <span>Outcome</span>
              <select
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as CallOutcomeDto)}
              >
                {outcomeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.dialogField}>
              <span>Notes</span>
              <textarea
                placeholder="Adaugă detalii utile pentru următorul pas..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>

            {completeTaskMutation.isError ? (
              <p className={styles.formError}>Nu am putut salva completarea. Încearcă din nou.</p>
            ) : null}

            <div className={styles.dialogActions}>
              <Button disabled={completeTaskMutation.isPending} variant="outline" type="button" onClick={closeCompleteDialog}>
                Anulează
              </Button>
              <Button disabled={completeTaskMutation.isPending} type="button" onClick={saveCompletion}>
                {completeTaskMutation.isPending ? <LoaderCircle className={styles.spinner} /> : null}
                Salvează
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

async function getApiErrorMessage(error: unknown) {
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
      return "Nu am putut crea următoarele task-uri. Încearcă din nou.";
    }
  }

  return "Nu am putut crea următoarele task-uri. Încearcă din nou.";
}
