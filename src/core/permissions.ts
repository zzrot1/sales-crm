"use client";

import type { ApiResourceName } from "@/core/cache/api-data-handler";
import { useGetMyPermissions } from "@/service-api/generated/endpoints/permissions/permissions";

export type PermissionAction = "create" | "read" | "update" | "delete";

/**
 * Formatul string-urilor din `RolePermissionsDto.permissions`.
 * Spec-ul le declara doar ca `string[]`, deci conventia sta aici — daca
 * backend-ul foloseste alt separator sau alta ordine, se schimba doar linia asta.
 */
function toPermissionKey(action: PermissionAction, resource: ApiResourceName) {
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
 * Cat timp se incarca, `can` intoarce `false`.
 */
export function usePermissions() {
  const query = useGetMyPermissions();
  const granted = query.data?.permissions ?? [];

  return {
    can: (action: PermissionAction, resource: ApiResourceName) =>
      granted.includes(toPermissionKey(action, resource)),
    isLoading: query.isPending,
    role: query.data?.role,
  };
}
