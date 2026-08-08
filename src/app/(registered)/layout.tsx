import { RegisteredLayout } from "@/features/registered-layout/components/registered-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RegisteredLayout>{children}</RegisteredLayout>;
}
