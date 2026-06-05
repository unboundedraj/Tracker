"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTodaysAgendaItem,
  deleteTodaysAgendaItem,
  fetchTodaysAgendaItems,
  updateTodaysAgendaItem,
} from "@/services/todays-agenda-api";
import type { TodaysAgendaItem } from "@/types/todays-agenda";
import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip);

type TodaysAgendaModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatTimeLeft(expiresAt: string, nowMs: number): string {
  const remainingMs = new Date(expiresAt).getTime() - nowMs;

  if (remainingMs <= 0) {
    return "expires now";
  }

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m left`;
  }

  return `${hours}h ${minutes}m left`;
}

export default function TodaysAgendaModal({ isOpen, onClose }: TodaysAgendaModalProps) {
  const [items, setItems] = useState<TodaysAgendaItem[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadItems = async () => {
      try {
        setError(null);
        const data = await fetchTodaysAgendaItems();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agenda");
      }
    };

    loadItems();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isOpen]);

  const activeItems = useMemo(() => {
    return [...items]
      .filter((item) => new Date(item.expiresAt).getTime() > nowMs)
      .sort((left, right) => {
        if (left.isCompleted !== right.isCompleted) {
          return left.isCompleted ? 1 : -1;
        }

        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [items, nowMs]);

  const completedCount = useMemo(
    () => activeItems.filter((item) => item.isCompleted).length,
    [activeItems]
  );
  const totalCount = activeItems.length;
  const completionPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const chartData = useMemo(
    () => ({
      datasets: [
        {
          data: [completedCount, Math.max(totalCount - completedCount, 0)],
          backgroundColor: ["rgba(47, 107, 97, 0.88)", "rgba(22, 32, 43, 0.18)"],
          borderWidth: 0,
          hoverOffset: 0,
        },
      ],
    }),
    [completedCount, totalCount]
  );
  const chartOptions = useMemo(
    () => ({
      cutout: "72%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: totalCount > 0 },
      },
    }),
    [totalCount]
  );

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === modalRef.current) {
      onClose();
    }
  };

  const handleAddItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!taskInput.trim()) {
      setError("Task cannot be empty");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newItem = await createTodaysAgendaItem(taskInput.trim());
      setItems((previous) => [newItem, ...previous]);
      setTaskInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);

    try {
      await deleteTodaysAgendaItem(id);
      setItems((previous) => previous.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleToggleCompleted = async (item: TodaysAgendaItem) => {
    const previousItems = items;
    const nextCompleted = !item.isCompleted;

    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, isCompleted: nextCompleted } : currentItem
      )
    );

    try {
      const updated = await updateTodaysAgendaItem(item.id, { isCompleted: nextCompleted });
      setItems((currentItems) =>
        currentItems.map((currentItem) => (currentItem.id === updated.id ? updated : currentItem))
      );
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Failed to update task");
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="misc-todos-modal-backdrop" onClick={handleBackdropClick}>
      <div className="todays-agenda-wrapper">
        <div className="todays-agenda-header">
          <h2 className="todays-agenda-title">Today&apos;s Agenda</h2>
          <button
            type="button"
            className="todays-agenda-close"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="todays-agenda-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <div className="todays-agenda-body">
          <div className="todays-agenda-progress">
            <div className="todays-agenda-progress__chart-wrap">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="todays-agenda-progress__center">
                <span className="todays-agenda-progress__value">{completionPercent}%</span>
                <span className="todays-agenda-progress__label">done</span>
              </div>
            </div>
            <div className="todays-agenda-progress__meta">
              <p>{completedCount} of {totalCount} tasks completed</p>
              <p className="todays-agenda-progress__hint">Tasks auto-expire 24 hours after creation</p>
            </div>
          </div>

          {activeItems.length === 0 ? (
            <div className="todays-agenda-empty">
              <p>No agenda tasks yet.</p>
              <p className="todays-agenda-empty-hint">Anything added here will auto-expire after 24 hours.</p>
            </div>
          ) : (
            <ul className="todays-agenda-list">
              {activeItems.map((item) => (
                <li key={item.id} className={`todays-agenda-item ${item.isCompleted ? "todays-agenda-item--completed" : ""}`}>
                  <button
                    type="button"
                    className={`todays-agenda-item__toggle ${item.isCompleted ? "is-completed" : ""}`}
                    onClick={() => handleToggleCompleted(item)}
                    aria-label={item.isCompleted ? "Mark task as not done" : "Mark task as done"}
                    title={item.isCompleted ? "Mark as not done" : "Mark as done"}
                  >
                    {item.isCompleted ? "✓" : "○"}
                  </button>
                  <div className="todays-agenda-item__content">
                    <p className="todays-agenda-item__task">{item.task}</p>
                    <p className="todays-agenda-item__meta">{formatTimeLeft(item.expiresAt, nowMs)}</p>
                  </div>
                  <button
                    type="button"
                    className="todays-agenda-item__delete"
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label="Delete task"
                    title="Delete task"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAddItem} className="todays-agenda-form">
          <input
            type="text"
            className="todays-agenda-input"
            placeholder="Add a task for today..."
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="todays-agenda-submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
}
