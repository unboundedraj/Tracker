import { AppShell } from "@/components/layout/app-shell";
import { ProjectInitializedBanner } from "@/components/common/project-initialized-banner";

export default function Home() {
  return (
    <AppShell>
      <ProjectInitializedBanner />
    </AppShell>
  );
}
