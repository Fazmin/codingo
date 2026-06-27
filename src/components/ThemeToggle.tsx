import { Monitor, Moon, Sun } from "lucide-react";
import { useAppStore } from "../state/appStore";
import type { ThemeMode } from "../lib/settings/store";
import { cn } from "../lib/utils";

const OPTIONS: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: "light", icon: <Sun size={15} />, label: "Light" },
  { mode: "dark", icon: <Moon size={15} />, label: "Dark" },
  { mode: "system", icon: <Monitor size={15} />, label: "System" },
];

export function ThemeToggle() {
  const theme = useAppStore((s) => s.settings.appearance.theme);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const appearance = useAppStore((s) => s.settings.appearance);

  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.mode}
          title={o.label}
          aria-label={`${o.label} theme`}
          onClick={() =>
            updateSettings({ appearance: { ...appearance, theme: o.mode } })
          }
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            theme === o.mode
              ? "bg-surface text-accent shadow-sm"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
