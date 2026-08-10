"use client";

import { useMemo, useState } from "react";
import { CalendarClock, PhoneCall } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { getGetCompaniesQueryKey } from "@/service-api/generated/endpoints/companies/companies";
import {
  getGetTasksQueryKey,
  getGetTodaysTasksQueryKey,
  useCompleteCallTask,
  useGenerateDailyCallTasks,
  useGetTodaysTasks,
} from "@/service-api/generated/endpoints/tasks/tasks";
import type { CallOutcomeDto, TaskListItemDto } from "@/service-api/generated/models";

import styles from "./index.module.css";
import { CompleteTaskDialog } from "./tasks/complete-task-dialog";
import {
  emptyTasks,
  getApiErrorMessage,
  isCompletedToday,
} from "./tasks/task-helpers";
import { TaskSection } from "./tasks/task-section";
import { TasksProgressHeader } from "./tasks/tasks-progress-header";

export function TasksPage() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<TaskListItemDto | null>(null);
  const [outcome, setOutcome] = useState<CallOutcomeDto>("NO_ANSWER");
  const [notes, setNotes] = useState("");
  const [generateErrorMessage, setGenerateErrorMessage] = useState<string | null>(null);

  const todaysTasksQuery = useGetTodaysTasks();
  const tasks = todaysTasksQuery.data?.data ?? emptyTasks;

  const taskStats = useMemo(() => {
    const pendingTasks = tasks.filter((task) => !task.completedAt);
    const completedTodayTasks = tasks.filter(isCompletedToday);
    const completedCount = tasks.filter((task) => Boolean(task.completedAt)).length;

    return {
      completedCount,
      completedTodayTasks,
      pendingTasks,
      progressValue:
        tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  const refreshTasks = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetTodaysTasksQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetCompaniesQueryKey() }),
    ]);
  };

  const generateTasksMutation = useGenerateDailyCallTasks({
    mutation: {
      onError: (error) => {
        void getApiErrorMessage(error).then((message) => setGenerateErrorMessage(message));
      },
      onSuccess: async () => {
        setGenerateErrorMessage(null);
        await refreshTasks();
      },
    },
  });

  const completeTaskMutation = useCompleteCallTask({
    mutation: {
      onSuccess: async () => {
        await refreshTasks();
        resetCompleteDialog();
      },
    },
  });

  const openCompleteDialog = (task: TaskListItemDto) => {
    setSelectedTask(task);
    setOutcome("NO_ANSWER");
    setNotes("");
  };

  const closeCompleteDialog = () => {
    if (!completeTaskMutation.isPending) {
      setSelectedTask(null);
    }
  };

  const resetCompleteDialog = () => {
    setSelectedTask(null);
    setNotes("");
    setOutcome("NO_ANSWER");
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

  return (
    <div className={styles.page}>
      <TasksProgressHeader
        completedCount={taskStats.completedCount}
        generateErrorMessage={generateErrorMessage}
        hasPendingTasks={taskStats.pendingTasks.length > 0}
        isGenerating={generateTasksMutation.isPending}
        isLoading={todaysTasksQuery.isLoading}
        progressValue={taskStats.progressValue}
        totalCount={tasks.length}
        onGenerate={() => generateTasksMutation.mutate({ data: { limit: 10 } })}
      />

      <section className={styles.taskSections}>
        <TaskSection
          actionHeader="Actiune"
          emptyMessage="Nu mai ai task-uri pending pentru azi."
          icon={<PhoneCall />}
          isLoading={todaysTasksQuery.isLoading}
          subtitle={`${taskStats.pendingTasks.length} task-uri pending`}
          tasks={taskStats.pendingTasks}
          title="De facut"
          onComplete={openCompleteDialog}
        />

        <TaskSection
          actionHeader="Outcome"
          emptyIcon={<CalendarClock />}
          emptyMessage="Inca nu ai task-uri completate azi."
          icon={<CalendarClock />}
          isLoading={todaysTasksQuery.isLoading}
          subtitle={`${taskStats.completedTodayTasks.length} task-uri inchise`}
          tasks={taskStats.completedTodayTasks}
          title="Completate azi"
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
    </div>
  );
}
