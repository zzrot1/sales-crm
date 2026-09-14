"use client";

import { useMemo, useState } from "react";
import { CalendarClock, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";

import { useUpdateCompany } from "@/service-api/generated/endpoints/companies/companies";
import {
  useCompleteCallTask,
  useGenerateDailyCallTasks,
  useGetTasks,
  useGetTodaysTasks,
  useUpdateTaskNotes,
} from "@/service-api/generated/endpoints/tasks/tasks";
import type {
  CallOutcomeDto,
  PartialCreateCompanyRequestStatus,
  TaskListItemDto,
} from "@/service-api/generated/models";

import styles from "./index.module.css";
import { CompleteTaskDialog } from "./tasks/complete-task-dialog";
import {
  emptyTasks,
  isCompletedTodayTask,
  isTaskCompleted,
} from "./tasks/task-helpers";
import { TaskSection } from "./tasks/task-section";
import { TaskNotesDialog } from "./tasks/task-notes-dialog";
import { TasksProgressHeader } from "./tasks/tasks-progress-header";

export function TasksPage() {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TaskListItemDto | null>(null);
  const [selectedNotesTask, setSelectedNotesTask] =
    useState<TaskListItemDto | null>(null);
  const [outcome, setOutcome] = useState<CallOutcomeDto>("NO_ANSWER");
  const [notes, setNotes] = useState("");
  const [taskNotes, setTaskNotes] = useState("");

  const todaysTasksQuery = useGetTodaysTasks();
  const pendingTasksQuery = useGetTasks({ status: "PENDING" });
  const completedTasksQuery = useGetTasks({ status: "COMPLETED" });
  const todayTasks = todaysTasksQuery.data ?? emptyTasks;
  const pendingTasks = pendingTasksQuery.data ?? emptyTasks;
  const completedTasks = completedTasksQuery.data ?? emptyTasks;
  const tasks = useMemo(() => {
    const taskById = new Map<string, TaskListItemDto>();

    [...todayTasks, ...pendingTasks, ...completedTasks].forEach((task) => {
      taskById.set(task.id, task);
    });

    return Array.from(taskById.values());
  }, [completedTasks, pendingTasks, todayTasks]);
  const isLoadingTasks =
    todaysTasksQuery.isLoading ||
    pendingTasksQuery.isLoading ||
    completedTasksQuery.isLoading;

  const taskStats = useMemo(() => {
    const todaysTaskIds = new Set(todayTasks.map((task) => task.id));
    const pendingTasks = tasks.filter((task) => !isTaskCompleted(task));
    const closedTasks = tasks.filter(isTaskCompleted);
    const completedTodayTasks = tasks.filter((task) =>
      isCompletedTodayTask(task, todaysTaskIds),
    );
    const completedCount = completedTodayTasks.length;

    return {
      completedCount,
      completedTodayTasks,
      closedTasks,
      pendingTasks,
      progressValue:
        tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
    };
  }, [tasks, todayTasks]);

  // Reimprospatarea task-urilor, a companiilor si a deal-urilor vine din
  // politica globala (core/cache/api-resources.ts). Aici raman doar reactiile
  // proprii paginii: inchiderea dialogului si navigarea.
  const generateTasksMutation = useGenerateDailyCallTasks({
    mutation: { meta: { successMessage: "Am generat task-urile de azi." } },
  });

  const completeTaskMutation = useCompleteCallTask({
    mutation: {
      meta: { successMessage: "Task-ul a fost inchis." },
      onSuccess: () => resetCompleteDialog(),
    },
  });

  const quickDealOutcomeMutation = useCompleteCallTask({
    mutation: {
      onSuccess: (response) => {
        if (response.deal?.id) {
          router.push(`/deals/${response.deal.id}`);
        }
      },
    },
  });

  const updateTaskNotesMutation = useUpdateTaskNotes({
    mutation: {
      meta: { successMessage: "Notitele au fost salvate." },
      onSuccess: () => resetNotesDialog(),
    },
  });

  const updateCompanyMutation = useUpdateCompany({
    mutation: { meta: { successMessage: "Statusul companiei a fost actualizat." } },
  });

  const openCompleteDialog = (task: TaskListItemDto) => {
    setSelectedTask(task);
    setOutcome("NO_ANSWER");
    setNotes(task.notes ?? "");
  };

  const openNotesDialog = (task: TaskListItemDto) => {
    setSelectedNotesTask(task);
    setTaskNotes(task.notes ?? "");
  };

  const closeCompleteDialog = () => {
    if (!completeTaskMutation.isPending) {
      setSelectedTask(null);
    }
  };

  const closeNotesDialog = () => {
    if (!updateTaskNotesMutation.isPending) {
      setSelectedNotesTask(null);
    }
  };

  const resetCompleteDialog = () => {
    setSelectedTask(null);
    setNotes("");
    setOutcome("NO_ANSWER");
  };

  const resetNotesDialog = () => {
    setSelectedNotesTask(null);
    setTaskNotes("");
  };

  const saveCompletion = () => {
    if (!selectedTask) {
      return;
    }

    completeTaskMutation.mutate({
      data: {
        notes: notes.trim() || null,
        outcome,
      },
      taskId: selectedTask.id,
    });
  };

  const saveTaskNotes = () => {
    if (!selectedNotesTask) {
      return;
    }

    updateTaskNotesMutation.mutate({
      data: {
        notes: taskNotes.trim() || null,
      },
      taskId: selectedNotesTask.id,
    });
  };

  const changeCompanyStatus = (
    task: TaskListItemDto,
    status: PartialCreateCompanyRequestStatus,
    nextOutcome: CallOutcomeDto,
  ) => {
    if (
      nextOutcome === "INTERESTED" ||
      nextOutcome === "MEETING_REQUIRED" ||
      nextOutcome === "DEAL_WON"
    ) {
      quickDealOutcomeMutation.mutate({
        data: {
          notes: task.notes?.trim() || null,
          outcome: nextOutcome,
        },
        taskId: task.id,
      });
      return;
    }

    if (!task.companyId) {
      return;
    }

    updateCompanyMutation.mutate({
      companyId: task.companyId,
      data: {
        status,
      },
    });
  };

  return (
    <div className={styles.page}>
      <TasksProgressHeader
        completedCount={taskStats.completedCount}
        hasPendingTasks={taskStats.pendingTasks.length > 0}
        isGenerating={generateTasksMutation.isPending}
        isLoading={isLoadingTasks}
        progressValue={taskStats.progressValue}
        totalCount={tasks.length}
        onGenerate={() => generateTasksMutation.mutate({ data: { limit: 10 } })}
      />

      <section className={styles.taskSections}>
        <TaskSection
          actionHeader="Actiune"
          emptyMessage="Nu mai ai task-uri pending."
          icon={<PhoneCall />}
          isLoading={isLoadingTasks}
          subtitle={`${taskStats.pendingTasks.length} task-uri pending`}
          tasks={taskStats.pendingTasks}
          title="De facut"
          onComplete={openCompleteDialog}
          onChangeCompanyStatus={changeCompanyStatus}
          onOpenNotes={openNotesDialog}
        />

        <TaskSection
          actionHeader="Actiune"
          emptyIcon={<CalendarClock />}
          emptyMessage="Inca nu ai task-uri inchise."
          icon={<CalendarClock />}
          isLoading={isLoadingTasks}
          subtitle={`${taskStats.closedTasks.length} task-uri inchise`}
          tasks={taskStats.closedTasks}
          title="Inchise"
          onChangeCompanyStatus={changeCompanyStatus}
          onOpenNotes={openNotesDialog}
        />
      </section>

      {selectedTask ? (
        <CompleteTaskDialog
          isError={completeTaskMutation.isError}
          isSaving={completeTaskMutation.isPending}
          notes={notes}
          outcome={outcome}
          task={selectedTask}
          onClose={closeCompleteDialog}
          onNotesChange={setNotes}
          onOutcomeChange={setOutcome}
          onSave={saveCompletion}
        />
      ) : null}

      {selectedNotesTask ? (
        <TaskNotesDialog
          isError={updateTaskNotesMutation.isError}
          isSaving={updateTaskNotesMutation.isPending}
          notes={taskNotes}
          task={selectedNotesTask}
          onClose={closeNotesDialog}
          onNotesChange={setTaskNotes}
          onSave={saveTaskNotes}
        />
      ) : null}
    </div>
  );
}
