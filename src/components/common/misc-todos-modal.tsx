"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createMiscTodo, deleteMiscTodo, fetchMiscTodos, updateMiscTodo } from "@/services/misc-todos-api";
import type { MiscTodo, MiscTodoLevel } from "@/types/misc-todos";
import { getDaysElapsed } from "@/utils/date";

type MiscellaneousTodosModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MiscellaneousTodosModal({ isOpen, onClose }: MiscellaneousTodosModalProps) {
  const [todos, setTodos] = useState<MiscTodo[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const levelMeta: Record<
    MiscTodoLevel,
    { title: string; description: string }
  > = {
    high: { title: "High", description: "Do now" },
    medium: { title: "Medium", description: "Do next" },
    low: { title: "Low", description: "Do later" },
  };

  const levelOrder: MiscTodoLevel[] = ["high", "medium", "low"];

  const sortedTodos = useMemo(
    () => [...todos].sort((left, right) => {
      const levelDelta = levelOrder.indexOf(left.level) - levelOrder.indexOf(right.level);
      if (levelDelta !== 0) {
        return levelDelta;
      }

      if (left.sortOrder !== right.sortOrder) {
        return right.sortOrder - left.sortOrder;
      }

      return right.createdAt.localeCompare(left.createdAt);
    }),
    [levelOrder, todos]
  );

  const todosByLevel = useMemo(
    () =>
      levelOrder.reduce<Record<MiscTodoLevel, MiscTodo[]>>(
        (accumulator, level) => {
          accumulator[level] = sortedTodos.filter((todo) => todo.level === level);
          return accumulator;
        },
        { high: [], medium: [], low: [] }
      ),
    [levelOrder, sortedTodos]
  );

  // Load todos on mount or when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadTodos = async () => {
      try {
        setError(null);
        const data = await fetchMiscTodos();
        setTodos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load todos");
      }
    };

    loadTodos();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDraggedTodoId(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleAddTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!taskInput.trim()) {
      setError("Task cannot be empty");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newTodo = await createMiscTodo(taskInput.trim(), noteInput.trim() || undefined, "medium");
      setTodos([newTodo, ...todos]);
      setTaskInput("");
      setNoteInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    setError(null);

    try {
      await deleteMiscTodo(id);
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete todo");
    }
  };

  const syncTodoLevel = async (todo: MiscTodo, level: MiscTodoLevel, sortOrder: number) => {
    const previousTodos = todos;

    setTodos((currentTodos) =>
      currentTodos.map((currentTodo) =>
        currentTodo.id === todo.id ? { ...currentTodo, level, sortOrder } : currentTodo
      )
    );

    try {
      const updatedTodo = await updateMiscTodo(todo.id, { level, sortOrder });
      setTodos((currentTodos) =>
        currentTodos.map((currentTodo) => (currentTodo.id === updatedTodo.id ? updatedTodo : currentTodo))
      );
    } catch (err) {
      setTodos(previousTodos);
      setError(err instanceof Error ? err.message : "Failed to update todo");
    }
  };

  const getDropSortOrder = (targetLevelTodos: MiscTodo[], targetIndex: number): number => {
    const previousTodo = targetLevelTodos[targetIndex - 1];
    const nextTodo = targetLevelTodos[targetIndex];

    if (previousTodo && nextTodo) {
      return (previousTodo.sortOrder + nextTodo.sortOrder) / 2;
    }

    if (previousTodo) {
      return previousTodo.sortOrder - 1;
    }

    if (nextTodo) {
      return nextTodo.sortOrder + 1;
    }

    return Date.now();
  };

  const handleLaneDrop = (event: React.DragEvent<HTMLElement>, level: MiscTodoLevel) => {
    event.preventDefault();
    const draggedTodo = todos.find((todo) => todo.id === draggedTodoId);

    if (!draggedTodo) {
      return;
    }

    const laneTodos = todosByLevel[level].filter((todo) => todo.id !== draggedTodo.id);
    const sortOrder = getDropSortOrder(laneTodos, laneTodos.length);
    void syncTodoLevel(draggedTodo, level, sortOrder);
  };

  const handleItemDrop = (
    event: React.DragEvent<HTMLDivElement>,
    level: MiscTodoLevel,
    targetIndex: number,
    targetTodoId: string
  ) => {
    event.preventDefault();
    const draggedTodo = todos.find((todo) => todo.id === draggedTodoId);

    if (!draggedTodo || draggedTodo.id === targetTodoId) {
      return;
    }

    const laneTodos = todosByLevel[level].filter((todo) => todo.id !== draggedTodo.id);
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAt = event.clientY < bounds.top + bounds.height / 2 ? targetIndex : targetIndex + 1;
    const sortOrder = getDropSortOrder(laneTodos, insertAt);

    void syncTodoLevel(draggedTodo, level, sortOrder);
  };

  const renderTodoCard = (todo: MiscTodo, level: MiscTodoLevel, index: number) => (
    <div
      key={todo.id}
      className={`misc-todos-item misc-todos-item--draggable${draggedTodoId === todo.id ? " misc-todos-item--dragging" : ""}`}
      draggable
      onDragStart={() => setDraggedTodoId(todo.id)}
      onDragEnd={() => setDraggedTodoId(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleItemDrop(event, level, index, todo.id)}
      aria-grabbed={draggedTodoId === todo.id}
    >
      <div className="misc-todos-item__content">
        <div className="misc-todos-item__badge">{levelMeta[level].title}</div>
        <div className="misc-todos-item__task">{todo.task}</div>
        {todo.note && <div className="misc-todos-item__note">{todo.note}</div>}
        <div className="misc-todos-item__time">{getDaysElapsed(todo.createdAt)} days ago</div>
      </div>
      <button
        type="button"
        className="misc-todos-item__delete"
        onClick={() => handleDeleteTodo(todo.id)}
        aria-label="Delete todo"
      >
        ✓
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="misc-todos-modal-backdrop" onClick={handleBackdropClick}>
      <div className="misc-todos-modal">
        <div className="misc-todos-modal__header">
          <h2 className="misc-todos-modal__title">Miscellaneous Todos</h2>
          <button type="button" className="misc-todos-modal__close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleAddTodo} className="misc-todos-form">
          <div className="misc-todos-form__group">
            <input
              type="text"
              className="misc-todos-form__input"
              placeholder="Add a task..."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="misc-todos-form__group">
            <textarea
              className="misc-todos-form__textarea"
              placeholder="Add a note (optional)..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              disabled={isLoading}
              rows={2}
            />
          </div>

          {error && <div className="misc-todos-error">{error}</div>}

          <button type="submit" className="misc-todos-form__submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add Todo"}
          </button>
        </form>

        <div className="misc-todos-board">
          {levelOrder.map((level) => {
            const laneTodos = todosByLevel[level];

            return (
              <section
                key={level}
                className={`misc-todos-lane misc-todos-lane--${level}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleLaneDrop(event, level)}
              >
                <div className="misc-todos-lane__header">
                  <div>
                    <h3 className="misc-todos-lane__title">{levelMeta[level].title}</h3>
                    <p className="misc-todos-lane__description">{levelMeta[level].description}</p>
                  </div>
                  <span className="misc-todos-lane__count">{laneTodos.length}</span>
                </div>

                <div className="misc-todos-lane__list">
                  {laneTodos.length === 0 ? (
                    <p className="misc-todos-empty">Drop a todo here.</p>
                  ) : (
                    laneTodos.map((todo, index) => renderTodoCard(todo, level, index))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
