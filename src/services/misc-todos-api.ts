"use client";

import type { MiscTodo, MiscTodoLevel } from "@/types/misc-todos";

type MiscTodoListResponse = {
  todos: MiscTodo[];
  message?: string;
};

type MiscTodoCreateResponse = {
  todo: MiscTodo | null;
  message?: string;
};

type MiscTodoUpdateResponse = {
  todo: MiscTodo | null;
  message?: string;
};

type MiscTodoDeleteResponse = {
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

export async function fetchMiscTodos(): Promise<MiscTodo[]> {
  const response = await fetchWithTimeout("/api/misc-todos", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = await parseResponse<MiscTodoListResponse>(response);
  return payload.todos ?? [];
}

export async function createMiscTodo(task: string, note?: string, level: MiscTodoLevel = "medium"): Promise<MiscTodo> {
  const response = await fetchWithTimeout("/api/misc-todos", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task, note, level }),
  });

  const payload = await parseResponse<MiscTodoCreateResponse>(response);

  if (!payload.todo) {
    throw new Error(payload.message ?? "Failed to create todo.");
  }

  return payload.todo;
}

export async function deleteMiscTodo(id: string): Promise<void> {
  const response = await fetchWithTimeout(`/api/misc-todos/${id}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
  });

  await parseResponse<MiscTodoDeleteResponse>(response);
}

export async function updateMiscTodo(
  id: string,
  updates: { level?: MiscTodoLevel; sortOrder?: number }
): Promise<MiscTodo> {
  const response = await fetchWithTimeout(`/api/misc-todos/${id}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const payload = await parseResponse<MiscTodoUpdateResponse>(response);

  if (!payload.todo) {
    throw new Error(payload.message ?? "Failed to update todo.");
  }

  return payload.todo;
}
