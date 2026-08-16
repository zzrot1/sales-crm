import { redirect } from "next/navigation";

import { routes } from "@/common/routes";

export default function NotFound() {
  redirect(routes.dashboard.path);
}
