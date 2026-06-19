"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { HabitMonthDocument } from "@/types/habits";
import { getMonthKey, getMonthStartDateFromMonthKey } from "@/utils/date";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip);

type ExportDataModalProps = {
  onClose: () => void;
};

const DEFAULT_HABIT_PREFIX = "Habit ";

function isTracked(habitId: string, habitName: string): boolean {
  if (!habitId.startsWith("habit-")) return true;
  const suffix = habitId.slice("habit-".length);
  const index = Number(suffix);
  if (!Number.isFinite(index) || index <= 0) return true;
  return habitName.trim() !== `${DEFAULT_HABIT_PREFIX}${index}`;
}

function countOnesUpTo(bitstring: string, through: number): number {
  let count = 0;
  for (let i = 0; i < through && i < bitstring.length; i++) {
    if (bitstring[i] === "1") count++;
  }
  return count;
}

type HabitStat = {
  id: string;
  name: string;
  checks: number;
  possible: number;
  rate: number;
};

type MonthInsights = {
  monthLabel: string;
  overallRate: number;
  totalChecks: number;
  totalPossible: number;
  perfectDays: number;
  currentStreak: number;
  trackedCount: number;
  bestHabit: HabitStat | null;
  worstHabit: HabitStat | null;
  habitStats: HabitStat[];
  today: number;
  daysInMonth: number;
};

function computeInsights(doc: HabitMonthDocument): MonthInsights {
  const now = new Date();
  const monthKey = doc.monthKey;
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr);
  const monthIndex = parseInt(monthStr) - 1;

  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() === monthIndex;

  const today = isCurrentMonth ? now.getDate() : doc.daysInMonth;

  const tracked = doc.habits.filter((h) => isTracked(h.id, h.name));

  const habitStats: HabitStat[] = tracked.map((habit) => {
    const record = doc.recordsByHabitId[habit.id];
    const checks = record ? countOnesUpTo(record.checks, today) : 0;
    const possible = today;
    return {
      id: habit.id,
      name: habit.name,
      checks,
      possible,
      rate: possible > 0 ? checks / possible : 0,
    };
  });

  const totalChecks = habitStats.reduce((s, h) => s + h.checks, 0);
  const totalPossible = habitStats.reduce((s, h) => s + h.possible, 0);
  const overallRate = totalPossible > 0 ? totalChecks / totalPossible : 0;

  let perfectDays = 0;
  if (tracked.length > 0) {
    for (let day = 1; day <= today; day++) {
      const allDone = tracked.every((habit) => {
        const record = doc.recordsByHabitId[habit.id];
        return record?.checks[day - 1] === "1";
      });
      if (allDone) perfectDays++;
    }
  }

  let currentStreak = 0;
  if (tracked.length > 0) {
    for (let day = today; day >= 1; day--) {
      const allDone = tracked.every((habit) => {
        const record = doc.recordsByHabitId[habit.id];
        return record?.checks[day - 1] === "1";
      });
      if (allDone) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  const sorted = [...habitStats].sort((a, b) => b.rate - a.rate);
  const bestHabit = sorted.length > 0 && sorted[0].checks > 0 ? sorted[0] : null;
  const worstCandidates = sorted.filter((h) => h.checks < h.possible);
  const worstHabit = worstCandidates.length > 0 ? worstCandidates[worstCandidates.length - 1] : null;

  const monthStart = getMonthStartDateFromMonthKey(monthKey);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);

  return {
    monthLabel,
    overallRate,
    totalChecks,
    totalPossible,
    perfectDays,
    currentStreak,
    trackedCount: tracked.length,
    bestHabit,
    worstHabit,
    habitStats: sorted.filter((h) => h.checks > 0 || h.possible > 0).slice(0, 12),
    today,
    daysInMonth: doc.daysInMonth,
  };
}

export default function ExportDataModal({ onClose }: ExportDataModalProps) {
  const [doc, setDoc] = useState<HabitMonthDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const monthKey = getMonthKey(new Date());
    fetch(`/api/habits/${monthKey}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch habit data");
        return res.json() as Promise<{ document: HabitMonthDocument | null }>;
      })
      .then(({ document }) => {
        if (!document) throw new Error("No habit data found for this month");
        setDoc(document);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setIsLoading(false);
      });
  }, []);

  const insights = useMemo(() => {
    if (!doc) return null;
    return computeInsights(doc);
  }, [doc]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleDownload = async () => {
    if (!captureRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const bg = isDark ? "#0a0c0e" : "#f5f1ea";
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: bg,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `habit-report-${getMonthKey(new Date())}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // silently fail — download not critical
    } finally {
      setIsDownloading(false);
    }
  };

  const doughnutData = useMemo(() => {
    if (!insights) return null;
    const pct = Math.round(insights.overallRate * 100);
    return {
      datasets: [
        {
          data: [pct, 100 - pct],
          backgroundColor: ["rgba(47, 107, 97, 0.88)", "rgba(22, 32, 43, 0.10)"],
          borderWidth: 0,
          hoverOffset: 0,
        },
      ],
    };
  }, [insights]);

  const doughnutOptions = useMemo(
    () => ({
      cutout: "70%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    }),
    [],
  );

  const barData = useMemo(() => {
    if (!insights || insights.habitStats.length === 0) return null;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return {
      labels: insights.habitStats.map((h) =>
        h.name.length > 18 ? h.name.slice(0, 17) + "…" : h.name,
      ),
      datasets: [
        {
          data: insights.habitStats.map((h) => Math.round(h.rate * 100)),
          backgroundColor: insights.habitStats.map((h) => {
            const v = h.rate;
            if (v >= 0.8) return "rgba(47, 107, 97, 0.82)";
            if (v >= 0.5) return "rgba(47, 107, 97, 0.50)";
            return isDark ? "rgba(236, 242, 248, 0.18)" : "rgba(22, 32, 43, 0.14)";
          }),
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }, [insights]);

  const barOptions = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          min: 0,
          max: 100,
          grid: { display: false },
          ticks: { callback: (v: number | string) => `${v}%`, color: "rgba(128,128,128,0.7)", font: { size: 10 } },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: { color: "rgba(128,128,128,0.85)", font: { size: 11 } },
          border: { display: false },
        },
      },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    }),
    [],
  );

  const pct = insights ? Math.round(insights.overallRate * 100) : 0;

  return (
    <div
      ref={backdropRef}
      className="export-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="export-modal">
        {/* Header — outside capture so the download button doesn't appear in the image */}
        <div className="export-modal__topbar">
          <div className="export-modal__topbar-left">
            <span className="export-modal__eyebrow">Monthly Report</span>
            <h2 className="export-modal__title">
              {insights ? insights.monthLabel : "Loading…"}
            </h2>
          </div>
          <div className="export-modal__topbar-actions">
            <button
              type="button"
              className="export-modal__download-btn"
              onClick={handleDownload}
              disabled={isDownloading || isLoading || !!error}
              title="Download as image"
              aria-label="Download report as image"
            >
              {isDownloading ? (
                <span className="export-modal__spinner" aria-hidden="true" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 1v8M4 6l3 3 3-3" />
                  <path d="M1 11v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
                </svg>
              )}
              {isDownloading ? "Saving…" : "Download"}
            </button>
            <button
              type="button"
              className="export-modal__close"
              onClick={onClose}
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="export-modal__scroll">
          {isLoading && (
            <div className="export-modal__state">
              <div className="export-modal__loading-dots">
                <span /><span /><span />
              </div>
              <p>Loading your habit data…</p>
            </div>
          )}

          {error && (
            <div className="export-modal__state export-modal__state--error">
              <p>⚠ {error}</p>
            </div>
          )}

          {!isLoading && !error && insights && (
            <div ref={captureRef} className="export-modal__capture">
              {/* Capture header (shown in downloaded image) */}
              <div className="export-modal__capture-header">
                <span className="export-modal__capture-eyebrow">Monthly Report</span>
                <span className="export-modal__capture-month">{insights.monthLabel}</span>
                <span className="export-modal__capture-sub">
                  {insights.today} of {insights.daysInMonth} days elapsed · {insights.trackedCount} habit{insights.trackedCount !== 1 ? "s" : ""} tracked
                </span>
              </div>

              {/* Stat cards */}
              <div className="export-modal__stats">
                <div className="export-modal__stat">
                  <span className="export-modal__stat-value">{pct}%</span>
                  <span className="export-modal__stat-label">Overall rate</span>
                </div>
                <div className="export-modal__stat">
                  <span className="export-modal__stat-value">{insights.totalChecks}</span>
                  <span className="export-modal__stat-label">Total checks</span>
                </div>
                <div className="export-modal__stat">
                  <span className="export-modal__stat-value">{insights.perfectDays}</span>
                  <span className="export-modal__stat-label">Perfect days</span>
                </div>
                <div className="export-modal__stat">
                  <span className="export-modal__stat-value">{insights.currentStreak}</span>
                  <span className="export-modal__stat-label">Day streak</span>
                </div>
              </div>

              {/* Highlights */}
              {(insights.bestHabit || insights.worstHabit) && (
                <div className="export-modal__highlights">
                  {insights.bestHabit && (
                    <div className="export-modal__highlight export-modal__highlight--best">
                      <span className="export-modal__highlight-icon">🏆</span>
                      <div>
                        <p className="export-modal__highlight-tag">Most consistent</p>
                        <p className="export-modal__highlight-name">{insights.bestHabit.name}</p>
                        <p className="export-modal__highlight-meta">
                          {insights.bestHabit.checks}/{insights.bestHabit.possible} days
                          · {Math.round(insights.bestHabit.rate * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                  {insights.worstHabit && (
                    <div className="export-modal__highlight export-modal__highlight--worst">
                      <span className="export-modal__highlight-icon">📉</span>
                      <div>
                        <p className="export-modal__highlight-tag">Needs attention</p>
                        <p className="export-modal__highlight-name">{insights.worstHabit.name}</p>
                        <p className="export-modal__highlight-meta">
                          {insights.worstHabit.checks}/{insights.worstHabit.possible} days
                          · {Math.round(insights.worstHabit.rate * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Charts row */}
              <div className="export-modal__charts">
                {/* Doughnut */}
                <div className="export-modal__chart-box export-modal__chart-box--doughnut">
                  <p className="export-modal__chart-title">Completion</p>
                  <div className="export-modal__doughnut-wrap">
                    <Doughnut data={doughnutData!} options={doughnutOptions} />
                    <div className="export-modal__doughnut-center">
                      <span className="export-modal__doughnut-pct">{pct}%</span>
                      <span className="export-modal__doughnut-label">done</span>
                    </div>
                  </div>
                  <p className="export-modal__chart-sub">
                    {insights.totalChecks} / {insights.totalPossible} possible checks
                  </p>
                </div>

                {/* Bar chart */}
                {barData && insights.habitStats.length > 0 && (
                  <div className="export-modal__chart-box export-modal__chart-box--bar">
                    <p className="export-modal__chart-title">Per-habit breakdown</p>
                    <div
                      className="export-modal__bar-wrap"
                      style={{ height: Math.max(160, insights.habitStats.length * 28) }}
                    >
                      <Bar data={barData} options={barOptions} />
                    </div>
                  </div>
                )}

                {barData === null && insights.trackedCount === 0 && (
                  <div className="export-modal__chart-box export-modal__chart-box--empty">
                    <p className="export-modal__chart-empty">
                      Rename habits to start tracking them in your report.
                    </p>
                  </div>
                )}
              </div>

              {/* Key insights footer */}
              <div className="export-modal__key-insights">
                <p className="export-modal__key-insights-title">Key insights</p>
                <ul className="export-modal__key-insights-list">
                  {pct >= 80 && (
                    <li>You maintained an excellent overall rate of {pct}% this month.</li>
                  )}
                  {pct >= 50 && pct < 80 && (
                    <li>Good momentum at {pct}% — a few more consistent days can push you over 80%.</li>
                  )}
                  {pct < 50 && pct > 0 && (
                    <li>At {pct}%, there&apos;s room to grow — try focusing on 2–3 core habits first.</li>
                  )}
                  {insights.perfectDays >= 7 && (
                    <li>You had {insights.perfectDays} perfect days where every tracked habit was completed.</li>
                  )}
                  {insights.perfectDays > 0 && insights.perfectDays < 7 && (
                    <li>{insights.perfectDays} perfect day{insights.perfectDays > 1 ? "s" : ""} this month — those all-green days are your benchmark.</li>
                  )}
                  {insights.currentStreak >= 3 && (
                    <li>You&apos;re on a {insights.currentStreak}-day streak right now — keep it going!</li>
                  )}
                  {insights.bestHabit && insights.bestHabit.rate === 1 && (
                    <li><strong>{insights.bestHabit.name}</strong> is your most consistent habit — a perfect streak so far.</li>
                  )}
                  {insights.worstHabit && insights.worstHabit.rate < 0.4 && (
                    <li><strong>{insights.worstHabit.name}</strong> needs the most focus — only {Math.round(insights.worstHabit.rate * 100)}% completion.</li>
                  )}
                  {insights.totalChecks === 0 && (
                    <li>No tracked habits have been checked this month yet.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
