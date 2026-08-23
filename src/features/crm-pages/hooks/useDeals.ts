"use client";

import { useMemo, useState } from "react";

import { useMutationSetup } from "@/core/mutation-setup";
import { useCreateActivity } from "@/service-api/generated/endpoints/activities/activities";
import {
  useGetDeal,
  useGetDeals,
  useMarkLost,
  useUpdateDeal,
} from "@/service-api/generated/endpoints/deals/deals";
import {
  useCreateTask,
  useUpdateTask,
} from "@/service-api/generated/endpoints/tasks/tasks";
import type {
  ActivitiesCreateRequest,
  CreateTaskRequest,
  DealsDealStageDto,
  DealsListItemDto,
  DealsUpdateRequest,
  UpdateTaskRequest,
} from "@/service-api/generated/models";

import { groupDealsByStage } from "../utils/deal-helpers";

type DealMove = {
  deal: DealsListItemDto;
  nextStage: DealsDealStageDto;
  reason?: string;
};

export type DealFilters = {
  companyId: string;
  dateFrom: string;
  dateTo: string;
};

const dealInvalidates = ["deals", "companies", "tasks"] as const;

export function useDeals(filters?: DealFilters) {
  const [moveError, setMoveError] = useState<string | null>(null);
  const dealsQuery = useGetDeals();

  const filteredDeals = useMemo(
    () => filterDeals(dealsQuery.data?.data ?? [], filters),
    [dealsQuery.data?.data, filters],
  );
  const groupedDeals = useMemo(
    () => groupDealsByStage(filteredDeals),
    [filteredDeals],
  );

  const updateDealSetup = useMutationSetup<
    { id: string; data: DealsUpdateRequest },
    DealsListItemDto
  >({
    error: "Nu am putut muta deal-ul. Incearca din nou.",
    invalidates: dealInvalidates,
    optimistic: {
      id: ({ id }) => id,
      patch: (deal, { data }) => ({ ...deal, stage: data.stage ?? deal.stage }),
      resource: "deals",
    },
  });

  const markLostSetup = useMutationSetup<{ id: string }, DealsListItemDto>({
    error: "Nu am putut marca deal-ul ca pierdut.",
    invalidates: dealInvalidates,
    optimistic: {
      id: ({ id }) => id,
      patch: (deal) => ({ ...deal, stage: "LOST" }),
      resource: "deals",
    },
  });

  const updateDealMutation = useUpdateDeal(updateDealSetup);
  const markLostMutation = useMarkLost(markLostSetup);

  const moveDeal = ({ deal, nextStage, reason }: DealMove) => {
    if (deal.stage === nextStage) {
      return;
    }

    setMoveError(null);

    if (nextStage === "LOST") {
      markLostMutation.mutate({
        data: { reason: reason?.trim() || "Fara motiv specificat" },
        id: deal.id,
      });
      return;
    }

    updateDealMutation.mutate({ data: { stage: nextStage }, id: deal.id });
  };

  return {
    dealsQuery,
    filteredDeals,
    groupedDeals,
    isMoving: updateDealMutation.isPending || markLostMutation.isPending,
    moveDeal,
    moveError,
    setMoveError,
  };
}

function filterDeals(deals: DealsListItemDto[], filters?: DealFilters) {
  if (!filters) {
    return deals;
  }

  return deals.filter((deal) => {
    if (filters.companyId && deal.company.id !== filters.companyId) {
      return false;
    }

    const closeDate = deal.closeDate?.slice(0, 10);

    if (filters.dateFrom && (!closeDate || closeDate < filters.dateFrom)) {
      return false;
    }

    if (filters.dateTo && (!closeDate || closeDate > filters.dateTo)) {
      return false;
    }

    return true;
  });
}

export function useDealDetail(dealId: string) {
  const dealQuery = useGetDeal(dealId);
  const setup = useMutationSetup({ invalidates: dealInvalidates });

  const updateDealMutation = useUpdateDeal(setup);
  const markLostMutation = useMarkLost(setup);
  const createActivityMutation = useCreateActivity(setup);
  const createTaskMutation = useCreateTask(setup);
  const updateTaskMutation = useUpdateTask(setup);

  return {
    createActivity: (data: Omit<ActivitiesCreateRequest, "dealId">) =>
      createActivityMutation.mutate({ data: { ...data, dealId } }),
    createActivityMutation,
    createTask: (data: Omit<CreateTaskRequest, "dealId">) =>
      createTaskMutation.mutate({ data: { ...data, dealId } }),
    createTaskMutation,
    dealQuery,
    isSaving:
      updateDealMutation.isPending ||
      markLostMutation.isPending ||
      createActivityMutation.isPending ||
      createTaskMutation.isPending ||
      updateTaskMutation.isPending,
    markLost: (reason: string) =>
      markLostMutation.mutate({ data: { reason }, id: dealId }),
    markLostMutation,
    updateDeal: (data: DealsUpdateRequest) =>
      updateDealMutation.mutate({ data, id: dealId }),
    updateDealMutation,
    updateTask: (taskId: string, data: UpdateTaskRequest) =>
      updateTaskMutation.mutate({ data, taskId }),
    updateTaskMutation,
  };
}
