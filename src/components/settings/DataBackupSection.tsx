"use client";

import { Download, Eye, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useAlerts } from "@/components/alerts/AlertProvider";
import { usePrefs } from "@/components/PrefsProvider";
import { BackupPreviewView } from "@/components/settings/BackupPreviewView";
import {
  BackupError,
  backupFilename,
  buildBackupFile,
  loadDeviceSnapshot,
  parseBackupForView,
  planRestore,
  restoreBackup,
  serializeBackup,
  shareOrDownloadBackup,
  type BackupFileV1,
  type RestorePreview,
} from "@/lib/backup";

export function DataBackupSection() {
  const alerts = useAlerts();
  const { prefs } = usePrefs();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const viewInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingRaw, setPendingRaw] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFileV1 | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<RestorePreview | null>(
    null,
  );
  const [viewerBackup, setViewerBackup] = useState<BackupFileV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setError(null);
    try {
      const backup = await buildBackupFile();
      const contents = serializeBackup(backup);
      const filename = backupFilename();
      const delivery = await shareOrDownloadBackup(contents, filename);
      alerts.success(
        delivery === "share"
          ? "Use Save to Files in the share sheet to keep your backup."
          : "Backup file saved to your downloads.",
        { title: "Backup ready" },
      );
    } catch (err) {
      if (isAbort(err)) return;
      console.error("[protocol/backup] export failed", err);
      alerts.danger("Couldn’t export a backup.", { title: "Export failed" });
    } finally {
      setExporting(false);
    }
  }

  async function handleViewFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      // Validate-only — works on empty or non-empty devices; never writes.
      const backup = parseBackupForView(text);
      setViewerBackup(backup);
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Couldn’t read that backup file.";
      setError(message);
      alerts.danger(message, { title: "Preview blocked" });
    } finally {
      if (viewInputRef.current) viewInputRef.current.value = "";
    }
  }

  async function handleRestoreFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setRestoreSummary(null);
    setPendingRaw(null);
    setPendingBackup(null);
    try {
      const text = await file.text();
      const device = await loadDeviceSnapshot();
      const plan = planRestore(text, device);
      setPendingRaw(text);
      setPendingBackup(plan.backup);
      setRestoreSummary(plan.preview);
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Couldn’t read that backup file.";
      setError(message);
      alerts.danger(message, { title: "Restore blocked" });
    } finally {
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  }

  async function confirmRestore() {
    if (!pendingRaw || importing) return;
    setImporting(true);
    try {
      await restoreBackup(pendingRaw);
      alerts.success("Backup restored. Reloading…", {
        title: "Restore complete",
      });
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Couldn’t restore that backup.";
      setError(message);
      alerts.danger(`${message} Existing data was left untouched.`, {
        title: "Restore failed",
      });
      setRestoreSummary(null);
      setPendingRaw(null);
      setPendingBackup(null);
    } finally {
      setImporting(false);
    }
  }

  function cancelRestoreDialog() {
    setRestoreSummary(null);
    setPendingRaw(null);
    setPendingBackup(null);
  }

  function openViewerFromRestore() {
    if (!pendingBackup) return;
    setViewerBackup(pendingBackup);
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-border-subtle bg-surface"
      data-testid="settings-data-backup"
    >
      <h2 className="border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Data
      </h2>
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-[13px] text-secondary">
          Backups are an unencrypted local JSON file with your training history.
          Where you save or share that file is up to you — this is not a secure
          cloud backup.
        </p>
        <p className="text-[13px] text-secondary">
          Restore only works on a fresh install (no calendar days, sessions,
          exercise history, or started cycle). You can preview any valid backup
          without saving it.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            data-testid="settings-export-backup"
            disabled={exporting}
            onClick={() => void handleExport()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base px-4 text-[14px] font-semibold text-primary disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden />
            {exporting ? "Exporting…" : "Export backup"}
          </button>
          <button
            type="button"
            data-testid="settings-view-backup"
            onClick={() => viewInputRef.current?.click()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base px-4 text-[14px] font-semibold text-primary"
          >
            <Eye className="h-4 w-4" aria-hidden />
            View backup
          </button>
          <button
            type="button"
            data-testid="settings-import-backup"
            onClick={() => restoreInputRef.current?.click()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base px-4 text-[14px] font-semibold text-primary"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Restore backup
          </button>
          <input
            ref={viewInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="settings-view-file"
            onChange={(e) => void handleViewFile(e.target.files?.[0])}
          />
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            data-testid="settings-import-file"
            onChange={(e) => void handleRestoreFile(e.target.files?.[0])}
          />
        </div>

        {error ? (
          <div
            role="alert"
            data-testid="settings-import-error"
            className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-[13px] text-danger"
          >
            {error}
            <p className="mt-1 text-secondary">
              Existing data was left untouched.
            </p>
          </div>
        ) : null}
      </div>

      {restoreSummary ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-base/70 p-4 md:items-center"
          role="presentation"
          onClick={() => !importing && cancelRestoreDialog()}
        >
          <div
            role="dialog"
            aria-labelledby="restore-preview-title"
            data-testid="settings-restore-preview"
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-border-subtle bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="restore-preview-title"
              className="text-[18px] font-semibold text-primary"
            >
              Restore this backup?
            </h2>
            <dl className="mt-3 space-y-2 text-[14px]">
              <PreviewRow
                label="Exported"
                value={formatExportedAt(restoreSummary.exportedAt)}
              />
              <PreviewRow label="App version" value={restoreSummary.appVersion} />
              <PreviewRow
                label="Sessions"
                value={String(restoreSummary.sessionCount)}
              />
              <PreviewRow
                label="Exercise histories"
                value={String(restoreSummary.exerciseHistoryCount)}
              />
              <PreviewRow
                label="Calendar days"
                value={String(restoreSummary.calendarDayCount)}
              />
              <PreviewRow
                label="Date range"
                value={formatDateRange(restoreSummary.dateRange)}
              />
              <PreviewRow
                label="Program"
                value={
                  restoreSummary.programIncluded
                    ? "Includes your edited program"
                    : "Seed program (re-seeded on restore)"
                }
              />
              <PreviewRow
                label="Active session"
                value={restoreSummary.activeSession.reason}
              />
            </dl>
            <button
              type="button"
              data-testid="settings-restore-open-viewer"
              disabled={importing || !pendingBackup}
              onClick={openViewerFromRestore}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-base text-[14px] font-semibold text-primary disabled:opacity-60"
            >
              <Eye className="h-4 w-4" aria-hidden />
              Preview backup
            </button>
            <button
              type="button"
              data-testid="settings-restore-confirm"
              disabled={importing}
              onClick={() => void confirmRestore()}
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold uppercase tracking-[0.08em] text-accent-foreground disabled:opacity-60"
            >
              {importing ? "Restoring…" : "Restore backup"}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={cancelRestoreDialog}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-[15px] font-medium text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {viewerBackup ? (
        <BackupPreviewView
          backup={viewerBackup}
          fallbackUnits={prefs.units}
          onClose={() => setViewerBackup(null)}
        />
      ) : null}
    </section>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border-subtle pb-2 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="text-secondary">{value}</dd>
    </div>
  );
}

function formatExportedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatDateRange(range: RestorePreview["dateRange"]): string {
  if (!range.earliest && !range.latest) return "None";
  if (range.earliest === range.latest) return range.earliest ?? "None";
  return `${range.earliest} → ${range.latest}`;
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
