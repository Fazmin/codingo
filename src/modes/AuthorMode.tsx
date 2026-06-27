import { useEffect, useMemo, useState } from "react";
import {
  FileCode2,
  GraduationCap,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "../components/ui";
import { EditorPane } from "../components/EditorPane";
import {
  deleteCampaign,
  listCampaigns,
  saveCampaign,
} from "../lib/db/database";
import { useAppStore } from "../state/appStore";
import { cn, formatDate, uid } from "../lib/utils";
import type {
  Campaign,
  DisclosureLevel,
  Objective,
  StarterFile,
} from "../lib/types";

const LEVELS: DisclosureLevel[] = ["strict", "balanced", "permissive"];

function blankCampaign(): Campaign {
  return {
    id: uid("camp_"),
    title: "Untitled campaign",
    description: "",
    taskPrompt: "",
    starterFiles: [
      {
        name: "main.py",
        language: "python",
        content: "# Starter code\n\n",
      },
    ],
    objectives: [],
    disclosure: { default: "balanced", perObjective: {} },
    allowedResources: { languageDocs: true, openWeb: false },
    timeBudgetMin: null,
    createdAt: Date.now(),
  };
}

export function AuthorMode() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [draft, setDraft] = useState<Campaign>(() => blankCampaign());
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const goToLearn = useAppStore((s) => s.goToLearn);

  async function refresh() {
    setLoading(true);
    try {
      setCampaigns(await listCampaigns());
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function update(patch: Partial<Campaign>) {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  }

  async function handleSave() {
    await saveCampaign(draft);
    setSaved(true);
    await refresh();
  }

  function newCampaign() {
    setDraft(blankCampaign());
    setSaved(false);
  }

  async function handleDelete(id: string) {
    await deleteCampaign(id);
    if (draft.id === id) newCampaign();
    await refresh();
  }

  return (
    <>
      <PageHeader
        title="Author"
        subtitle="Design a reusable learning campaign for students to run."
        actions={
          <>
            <Button variant="secondary" onClick={newCampaign}>
              <Plus size={16} /> New
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await handleSave();
                goToLearn(draft.id);
              }}
            >
              <GraduationCap size={16} /> Save &amp; try
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save size={16} /> {saved ? "Saved" : "Save campaign"}
            </Button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <CampaignList
          campaigns={campaigns}
          activeId={draft.id}
          loading={loading}
          onSelect={(c) => {
            setDraft(c);
            setSaved(true);
          }}
          onDelete={handleDelete}
        />
        <div className="min-w-0 flex-1 overflow-y-auto">
          <CampaignForm draft={draft} update={update} setDraft={setDraft} />
        </div>
      </div>
    </>
  );
}

function CampaignList({
  campaigns,
  activeId,
  loading,
  onSelect,
  onDelete,
}: {
  campaigns: Campaign[];
  activeId: string;
  loading: boolean;
  onSelect: (c: Campaign) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-border bg-surface/40">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Campaigns ({campaigns.length})
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="px-3 py-2 text-sm text-fg-muted">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="px-3 py-2 text-sm text-fg-muted/70">
            No campaigns yet.
          </div>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                activeId === c.id
                  ? "bg-accent/10 text-accent"
                  : "text-fg hover:bg-surface-2",
              )}
              onClick={() => onSelect(c)}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.title}</div>
                <div className="truncate text-xs text-fg-muted">
                  {formatDate(c.createdAt)}
                </div>
              </div>
              <button
                className="opacity-0 transition-opacity group-hover:opacity-100 text-fg-muted hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CampaignForm({
  draft,
  update,
  setDraft,
}: {
  draft: Campaign;
  update: (patch: Partial<Campaign>) => void;
  setDraft: React.Dispatch<React.SetStateAction<Campaign>>;
}) {
  const [activeFile, setActiveFile] = useState(0);
  const file = draft.starterFiles[activeFile] ?? draft.starterFiles[0];

  function setObjectives(objectives: Objective[]) {
    setDraft((d) => ({ ...d, objectives }));
  }

  function addObjective() {
    setObjectives([...draft.objectives, { id: uid("obj_"), name: "" }]);
  }

  function updateFile(patch: Partial<StarterFile>) {
    setDraft((d) => {
      const files = [...d.starterFiles];
      files[activeFile] = { ...files[activeFile], ...patch };
      return { ...d, starterFiles: files };
    });
  }

  function addFile() {
    setDraft((d) => ({
      ...d,
      starterFiles: [
        ...d.starterFiles,
        { name: `file${d.starterFiles.length + 1}.py`, language: "python", content: "" },
      ],
    }));
    setActiveFile(draft.starterFiles.length);
  }

  function removeFile(idx: number) {
    setDraft((d) => ({
      ...d,
      starterFiles: d.starterFiles.filter((_, i) => i !== idx),
    }));
    setActiveFile(0);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-7 py-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </Field>
          <Field label="Description" hint="A short summary shown to the student.">
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </Field>
          <Field
            label="Task prompt"
            hint="What the student is asked to accomplish."
          >
            <Textarea
              rows={4}
              value={draft.taskPrompt}
              onChange={(e) => update({ taskPrompt: e.target.value })}
              placeholder="Write a function that..."
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            <FileCode2 size={15} /> Starter files
          </div>
          <Button size="sm" variant="ghost" onClick={addFile}>
            <Plus size={14} /> Add file
          </Button>
        </div>
        <div className="flex items-center gap-1 border-b border-border bg-surface-2/50 px-2 py-1.5">
          {draft.starterFiles.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFile(i)}
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                i === activeFile
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {f.name}
              {draft.starterFiles.length > 1 && (
                <X
                  size={12}
                  className="opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                />
              )}
            </button>
          ))}
        </div>
        {file && (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-border p-3">
              <Field label="File name">
                <Input
                  value={file.name}
                  onChange={(e) => updateFile({ name: e.target.value })}
                />
              </Field>
              <Field label="Language">
                <Select
                  value={file.language}
                  onChange={(e) =>
                    updateFile({
                      language: e.target.value as StarterFile["language"],
                    })
                  }
                >
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </Select>
              </Field>
            </div>
            <div className="h-64">
              <EditorPane
                value={file.content}
                language={file.language}
                onChange={(val) => updateFile({ content: val })}
              />
            </div>
          </>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">Learning objectives</h2>
            <p className="text-xs text-fg-muted">
              Named concepts. These drive the analysis heat-map.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={addObjective}>
            <Plus size={14} /> Add
          </Button>
        </div>
        {draft.objectives.length === 0 ? (
          <p className="text-sm text-fg-muted/70">
            No objectives yet. Add concepts like <code>loop-termination</code> or{" "}
            <code>off-by-one</code>.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {draft.objectives.map((o) => (
              <div key={o.id} className="flex items-center gap-2">
                <Input
                  value={o.name}
                  placeholder="objective-name"
                  onChange={(e) =>
                    setObjectives(
                      draft.objectives.map((x) =>
                        x.id === o.id ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                />
                <Select
                  className="w-40"
                  value={draft.disclosure.perObjective[o.id] ?? "inherit"}
                  onChange={(e) => {
                    const per = { ...draft.disclosure.perObjective };
                    if (e.target.value === "inherit") delete per[o.id];
                    else per[o.id] = e.target.value as DisclosureLevel;
                    update({
                      disclosure: { ...draft.disclosure, perObjective: per },
                    });
                  }}
                >
                  <option value="inherit">Inherit default</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
                <button
                  className="text-fg-muted hover:text-danger"
                  onClick={() =>
                    setObjectives(draft.objectives.filter((x) => x.id !== o.id))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-fg">Disclosure &amp; resources</h2>
        <p className="mb-4 text-xs text-fg-muted">
          The disclosure level caps how high the Socratic agent will climb the hint
          ladder.
        </p>
        <div className="flex flex-col gap-5">
          <Field label="Default disclosure level">
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() =>
                    update({ disclosure: { ...draft.disclosure, default: l } })
                  }
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    draft.disclosure.default === l
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-fg-muted/40",
                  )}
                >
                  <div className="text-sm font-medium capitalize text-fg">{l}</div>
                  <div className="text-xs text-fg-muted">
                    {l === "strict"
                      ? "Rarely past Rung 2"
                      : l === "balanced"
                        ? "Up to Rung 3"
                        : "Syntax at Rung 3-4"}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm text-fg">Language docs</span>
              <Toggle
                checked={draft.allowedResources.languageDocs}
                onChange={(v) =>
                  update({
                    allowedResources: {
                      ...draft.allowedResources,
                      languageDocs: v,
                    },
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <span className="text-sm text-fg">Open web</span>
              <Toggle
                checked={draft.allowedResources.openWeb}
                onChange={(v) =>
                  update({
                    allowedResources: {
                      ...draft.allowedResources,
                      openWeb: v,
                    },
                  })
                }
              />
            </div>
          </div>

          <Field label="Time budget (minutes, soft)" hint="Leave blank for none.">
            <Input
              type="number"
              min={0}
              value={draft.timeBudgetMin ?? ""}
              onChange={(e) =>
                update({
                  timeBudgetMin: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-40"
            />
          </Field>
        </div>
      </Card>

      <SummaryBar draft={draft} />
    </div>
  );
}

function SummaryBar({ draft }: { draft: Campaign }) {
  const objCount = useMemo(
    () => draft.objectives.filter((o) => o.name.trim()).length,
    [draft.objectives],
  );
  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      <Badge tone="accent">{objCount} objectives</Badge>
      <Badge>{draft.starterFiles.length} files</Badge>
      <Badge tone="warning">{draft.disclosure.default} default</Badge>
    </div>
  );
}
