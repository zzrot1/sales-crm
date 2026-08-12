"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  type getDealsResponse,
  getGetDealQueryKey,
  getGetDealsQueryKey,
  useGetDeal,
  useGetDeals,
  useMarkLost,
  useUpdateDeal,
} from "@/service-api/generated/endpoints/deals/deals";
import { useCreateActivity } from "@/service-api/generated/endpoints/activities/activities";
import {
  getGetTasksQueryKey,
  useCreateTask,
  useUpdateTask,
} from "@/service-api/generated/endpoints/tasks/tasks";
import type {
  ActivitiesCreateRequest,
  CreateTaskRequest,
  DealsDealStageDto,
  DealsListItemDto,
  UpdateTaskRequest,
} from "@/service-api/generated/models";

import { groupDealsByStage } from "../utils/deal-helpers";

type DealMove = {
  deal: DealsListItemDto;
  nextStage: DealsDealStageDto;
  reason?: string;
};

type DealsQuerySnapshot = Array<[readonly unknown[], getDealsResponse | undefined]>;

type MoveDealContext = {
  previousDeals?: DealsQuerySnapshot;
};

function updateDealStageInList(
  data: getDealsResponse | undefined,
  dealId: string,
  stage: DealsDealStageDto,
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    data: data.data.map((deal) =>
      deal.id === dealId
        ? {
            ...deal,
            stage,
          }
        : deal,
    ),
  };
}

export function useDeals() {
  const queryClient = useQueryClient();
  const [moveError, setMoveError] = useState<string | null>(null);
  const dealsQuery = useGetDeals();
  const groupedDeals = useMemo(
    () => groupDealsByStage(dealsQuery.data?.data ?? []),
    [dealsQuery.data?.data],
  );

  const updateDealMutation = useUpdateDeal<unknown, MoveDealContext>({
    mutation: {
      onError: (_error, _variables, context) => {
        if (context?.previousDeals) {
          context.previousDeals.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }

        setMoveError("Nu am putut muta deal-ul. Incearca din nou.");
      },
      onMutate: async ({ id, data }) => {
        const nextStage = data.stage;

        if (!nextStage) {
          return {};
        }

        await queryClient.cancelQueries({ queryKey: getGetDealsQueryKey() });
        const previousDeals =
          queryClient.getQueriesData<getDealsResponse>({
            queryKey: getGetDealsQueryKey(),
          }) as DealsQuerySnapshot;

        queryClient.setQueriesData<getDealsResponse>(
          { queryKey: getGetDealsQueryKey() },
          (current) => updateDealStageInList(current, id, nextStage),
        );

        setMoveError(null);
        return { previousDeals };
      },
      onSettled: async (_data, _error, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetDealsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getGetDealQueryKey(variables.id),
          }),
        ]);
      },
    },
  });

  const markLostMutation = useMarkLost<unknown, MoveDealContext>({
    mutation: {
      onError: (_error, _variables, context) => {
        if (context?.previousDeals) {
          context.previousDeals.forEach(([queryKey, data]) => {
            queryClient.setQueryData(queryKey, data);
          });
        }

        setMoveError("Nu am putut marca deal-ul ca pierdut.");
      },
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({ queryKey: getGetDealsQueryKey() });
        const previousDeals =
          queryClient.getQueriesData<getDealsResponse>({
            queryKey: getGetDealsQueryKey(),
          }) as DealsQuerySnapshot;

        queryClient.setQueriesData<getDealsResponse>(
          { queryKey: getGetDealsQueryKey() },
          (current) => updateDealStageInList(current, id, "LOST"),
        );

        setMoveError(null);
        return { previousDeals };
      },
      onSettled: async (_data, _error, variables) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetDealsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getGetDealQueryKey(variables.id),
          }),
        ]);
      },
    },
  });

  const moveDeal = ({ deal, nextStage, reason }: DealMove) => {
    if (deal.stage === nextStage) {
      return;
    }

    if (nextStage === "LOST") {
      markLostMutation.mutate({
        data: { reason: reason?.trim() || "Fara motiv specificat" },
        id: deal.id,
      });
      return;
    }

    updateDealMutation.mutate({
      data: { stage: nextStage },
      id: deal.id,
    });
  };

  return {
    dealsQuery,
    groupedDeals,
    isMoving: updateDealMutation.isPending || markLostMutation.isPending,
    moveDeal,
    moveError,
    setMoveError,
  };
}

export function useDealDetail(dealId: string) {
  const queryClient = useQueryClient();
  const dealQuery = useGetDeal(dealId);

  const refreshDeal = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetDealsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetDealQueryKey(dealId) }),
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
    ]);
  };

  const updateDealMutation = useUpdateDeal({
    mutation: {
      onSuccess: refreshDeal,
    },
  });
  const markLostMutation = useMarkLost({
    mutation: {
      onSuccess: refreshDeal,
    },
  });
  const createActivityMutation = useCreateActivity({
    mutation: {
      onSuccess: refreshDeal,
    },
  });
  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: refreshDeal,
    },
  });
  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: refreshDeal,
    },
  });

  const updateDeal = (data: Parameters<typeof updateDealMutation.mutate>[0]["data"]) => {
    updateDealMutation.mutate({ data, id: dealId });
  };

  const markLost = (reason: string) => {
    markLostMutation.mutate({ data: { reason }, id: dealId });
  };

  const createActivity = (data: Omit<ActivitiesCreateRequest, "dealId">) => {
    createActivityMutation.mutate({ data: { ...data, dealId } });
  };

  const createTask = (data: Omit<CreateTaskRequest, "dealId">) => {
    createTaskMutation.mutate({ data: { ...data, dealId } });
  };

  const updateTask = (taskId: string, data: UpdateTaskRequest) => {
    updateTaskMutation.mutate({ data, taskId });
  };

  return {
    createActivity,
    createActivityMutation,
    createTask,
    createTaskMutation,
    dealQuery,
    isSaving:
      updateDealMutation.isPending ||
      markLostMutation.isPending ||
      createActivityMutation.isPending ||
      createTaskMutation.isPending ||
      updateTaskMutation.isPending,
    markLost,
    markLostMutation,
    updateDeal,
    updateDealMutation,
    updateTask,
    updateTaskMutation,
  };
}
