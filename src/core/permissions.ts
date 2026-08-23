"use client";

import type { ResourceName } from "@/core/resources";
import { useGetMyPermissions } from "@/service-api/generated/endpoints/permissions/permissions";

export type PermissionAction = "create" | "read" | "update" | "delete";

/**
 * Formatul string-urilor din `RolePermissionsDto.permissions`.
 * Spec-ul le declara doar ca `string[]`, deci conventia sta aici — daca
 * backend-ul foloseste alt separator sau alta ordine, se schimba doar linia asta.
 */
function toPermissionKey(action: PermissionAction, resource: ResourceName) {
  return `${resource}:${action}`;
}

/**
 * ```tsx
 * const { can } = usePermissions();
 *
 * <button disabled={!can("update", "companies")}>Editeaza</button>
 * ```
 *
 * Nu are nevoie de provider — react-query deduplica cererea, deci hook-ul poate
 * fi apelat in oricate componente cu un singur `GET /permissions/me` pe sesiune.
 *
 */
export function usePermissions() {
  const query = useGetMyPermissions({
    query: { staleTime: Infinity },
  });
  const granted = query.data?.data.permissions ?? [];

  return {
    can: (action: PermissionAction, resource: ResourceName) =>
      granted.includes(toPermissionKey(action, resource)),
    isLoading: query.isPending,
    role: query.data?.data.role,
  };
}
