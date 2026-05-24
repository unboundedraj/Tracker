"use client";

import { useState, useEffect } from "react";
import { RandomThought } from "@/types/random-thoughts";
import {
  fetchRandomThoughts,
  createRandomThought,
  updateRandomThought,
  deleteRandomThought,
} from "@/services/random-thoughts-api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RandomThoughtsModal({ isOpen, onClose }: Props) {
  const [thoughts, setThoughts] = useState<RandomThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newThought, setNewThought] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadThoughts();
  }, [isOpen]);

  async function loadThoughts() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRandomThoughts();
      setThoughts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load thoughts");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddThought() {
    if (!newThought.trim()) return;

    try {
      setError(null);
      const thought = await createRandomThought(newThought);
      setThoughts((prev) => [thought, ...prev]);
      setNewThought("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thought");
    }
  }

  async function handleDeleteThought(id: string) {
    try {
      setError(null);
      await deleteRandomThought(id);
      setThoughts((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thought");
    }
  }

  function toggleCompleted(thought: RandomThought) {
    updateRandomThought(thought.id, { isCompleted: !thought.isCompleted }).then(
      (updated) => {
        setThoughts((prev) =>
          prev
            .map((t) => (t.id === updated.id ? updated : t))
            .sort((a, b) => {
              if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
              }
              return b.sortOrder - a.sortOrder;
            })
        );
      }
    );
  }

  function syncItemSort(itemId: string, targetIndex: number) {
    const items = [...thoughts];
    const draggedIndex = items.findIndex((t) => t.id === itemId);
    if (draggedIndex === -1) return;

    const [movedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, movedItem);

    // Calculate new sortOrder with fractional values for smooth ordering
    const updatedItems = items.map((item, idx) => ({
      ...item,
      sortOrder: 1000 - idx * 0.1,
    }));

    setThoughts(updatedItems);

    // Sync to server
    if (updatedItems[targetIndex].id === itemId) {
      updateRandomThought(itemId, {
        sortOrder: updatedItems[targetIndex].sortOrder,
      }).catch(() => loadThoughts());
    }
  }

  function handleDragStart(e: React.DragEvent, thoughtId: string) {
    setDraggedItem(thoughtId);
    e.dataTransfer!.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";
  }

  function handleDropOnItem(
    e: React.DragEvent,
    targetThoughtId: string,
    targetIndex: number
  ) {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetThoughtId) {
      setDraggedItem(null);
      return;
    }

    syncItemSort(draggedItem, targetIndex);
    setDraggedItem(null);
  }

  if (!isOpen) return null;

  const activeThoughts = thoughts.filter((t) => !t.isCompleted);
  const completedThoughts = thoughts.filter((t) => t.isCompleted);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="random-thoughts-wrapper">
        <div className="random-thoughts-header">
          <h2 className="random-thoughts-title">💭 Random Thoughts</h2>
          <button
            onClick={onClose}
            className="random-thoughts-close-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="random-thoughts-error">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="random-thoughts-loading">Loading thoughts...</div>
        ) : (
          <>
            <div className="random-thoughts-section">
              <h3 className="random-thoughts-section-header">
                Thoughts ({activeThoughts.length})
              </h3>
              {activeThoughts.length === 0 ? (
                <div className="random-thoughts-empty-state">
                  📝 No thoughts yet. Add one to get started!
                </div>
              ) : (
                <div className="random-thoughts-lane">
                  {activeThoughts.map((thought, idx) => (
                    <div
                      key={thought.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, thought.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnItem(e, thought.id, idx)}
                      className={`random-thoughts-item ${
                        draggedItem === thought.id
                          ? "random-thoughts-item--dragging"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={thought.isCompleted}
                        onChange={() => toggleCompleted(thought)}
                        className="random-thoughts-checkbox"
                      />
                      <span className="random-thoughts-item-text">
                        {thought.content}
                      </span>
                      <button
                        onClick={() => handleDeleteThought(thought.id)}
                        className="random-thoughts-delete-btn"
                        aria-label="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {completedThoughts.length > 0 && (
              <div className="random-thoughts-section">
                <h3 className="random-thoughts-section-header">
                  ✓ Archived ({completedThoughts.length})
                </h3>
                <div className="random-thoughts-lane">
                  {completedThoughts.map((thought, idx) => (
                    <div
                      key={thought.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, thought.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) =>
                        handleDropOnItem(
                          e,
                          thought.id,
                          activeThoughts.length + idx
                        )
                      }
                      className={`random-thoughts-item random-thoughts-item--completed ${
                        draggedItem === thought.id
                          ? "random-thoughts-item--dragging"
                          : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={thought.isCompleted}
                        onChange={() => toggleCompleted(thought)}
                        className="random-thoughts-checkbox"
                      />
                      <span className="random-thoughts-item-text">
                        {thought.content}
                      </span>
                      <button
                        onClick={() => handleDeleteThought(thought.id)}
                        className="random-thoughts-delete-btn"
                        aria-label="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddThought();
              }}
              className="random-thoughts-form"
            >
              <input
                type="text"
                value={newThought}
                onChange={(e) => setNewThought(e.target.value)}
                placeholder="Capture a thought..."
                className="random-thoughts-input"
              />
              <button
                type="submit"
                disabled={!newThought.trim()}
                className="random-thoughts-submit"
              >
                Add
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
