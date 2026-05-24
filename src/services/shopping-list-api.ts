"use client";

import type { ShoppingItem } from "@/types/shopping-list";

type ShoppingListResponse = {
  items: ShoppingItem[];
  message?: string;
};

type ShoppingItemCreateResponse = {
  item: ShoppingItem | null;
  message?: string;
};

type ShoppingItemUpdateResponse = {
  item: ShoppingItem | null;
  message?: string;
};

type ShoppingItemDeleteResponse = {
  success: boolean;
  message?: string;
};

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const errorMessage = (payload as any)?.message ?? `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload ?? ({} as T);
}

export async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  const response = await fetchWithTimeout("/api/shopping-list", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = await parseResponse<ShoppingListResponse>(response);
  return payload.items ?? [];
}

export async function createShoppingItem(name: string): Promise<ShoppingItem> {
  const response = await fetchWithTimeout("/api/shopping-list", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const payload = await parseResponse<ShoppingItemCreateResponse>(response);

  if (!payload.item) {
    throw new Error(payload.message ?? "Failed to create item.");
  }

  return payload.item;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const response = await fetchWithTimeout(`/api/shopping-list/${id}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
  });

  await parseResponse<ShoppingItemDeleteResponse>(response);
}

export async function updateShoppingItem(
  id: string,
  updates: { name?: string; isCompleted?: boolean; sortOrder?: number }
): Promise<ShoppingItem> {
  const response = await fetchWithTimeout(`/api/shopping-list/${id}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const payload = await parseResponse<ShoppingItemUpdateResponse>(response);
  if (!payload.item) {
    throw new Error(payload.message ?? "Failed to update item.");
  }
  return payload.item;
}