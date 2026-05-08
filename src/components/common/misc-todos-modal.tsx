"use client";

import { useEffect, useRef, useState } from "react";
import type { MiscTodo } from "@/types/misc-todos";
import { fetchMiscTodos, createMiscTodo, deleteMiscTodo } from "@/services/misc-todos-api";
import { getDaysElapsed } from "@/utils/date";

type MiscellaneousTodosModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MiscellaneousTodosModal({ isOpen, onClose }: MiscellaneousTodosModalProps) {
  const [todos, setTodos] = useState<MiscTodo[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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
      const newTodo = await createMiscTodo(taskInput.trim(), noteInput.trim() || undefined);
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

        <div className="misc-todos-list">
          {todos.length === 0 ? (
            <p className="misc-todos-empty">No todos yet. Add one above!</p>
          ) : (
            todos.map((todo) => (
              <div key={todo.id} className="misc-todos-item">
                <div className="misc-todos-item__content">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
