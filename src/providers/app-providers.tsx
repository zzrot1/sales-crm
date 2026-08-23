"use client";

import { NotificationsProvider } from "@/core/notifications";
import { QueryProvider } from "@/providers/query-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </QueryProvider>
  );
}
