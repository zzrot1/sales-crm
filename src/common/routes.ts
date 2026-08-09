import { AuthUserDtoRole } from "@/service-api/generated/models";
import type { AuthUserDtoRole as AppRole } from "@/service-api/generated/models";

export enum RouteAccessType {
  Public = "public",
  Authenticated = "authenticated",
}

export const routes = {
  dashboard: {
    name: "Dashboard",
    path: "/dashboard",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  companies: {
    name: "Companii",
    path: "/companies",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  deals: {
    name: "Deal-uri",
    path: "/deals",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  tasks: {
    name: "Task-uri",
    path: "/tasks",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  import: {
    name: "Import",
    path: "/import",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  settings: {
    name: "Setari",
    path: "/settings",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  reports: {
    name: "Rapoarte",
    path: "/reports",
    access: {
      type: RouteAccessType.Authenticated,
      roles: [AuthUserDtoRole.USER, AuthUserDtoRole.ADMIN],
    },
  },
  login: {
    name: "Login",
    path: "/login",
    reasons: {
      unauthorized: "unauthorized",
    },
    access: {
      type: RouteAccessType.Public,
    },
  },
} as const;

export type { AppRole };
