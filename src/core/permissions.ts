"use client";

import type { ApiResourceName } from "@/core/cache/api-data-handler";
import { useMe } from "@/service-api/generated/endpoints/auth/auth";
import type { PermissionsByResourceDto } from "@/service-api/generated/models";

export type PermissionAction = "create" | "read" | "update" | "delete";

/**
 * Resursele fara drepturi proprii pe server. Contactele apartin companiilor,
 * deci se modifica cu dreptul pe companii.
 */
const permissionResourceFor: Partial<Record<ApiResourceName, keyof PermissionsByResourceDto>> =
  {
    companies: "companies",
    contacts: "companies",
    deals: "deals",
    tasks: "tasks",
  };

/**
 * ```tsx
 * const { can } = usePermissions();
 *
 * <button disabled={!can("update", "companies")}>Editeaza</button>
 * ```
 *
 * Drepturile vin in `GET /auth/me`, ca `{ companies: { read, create, update,
 * delete }, deals, tasks }`. React-query deduplica cererea, deci hook-ul poate
 * fi apelat in oricate componente. Cat timp se incarca, `can` intoarce `false`.
 */
export function usePermissions() {
  const query = useMe();
  const permissions = query.data?.permissions;

  return {
    can: (action: PermissionAction, resource: ApiResourceName) => {
      const permissionResource = permissionResourceFor[resource];
      return Boolean(
        permissions && permissionResource && permissions[permissionResource][action],
      );
    },
    isLoading: query.isPending,
    role: query.data?.user.role,
  };
}
