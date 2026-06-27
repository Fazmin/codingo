use std::process::Command;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Serialize)]
pub struct RunResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
    duration_ms: u64,
    error: Option<String>,
}

/// Execute a snippet of code in a sandboxed temp file with a fixed interpreter
/// allowlist. This is the Learn-mode run/console backend. We deliberately keep
/// the interpreter list explicit so the frontend cannot run arbitrary programs.
#[tauri::command]
fn run_code(language: String, code: String) -> RunResult {
    let start = Instant::now();

    let (program, ext): (&str, &str) = match language.as_str() {
        "python" => ("python3", "py"),
        "javascript" | "node" => ("node", "js"),
        other => {
            return RunResult {
                stdout: String::new(),
                stderr: String::new(),
                exit_code: -1,
                duration_ms: 0,
                error: Some(format!("Unsupported language: {other}")),
            };
        }
    };

    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let file = std::env::temp_dir().join(format!("socratic_run_{}_{}.{}", std::process::id(), nanos, ext));

    if let Err(e) = std::fs::write(&file, code.as_bytes()) {
        return RunResult {
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            duration_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("Could not write temp file: {e}")),
        };
    }

    let output = Command::new(program).arg(&file).output();
    let _ = std::fs::remove_file(&file);

    match output {
        Ok(out) => RunResult {
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
            exit_code: out.status.code().unwrap_or(-1),
            duration_ms: start.elapsed().as_millis() as u64,
            error: None,
        },
        Err(e) => RunResult {
            stdout: String::new(),
            stderr: String::new(),
            exit_code: -1,
            duration_ms: start.elapsed().as_millis() as u64,
            error: Some(format!("Failed to launch {program}: {e}. Is it installed and on PATH?")),
        },
    }
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_prompt TEXT,
  starter_files TEXT,
  objectives TEXT,
  disclosure TEXT,
  allowed_resources TEXT,
  time_budget_min INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  status TEXT NOT NULL,
  accommodated INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, timestamp_ms);

CREATE TABLE IF NOT EXISTS reports (
  session_id TEXT PRIMARY KEY,
  generated_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
"#;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create core schema",
        sql: SCHEMA,
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:socratic.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![run_code])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
