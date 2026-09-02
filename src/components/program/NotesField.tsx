"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { Spinner } from "@/components/ui/Spinner";

interface NotesFieldProps {
  exerciseId: string;
  value: string;
  onSave: (exerciseId: string, text: string) => Promise<void>;
}

export function NotesField({ exerciseId, value, onSave }: NotesFieldProps) {
  const alerts = useAlerts();
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value, exerciseId]);

  async function commit() {
    if (draft === value) return;
    setSaving(true);
    try {
      await onSave(exerciseId, draft);
      alerts.success(draft.trim() ? "Note saved" : "Note cleared");
    } catch {
      alerts.danger("Couldn’t save note.", {
        id: "note-save-failed",
        title: "Save failed",
        durationMs: null,
        action: {
          label: "Retry",
          onClick: async () => {
            try {
              await onSave(exerciseId, draft);
              alerts.dismiss("note-save-failed");
              alerts.success(draft.trim() ? "Note saved" : "Note cleared");
            } catch {
              /* keep toast */
            }
          },
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
        Add field note
      </h2>
      <div className="flex items-stretch gap-2">
        <label className="sr-only" htmlFor={`note-${exerciseId}`}>
          Personal note for this exercise
        </label>
        <input
          id={`note-${exerciseId}`}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
          }}
          placeholder="Log form cue or adjustment..."
          className="min-h-12 flex-1 rounded-lg border border-border-subtle bg-base px-3 text-[15px] text-primary placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void commit()}
          disabled={saving || draft === value}
          className="flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground disabled:opacity-40"
          aria-label="Save note"
        >
          {saving ? (
            <Spinner
              size="sm"
              label="Saving"
              className="border-accent-foreground/30 border-t-accent-foreground"
            />
          ) : (
            <Plus className="h-5 w-5" />
          )}
        </button>
      </div>
    </section>
  );
}
