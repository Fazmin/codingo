import { useState } from "react";
import {
  BarChart3,
  GraduationCap,
  Lock,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PenSquare,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useAppStore, type View } from "../state/appStore";
import { cn } from "../lib/utils";
import type { ThemeMode } from "../lib/settings/store";
import { ThemeToggle } from "./ThemeToggle";
import { UnlockDialog } from "./UnlockDialog";

const NAV: { id: View; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "author", label: "Author", icon: <PenSquare size={18} />, hint: "Build campaigns" },
  { id: "learn", label: "Learn", icon: <GraduationCap size={18} />, hint: "Run a session" },
  { id: "analyze", label: "Analyze", icon: <BarChart3 size={18} />, hint: "Review sessions" },
];

const COLLAPSE_KEY = "socratic.navCollapsed";

export function Sidebar() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const locked = useAppStore((s) => s.locked);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const isBlocked = (id: View) => locked && id !== "learn";

  function handleNav(id: View) {
    if (isBlocked(id)) {
      setUnlockOpen(true);
      return;
    }
    setView(id);
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-border bg-surface/60 transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex items-center px-3 py-5",
          collapsed ? "justify-center" : "gap-2.5 px-5",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-sm">
          <Sparkles size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold text-fg">Socratic</div>
            <div className="truncate text-xs text-fg-muted">Learning Workspace</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="text-fg-muted hover:text-fg"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center pb-1">
          <button
            onClick={toggleCollapsed}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {!collapsed && (
          <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-muted/70">
            Modes
          </div>
        )}
        {NAV.map((item) => {
          const blocked = isBlocked(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              title={blocked ? `${item.label} — locked, enter code` : item.hint}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center" : "gap-3",
                view === item.id
                  ? "bg-accent/10 text-accent"
                  : blocked
                    ? "text-fg-muted/40 hover:bg-surface-2/50"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <span
                className={cn(
                  view === item.id ? "text-accent" : "text-fg-muted group-hover:text-fg",
                  blocked && "text-fg-muted/40",
                )}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && blocked && <Lock size={13} className="text-fg-muted/50" />}
            </button>
          );
        })}
      </nav>

      {locked ? (
        <div className="border-t border-border px-3 py-4">
          {collapsed ? (
            <button
              onClick={() => setUnlockOpen(true)}
              title="Session locked — enter code to unlock"
              aria-label="Session locked — enter code to unlock"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning hover:bg-warning/25"
            >
              <Lock size={16} />
            </button>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-warning">
                <Lock size={15} /> Session locked
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Author and Analyze are blocked until the code is entered.
              </p>
              <button
                onClick={() => setUnlockOpen(true)}
                className="mt-2.5 w-full rounded-md bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/30"
              >
                Enter code to unlock
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 border-t border-border py-4",
            collapsed ? "items-center px-2" : "px-4",
          )}
        >
          {collapsed ? <CompactThemeButton /> : <ThemeToggle />}
          <button
            onClick={() => setView("settings")}
            title="Settings"
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "h-9 w-9 justify-center" : "gap-3 px-3 py-2",
              view === "settings"
                ? "bg-accent/10 text-accent"
                : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <SettingsIcon size={18} />
            {!collapsed && "Settings"}
          </button>
        </div>
      )}

      <UnlockDialog open={unlockOpen} onClose={() => setUnlockOpen(false)} />
    </aside>
  );
}

const THEME_ORDER: ThemeMode[] = ["light", "dark", "system"];
const THEME_ICON: Record<ThemeMode, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

/** Single-button theme cycler shown when the sidebar is collapsed. */
function CompactThemeButton() {
  const theme = useAppStore((s) => s.settings.appearance.theme);
  const appearance = useAppStore((s) => s.settings.appearance);
  const updateSettings = useAppStore((s) => s.updateSettings);

  function cycle() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    updateSettings({ appearance: { ...appearance, theme: next } });
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme} (click to change)`}
      aria-label={`Theme: ${theme}`}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg-muted hover:text-fg"
    >
      {THEME_ICON[theme]}
    </button>
  );
}
