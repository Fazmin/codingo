import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { setupMonaco } from "../lib/monaco";
import { useAppStore } from "../state/appStore";
import { resolveDark } from "../lib/theme/ThemeProvider";

setupMonaco();

export interface CursorPos {
  line: number;
  column: number;
}

interface EditorPaneProps {
  value: string;
  language: "python" | "javascript";
  onChange?: (value: string, cursor: CursorPos) => void;
  onPaste?: (size: number) => void;
  readOnly?: boolean;
  errorLine?: number | null;
}

export function EditorPane({
  value,
  language,
  onChange,
  onPaste,
  readOnly,
  errorLine,
}: EditorPaneProps) {
  const appearance = useAppStore((s) => s.settings.appearance);
  const dark = appearance.syncEditorTheme
    ? resolveDark(appearance.theme)
    : false;
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    ed.onDidPaste((e) => {
      const model = ed.getModel();
      if (!model) return;
      const text = model.getValueInRange(e.range);
      onPaste?.(text.length);
    });
  };

  // Highlight the line of the latest runtime error.
  useEffect(() => {
    const ed = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (!model) return;
    if (errorLine && errorLine > 0) {
      const decorations = ed.createDecorationsCollection([
        {
          range: new monaco.Range(errorLine, 1, errorLine, 1),
          options: {
            isWholeLine: true,
            className: "bg-danger/15",
            glyphMarginClassName: "",
            overviewRuler: {
              color: "rgba(239,68,68,0.7)",
              position: monaco.editor.OverviewRulerLane.Left,
            },
          },
        },
      ]);
      return () => decorations.clear();
    }
  }, [errorLine]);

  return (
    <Editor
      language={language}
      value={value}
      theme={dark ? "vs-dark" : "light"}
      onMount={handleMount}
      onChange={(val) => {
        const ed = editorRef.current;
        const pos = ed?.getPosition();
        onChange?.(val ?? "", {
          line: pos?.lineNumber ?? 1,
          column: pos?.column ?? 1,
        });
      }}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "JetBrains Mono, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        padding: { top: 14, bottom: 14 },
        lineNumbersMinChars: 3,
        renderLineHighlight: "line",
        tabSize: 4,
        automaticLayout: true,
        cursorBlinking: "smooth",
      }}
    />
  );
}
