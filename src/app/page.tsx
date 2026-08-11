"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { routes } from "@/common/routes";
import { useMe } from "@/service-api/generated/endpoints/auth/auth";

export default function Page() {
  const router = useRouter();
  const meQuery = useMe({
    query: {
      retry: false,
    },
  });

  useEffect(() => {
    if (meQuery.isSuccess) {
      router.replace(routes.dashboard.path);
      return;
    }

    if (meQuery.isError) {
      router.replace(routes.login.path);
    }
  }, [meQuery.isError, meQuery.isSuccess, router]);

  return null;
}
