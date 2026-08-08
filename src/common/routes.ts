import { AuthUserDtoRole } from "@/service-api/generated/models";
import type { AuthUserDtoRole as AppRole } from "@/service-api/generated/models";

export enum RouteAccessType {
  Public = "public",
  Authenticated = "authenticated",
}

export const routes = {
  home: {
    name: "Dashboard",
    path: "/",
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
