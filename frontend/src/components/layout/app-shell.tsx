import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { ClientChrome } from "./client-chrome";
import { LegalFooter } from "@/components/shared/legal-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar />
        <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
          <ClientChrome />
          {children}
          <LegalFooter />
        </main>
      </div>
    </div>
  );
}
