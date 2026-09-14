"use client";

import { useMemo } from "react";

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

export function useDeals(filters?: DealFilters) {
  const dealsQuery = useGetDeals();

  const filteredDeals = useMemo(
    () => filterDeals(dealsQuery.data ?? [], filters),
    [dealsQuery.data, filters],
  );
  const groupedDeals = useMemo(
    () => groupDealsByStage(filteredDeals),
    [filteredDeals],
  );

  const updateDealMutation = useUpdateDeal({
    mutation: { meta: { errorMessage: "Nu am putut muta deal-ul. Incearca din nou." } },
  });
  const markLostMutation = useMarkLost({
    mutation: { meta: { errorMessage: "Nu am putut marca deal-ul ca pierdut." } },
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

    updateDealMutation.mutate({ data: { stage: nextStage }, id: deal.id });
  };

  return {
    dealsQuery,
    filteredDeals,
    groupedDeals,
    isMoving: updateDealMutation.isPending || markLostMutation.isPending,
    moveDeal,
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
  const updateDealMutation = useUpdateDeal();
  const markLostMutation = useMarkLost();
  const createActivityMutation = useCreateActivity();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();

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
