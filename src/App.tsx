import { useEffect } from "react";
import { ThemeProvider } from "./lib/theme/ThemeProvider";
import { Sidebar } from "./components/Sidebar";
import { useAppStore } from "./state/appStore";
import { AuthorMode } from "./modes/AuthorMode";
import { LearnMode } from "./modes/LearnMode";
import { AnalyzeMode } from "./modes/AnalyzeMode";
import { SettingsView } from "./modes/Settings";

export default function App() {
  const view = useAppStore((s) => s.view);
  const initSettings = useAppStore((s) => s.initSettings);

  useEffect(() => {
    void initSettings();
  }, [initSettings]);

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {view === "author" && <AuthorMode />}
          {view === "learn" && <LearnMode />}
          {view === "analyze" && <AnalyzeMode />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
    </ThemeProvider>
  );
}
