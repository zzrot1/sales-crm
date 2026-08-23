
export const resourcePaths = {
  activities: "/activities",
  companies: "/companies",
  contacts: "/contacts",
  deals: "/deals",
  tasks: "/tasks",
  users: "/users",
} as const;

export type ResourceName = keyof typeof resourcePaths;
