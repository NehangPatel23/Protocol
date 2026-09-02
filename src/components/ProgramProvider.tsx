"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePrefs } from "@/components/PrefsProvider";
import {
  loadCalendar,
  loadCycle,
  mergeCalendarWrite,
  markRecoveryOnCalendar,
  clearRecoveryDate,
  saveCalendar,
  saveCycle,
} from "@/lib/db/cycle";
import { loadSoreness, saveSoreness, upsertSoreness } from "@/lib/db/soreness";
import type { CardioLog, SorenessRecord } from "@/lib/db/cardio";
import { loadSession, upsertSessionCardio } from "@/lib/db/sessions";
import {
  daysForExercise,
  loadAllNotes,
  loadProgram,
  saveNote as persistNote,
} from "@/lib/db/program";
import {
  appendSet,
  loadAllHistory,
  localDateKey,
  newSetId,
  removeSet,
  saveExerciseHistory,
  type HistoryEntry,
  type HistorySet,
} from "@/lib/db/history";
import {
  bootCycle,
  initialCycleState,
  nextCycleStartDate,
  persistExplicitStart,
  revertRecoveryDay as revertRecoveryState,
  shiftPendingToTomorrow,
  type CalendarEntry,
  type CycleState,
} from "@/lib/program/cycle";
import { CYCLE_DAYS } from "@/lib/program/days";
import { buildProgramFromSeed, validateProgram } from "@/lib/program/seed";
import type { DayKey, ProgramRecord } from "@/lib/program/types";

export interface ProgramContextValue {
  program: ProgramRecord;
  notes: Record<string, string>;
  history: Record<string, HistoryEntry[]>;
  calendar: Record<string, CalendarEntry>;
  cycle: CycleState;
  soreness: Record<string, SorenessRecord>;
  todayKey: DayKey;
  todaySlot: number;
  ready: boolean;
  saveNote: (exerciseId: string, text: string) => Promise<void>;
  logSet: (
    exerciseId: string,
    input: { weightKg: number; reps: number; dayKey?: DayKey },
  ) => Promise<void>;
  deleteSet: (exerciseId: string, setId: string) => Promise<void>;
  logRecoveryDay: (cardio?: CardioLog | null) => Promise<void>;
  revertRecoveryDay: () => Promise<void>;
  logFinisherCardio: (dayKey: DayKey, cardio: CardioLog) => Promise<void>;
  startProgramToday: () => Promise<void>;
  daysFor: (exerciseId: string) => DayKey[];
}

const ProgramContext = createContext<ProgramContextValue | null>(null);

export function ProgramProvider({ children }: { children: ReactNode }) {
  const { persistenceOk, ready: prefsReady, prefs, updatePrefs } = usePrefs();
  const [program, setProgram] = useState<ProgramRecord>(() =>
    buildProgramFromSeed(),
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [calendar, setCalendar] = useState<Record<string, CalendarEntry>>({});
  const [soreness, setSoreness] = useState<Record<string, SorenessRecord>>({});
  const today = localDateKey();
  const [cycle, setCycle] = useState<CycleState>(() => initialCycleState(today));
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

  useEffect(() => {
    if (!prefsReady) return;
    // Avoid re-entrant boot when prefs updates (e.g. cycleStartDate) fire.
    if (booted.current) return;

    let cancelled = false;
    (async () => {
      const seeded = buildProgramFromSeed();
      if (process.env.NODE_ENV === "development") {
        const errors = validateProgram(seeded);
        if (errors.length) console.error("[protocol/program]", errors);
      }
      if (persistenceOk === false) {
        if (!cancelled) {
          setProgram(seeded);
          const order =
            seeded.cycleOrder.length >= 7 ? seeded.cycleOrder : CYCLE_DAYS;
          const evaluated = bootCycle(
            null,
            {},
            prefs.cycleStartDate,
            localDateKey(),
            order,
          );
          setCycle(evaluated.state);
          booted.current = true;
          setReady(true);
        }
        return;
      }
      try {
        const [
          loaded,
          loadedNotes,
          loadedHistory,
          storedCycle,
          storedCalendar,
          storedSoreness,
        ] = await Promise.all([
          loadProgram(),
          loadAllNotes(),
          loadAllHistory(),
          loadCycle(),
          loadCalendar(),
          loadSoreness(),
        ]);
        if (cancelled) return;
        setProgram(loaded);
        setNotes(loadedNotes);
        setHistory(loadedHistory);
        setSoreness(storedSoreness);
        const todayKey = localDateKey();
        const order =
          loaded.cycleOrder.length >= 7 ? loaded.cycleOrder : CYCLE_DAYS;
        const evaluated = bootCycle(
          storedCycle,
          storedCalendar,
          prefs.cycleStartDate,
          todayKey,
          order,
        );
        let nextCalendar = storedCalendar;
        for (const w of evaluated.writes) {
          nextCalendar = mergeCalendarWrite(nextCalendar, w.date, w.entry);
        }
        if (cancelled) return;
        // Persist (when needed) before painting so Home cannot show a started
        // cycle that IndexedDB never received.
        if (evaluated.state.started === true || evaluated.writes.length > 0) {
          await saveCycle(evaluated.state);
          await saveCalendar(nextCalendar);
        }
        if (cancelled) return;
        setCycle(evaluated.state);
        setCalendar(nextCalendar);
        booted.current = true;
        setReady(true);
      } catch (err) {
        console.error("[protocol/program] load failed, using seed", err);
        if (!cancelled) {
          setProgram(seeded);
          booted.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally omit prefs.cycleStartDate — boot must not write it,
    // and a later hydrate must not re-run start logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot once per prefsReady/persistenceOk
  }, [prefsReady, persistenceOk]);

  const saveNote = useCallback(
    async (exerciseId: string, text: string) => {
      if (persistenceOk !== false) {
        try {
          await persistNote(exerciseId, text);
        } catch (err) {
          console.error("[protocol/program] note save failed", err);
          throw err;
        }
      }
      setNotes((prev) => {
        const next = { ...prev };
        if (text.trim() === "") delete next[exerciseId];
        else next[exerciseId] = text;
        return next;
      });
    },
    [persistenceOk],
  );

  const logSet = useCallback(
    async (
      exerciseId: string,
      input: { weightKg: number; reps: number; dayKey?: DayKey },
    ) => {
      const set: HistorySet = {
        id: newSetId(),
        weightKg: input.weightKg,
        reps: input.reps,
        loggedAt: new Date().toISOString(),
      };
      const date = localDateKey();
      const nextEntries = appendSet(
        history[exerciseId] ?? [],
        set,
        date,
        input.dayKey,
      );
      if (persistenceOk !== false) {
        try {
          await saveExerciseHistory(exerciseId, nextEntries);
        } catch (err) {
          console.error("[protocol/program] set log failed", err);
          throw err;
        }
      }
      setHistory((prev) => ({ ...prev, [exerciseId]: nextEntries }));
    },
    [history, persistenceOk],
  );

  const deleteSet = useCallback(
    async (exerciseId: string, setId: string) => {
      const nextEntries = removeSet(history[exerciseId] ?? [], setId);
      if (persistenceOk !== false) {
        try {
          await saveExerciseHistory(exerciseId, nextEntries);
        } catch (err) {
          console.error("[protocol/program] set delete failed", err);
          throw err;
        }
      }
      setHistory((prev) => {
        const next = { ...prev };
        if (nextEntries.length === 0) delete next[exerciseId];
        else next[exerciseId] = nextEntries;
        return next;
      });
    },
    [history, persistenceOk],
  );
  const daysFor = useCallback(
    (exerciseId: string) => daysForExercise(program, exerciseId),
    [program],
  );

  const logRecoveryDay = useCallback(
    async (cardio?: CardioLog | null) => {
      const date = localDateKey();
      const cycleOrder =
        program.cycleOrder.length >= 7 ? program.cycleOrder : CYCLE_DAYS;
      const originalDayKey: DayKey = cycleOrder[cycle.pointerIndex] ?? "push";
      const nextCycle = shiftPendingToTomorrow(cycle, date);
      const nextCalendar = markRecoveryOnCalendar(calendar, date);
      const nextSoreness = upsertSoreness(soreness, date, {
        markedSore: true,
        originalDayKey,
        cardioLogged: cardio ?? null,
        reversedSameDay: false,
      });
      if (persistenceOk !== false) {
        await saveCycle(nextCycle);
        await saveCalendar(nextCalendar);
        await saveSoreness(nextSoreness);
        const storedCal = await loadCalendar();
        if (storedCal[date]?.status !== "recovery") {
          throw new Error("[protocol/program] recovery did not persist");
        }
      }
      setCycle(nextCycle);
      setCalendar(nextCalendar);
      setSoreness(nextSoreness);
    },
    [calendar, cycle, persistenceOk, program.cycleOrder, soreness],
  );

  const revertRecoveryDay = useCallback(async () => {
    const date = localDateKey();
    const nextCycle = revertRecoveryState(cycle, date);
    const nextCalendar = clearRecoveryDate(calendar, date);
    const existing = soreness[date];
    const nextSoreness = existing
      ? upsertSoreness(soreness, date, {
          ...existing,
          reversedSameDay: true,
        })
      : soreness;
    if (persistenceOk !== false) {
      await saveCycle(nextCycle);
      await saveCalendar(nextCalendar);
      if (nextSoreness !== soreness) await saveSoreness(nextSoreness);
      const storedCal = await loadCalendar();
      if (storedCal[date]?.status === "recovery") {
        throw new Error("[protocol/program] recovery revert did not persist");
      }
    }
    setCycle(nextCycle);
    setCalendar(nextCalendar);
    setSoreness(nextSoreness);
  }, [calendar, cycle, persistenceOk, soreness]);

  const logFinisherCardio = useCallback(
    async (dayKey: DayKey, cardio: CardioLog) => {
      const date = localDateKey();
      if (persistenceOk === false) {
        throw new Error("[protocol/program] persistence unavailable");
      }
      await upsertSessionCardio(date, dayKey, cardio);
      const stored = await loadSession(date);
      if (stored?.cardio == null) {
        throw new Error("[protocol/program] finisher did not persist");
      }
    },
    [persistenceOk],
  );

  const startProgramToday = useCallback(async () => {
    if (cycle.started === true) return;
    const todayKey = localDateKey();
    const order =
      program.cycleOrder.length >= 7 ? program.cycleOrder : CYCLE_DAYS;

    // Do not branch on persistenceOk. A stale `false` (probe timeout after
    // Clear site data, or a blocked versionchange) used to setCycle in
    // memory and return — Home showed Push Day, cycle store stayed empty,
    // nothing threw. persistExplicitStart is the only success path.
    const stored = await persistExplicitStart(todayKey, order, {
      save: saveCycle,
      load: loadCycle,
    });
    setCycle(stored);
    if (!prefs.cycleStartDate) {
      await updatePrefs({
        cycleStartDate: nextCycleStartDate(prefs.cycleStartDate, todayKey),
      });
    }
  }, [
    cycle.started,
    prefs.cycleStartDate,
    program.cycleOrder,
    updatePrefs,
  ]);

  const order =
    program.cycleOrder.length >= 7 ? program.cycleOrder : CYCLE_DAYS;
  const todaySlot = cycle.pointerIndex;
  const todayKey: DayKey = order[todaySlot] ?? "push";

  const value = useMemo<ProgramContextValue>(
    () => ({
      program,
      notes,
      history,
      calendar,
      cycle,
      soreness,
      todayKey,
      todaySlot,
      ready,
      saveNote,
      logSet,
      deleteSet,
      logRecoveryDay,
      revertRecoveryDay,
      logFinisherCardio,
      startProgramToday,
      daysFor,
    }),
    [
      program,
      notes,
      history,
      calendar,
      cycle,
      soreness,
      todayKey,
      todaySlot,
      ready,
      saveNote,
      logSet,
      deleteSet,
      logRecoveryDay,
      revertRecoveryDay,
      logFinisherCardio,
      startProgramToday,
      daysFor,
    ],
  );

  return (
    <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
  );
}

export function useProgram(): ProgramContextValue {
  const ctx = useContext(ProgramContext);
  if (!ctx) {
    throw new Error("useProgram must be used within ProgramProvider");
  }
  return ctx;
}
