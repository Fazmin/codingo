// Seeds three first-year CS campaigns into the app's local SQLite database.
// Safe to re-run: campaigns use stable ids and are upserted.
//
//   node scripts/seed-campaigns.cjs
//
// The DB lives in the Tauri app config dir. On macOS that is:
//   ~/Library/Application Support/com.socratic.workspace/socratic.db
const { DatabaseSync } = require("node:sqlite");
const os = require("os");
const path = require("path");

function dbPath() {
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "com.socratic.workspace",
      "socratic.db",
    );
  }
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "com.socratic.workspace",
      "socratic.db",
    );
  }
  return path.join(
    process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
    "com.socratic.workspace",
    "socratic.db",
  );
}

const SCHEMA = `
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
);`;

function obj(id, name) {
  return { id, name };
}

const now = Date.now();

const campaigns = [
  {
    id: "camp_seed_fizzbuzz",
    title: "FizzBuzz: Loops & Conditionals",
    description:
      "A first taste of loops and branching. Print 1 to 100 with a twist, one rule at a time.",
    taskPrompt: `Print the numbers from 1 to 100. But:
- for multiples of 3, print "Fizz" instead of the number
- for multiples of 5, print "Buzz"
- for numbers that are multiples of BOTH 3 and 5, print "FizzBuzz"

Build it up gradually: first just print 1 to 100, then add one rule at a time and run it. Notice what order you check the rules in.`,
    starterFiles: [
      {
        name: "main.py",
        language: "python",
        content:
          "def fizzbuzz():\n    # Print the numbers 1 to 100 with the FizzBuzz rules.\n    # Tip: start by printing 1 to 100, then add one rule at a time.\n    pass\n\n\nfizzbuzz()\n",
      },
    ],
    objectives: [
      obj("obj_fb_loop", "loop-termination"),
      obj("obj_fb_cond", "conditional-logic"),
      obj("obj_fb_mod", "modulo-operator"),
      obj("obj_fb_order", "order-of-conditions"),
    ],
    disclosure: {
      default: "balanced",
      perObjective: {
        obj_fb_mod: "strict",
        obj_fb_order: "strict",
      },
    },
    allowedResources: { languageDocs: true, openWeb: false },
    timeBudgetMin: 30,
    createdAt: now - 2000,
  },
  {
    id: "camp_seed_debug_avg",
    title: "Debug It: The Wrong Average",
    description:
      "A buggy function that should compute the average of a list. Find and fix the bugs without rewriting it.",
    taskPrompt: `The function average(nums) is supposed to return the arithmetic mean of a list of numbers, but it has several bugs and it crashes on an empty list.

Run it, read the output, and form a hypothesis about EACH bug before changing anything. Fix them one at a time.

Expected behaviour:
- average([2, 4, 6])  -> 4.0
- average([])         -> 0

Resist rewriting from scratch. The goal is to read code and reason about why it is wrong.`,
    starterFiles: [
      {
        name: "main.py",
        language: "python",
        content:
          "def average(nums):\n    total = 0\n    for i in range(1, len(nums)):\n        total = total + nums[i]\n    return total / len(nums) - 1\n\n\nprint(average([2, 4, 6]))   # should print 4.0\nprint(average([]))          # should print 0\n",
      },
    ],
    objectives: [
      obj("obj_dbg_offbyone", "off-by-one"),
      obj("obj_dbg_iter", "list-iteration"),
      obj("obj_dbg_prec", "operator-precedence"),
      obj("obj_dbg_edge", "empty-input-edge-case"),
    ],
    disclosure: {
      default: "strict",
      perObjective: {
        obj_dbg_prec: "balanced",
      },
    },
    allowedResources: { languageDocs: true, openWeb: false },
    timeBudgetMin: 25,
    createdAt: now - 1000,
  },
  {
    id: "camp_seed_reverse",
    title: "Reverse a String, Three Ways",
    description:
      "Build intuition for strings, loops, and functions by reversing a string in more than one way.",
    taskPrompt: `Write a function reverse(s) that returns the string s reversed.
For example: reverse("cat") -> "tac".

Step 1: Solve it with a loop that builds the result one character at a time.
Step 2: If you have time, find a second, shorter approach and be ready to explain WHY it works.

This is open-ended on syntax — spend your thinking on how to decompose the problem, not on remembering exact methods.`,
    starterFiles: [
      {
        name: "main.py",
        language: "python",
        content:
          'def reverse(s):\n    # Return s reversed. Try a loop that builds the answer one char at a time.\n    pass\n\n\nprint(reverse("cat"))      # expect: tac\nprint(reverse("racecar"))  # expect: racecar\n',
      },
    ],
    objectives: [
      obj("obj_rev_index", "string-indexing"),
      obj("obj_rev_accum", "loop-accumulation"),
      obj("obj_rev_decomp", "function-decomposition"),
      obj("obj_rev_slice", "slicing"),
    ],
    disclosure: {
      default: "permissive",
      perObjective: {
        obj_rev_decomp: "balanced",
      },
    },
    allowedResources: { languageDocs: true, openWeb: false },
    timeBudgetMin: 40,
    createdAt: now,
  },
];

function main() {
  const file = dbPath();
  console.log("Opening", file);
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);

  const stmt = db.prepare(`
    INSERT INTO campaigns
      (id, title, description, task_prompt, starter_files, objectives, disclosure, allowed_resources, time_budget_min, created_at)
    VALUES ($id, $title, $description, $task_prompt, $starter_files, $objectives, $disclosure, $allowed_resources, $time_budget_min, $created_at)
    ON CONFLICT(id) DO UPDATE SET
      title=$title, description=$description, task_prompt=$task_prompt,
      starter_files=$starter_files, objectives=$objectives, disclosure=$disclosure,
      allowed_resources=$allowed_resources, time_budget_min=$time_budget_min
  `);

  for (const c of campaigns) {
    stmt.run({
      $id: c.id,
      $title: c.title,
      $description: c.description,
      $task_prompt: c.taskPrompt,
      $starter_files: JSON.stringify(c.starterFiles),
      $objectives: JSON.stringify(c.objectives),
      $disclosure: JSON.stringify(c.disclosure),
      $allowed_resources: JSON.stringify(c.allowedResources),
      $time_budget_min: c.timeBudgetMin,
      $created_at: c.createdAt,
    });
    console.log("  seeded:", c.title);
  }

  // Flush WAL into the main db file so the app sees the rows immediately.
  try {
    db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  } catch {
    /* ignore */
  }

  const count = db.prepare("SELECT COUNT(*) AS n FROM campaigns").get();
  console.log(`Done. ${count.n} campaigns now in the database.`);
  db.close();
}

main();
