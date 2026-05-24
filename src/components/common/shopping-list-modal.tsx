"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createShoppingItem,
  deleteShoppingItem,
  fetchShoppingItems,
  updateShoppingItem,
} from "@/services/shopping-list-api";
import type { ShoppingItem } from "@/types/shopping-list";

type ShoppingListModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ShoppingListModal({ isOpen, onClose }: ShoppingListModalProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const sortOrderCounterRef = useRef(0);

  const activeItems = useMemo(
    () => [...items].filter((i) => !i.isCompleted).sort((left, right) => right.sortOrder - left.sortOrder),
    [items]
  );
  
  const completedItems = useMemo(
    () => [...items].filter((i) => i.isCompleted).sort((left, right) => right.sortOrder - left.sortOrder),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;
    const loadItems = async () => {
      try {
        setError(null);
        const data = await fetchShoppingItems();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shopping list");
      }
    };
    loadItems();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      setShowForm(false);
      setDraggedItemId(null);
      onClose();
    }
  };

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError("Item name cannot be empty");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newItem = await createShoppingItem(nameInput.trim());
      setItems([newItem, ...items]);
      setNameInput("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    try {
      await deleteShoppingItem(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const toggleCompleted = async (item: ShoppingItem) => {
    const isCompleted = !item.isCompleted;
    const previousItems = items;
    setItems((currentItems) =>
      currentItems.map((c) => (c.id === item.id ? { ...c, isCompleted } : c))
    );
    try {
      const updatedItem = await updateShoppingItem(item.id, { isCompleted });
      setItems((currentItems) =>
        currentItems.map((c) => (c.id === updatedItem.id ? updatedItem : c))
      );
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const syncItemSort = async (item: ShoppingItem, isCompleted: boolean, sortOrder: number) => {
    const previousItems = items;
    setItems((currentItems) =>
      currentItems.map((c) => (c.id === item.id ? { ...c, isCompleted, sortOrder } : c))
    );
    try {
      const updatedItem = await updateShoppingItem(item.id, { isCompleted, sortOrder });
      setItems((currentItems) =>
        currentItems.map((c) => (c.id === updatedItem.id ? updatedItem : c))
      );
    } catch (err) {
      setItems(previousItems);
      setError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const getDropSortOrder = (targetList: ShoppingItem[], targetIndex: number): number => {
    const previousItem = targetList[targetIndex - 1];
    const nextItem = targetList[targetIndex];
    if (previousItem && nextItem) {
      return (previousItem.sortOrder + nextItem.sortOrder) / 2;
    }
    if (previousItem) return previousItem.sortOrder - 1;
    if (nextItem) return nextItem.sortOrder + 1;
    sortOrderCounterRef.current += 1;
    return sortOrderCounterRef.current;
  };

  const handleLaneDrop = (event: React.DragEvent<HTMLElement>, isCompleted: boolean) => {
    event.preventDefault();
    const draggedItem = items.find((i) => i.id === draggedItemId);
    if (!draggedItem) return;
    const targetList = (isCompleted ? completedItems : activeItems).filter((i) => i.id !== draggedItem.id);
    const sortOrder = getDropSortOrder(targetList, targetList.length);
    void syncItemSort(draggedItem, isCompleted, sortOrder);
  };

  const handleItemDrop = (
    event: React.DragEvent<HTMLElement>,
    isCompleted: boolean,
    targetIndex: number,
    targetItemId: string
  ) => {
    event.preventDefault();
    const draggedItem = items.find((i) => i.id === draggedItemId);
    if (!draggedItem || draggedItem.id === targetItemId) return;

    const targetList = (isCompleted ? completedItems : activeItems).filter((i) => i.id !== draggedItem.id);
    const bounds = event.currentTarget.getBoundingClientRect();
    const insertAt = event.clientY < bounds.top + bounds.height / 2 ? targetIndex : targetIndex + 1;
    const sortOrder = getDropSortOrder(targetList, insertAt);

    void syncItemSort(draggedItem, isCompleted, sortOrder);
  };

  const renderItem = (item: ShoppingItem, index: number) => {
    return (
      <li
        key={item.id}
        className={`shopping-list-item shopping-list-item--draggable${
          draggedItemId === item.id ? " shopping-list-item--dragging" : ""
        } ${item.isCompleted ? "shopping-list-item--completed" : ""}`}
        draggable
        onDragStart={() => setDraggedItemId(item.id)}
        onDragEnd={() => setDraggedItemId(null)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleItemDrop(event, item.isCompleted, index, item.id)}
      >
        <button
          className={`shopping-list-item__strike ${item.isCompleted ? "striked" : ""}`}
          onClick={() => toggleCompleted(item)}
          aria-label={item.isCompleted ? "Unstrike item" : "Strike off item"}
          title={item.isCompleted ? "Mark as active" : "Mark as completed"}
        >
          {item.isCompleted ? "✓" : "○"}
        </button>
        <span className="shopping-list-item__name">{item.name}</span>
        <button
          className="shopping-list-item__delete"
          onClick={() => handleDeleteItem(item.id)}
          aria-label="Delete item"
          title="Delete item"
        >
          ✕
        </button>
      </li>
    );
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="misc-todos-modal-backdrop" onClick={handleBackdropClick}>
      <div className="shopping-list-wrapper">
        <div className="shopping-list-header">
          <h2 className="shopping-list-title">🛒 Shopping List</h2>
          <div className="shopping-list-header-actions">
            <button
              type="button"
              className="shopping-list-add-button"
              onClick={() => setShowForm(!showForm)}
              aria-label="Add new item"
              title="Add new item"
            >
              +
            </button>
            <button
              type="button"
              className="shopping-list-close"
              onClick={() => {
                setShowForm(false);
                setDraggedItemId(null);
                onClose();
              }}
              aria-label="Close modal"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="shopping-list-error">
            <span className="shopping-list-error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="shopping-list-board">
          {activeItems.length === 0 && completedItems.length === 0 && !error ? (
            <div className="shopping-list-empty-state">
              <div className="shopping-list-empty-icon">📝</div>
              <p>Your shopping list is empty</p>
              <p className="shopping-list-empty-hint">Click the + button to add items</p>
            </div>
          ) : (
            <>
              <div className="shopping-list-section">
                <div className="shopping-list-section-header">
                  <h3 className="shopping-list-section-title">To Buy</h3>
                  <span className="shopping-list-section-count">{activeItems.length}</span>
                </div>
                <ul
                  className="shopping-list-lane"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleLaneDrop(e, false)}
                >
                  {activeItems.length === 0 ? (
                    <li className="shopping-list-empty-lane">
                      <span className="shopping-list-empty-lane-icon">↓</span>
                      Drag completed items here or add new
                    </li>
                  ) : (
                    activeItems.map((item, index) => renderItem(item, index))
                  )}
                </ul>
              </div>

              {completedItems.length > 0 && (
                <div className="shopping-list-section shopping-list-section--completed">
                  <div className="shopping-list-section-header">
                    <h3 className="shopping-list-section-title">✓ Completed</h3>
                    <span className="shopping-list-section-count">{completedItems.length}</span>
                  </div>
                  <ul
                    className="shopping-list-lane"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleLaneDrop(e, true)}
                  >
                    {completedItems.map((item, index) => renderItem(item, index))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleAddItem} className="shopping-list-form">
            <input
              type="text"
              className="shopping-list-input"
              placeholder="e.g., Milk, Bread, Eggs..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            <div className="shopping-list-form-actions">
              <button type="submit" className="shopping-list-submit" disabled={isLoading}>
                {isLoading ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                className="shopping-list-cancel"
                onClick={() => {
                  setShowForm(false);
                  setNameInput("");
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}