"use client";

import type { TodaysAgendaItem } from "@/types/todays-agenda";

type TodaysAgendaListResponse = {
  items: TodaysAgendaItem[];
  message?: string;
};

type TodaysAgendaCreateResponse = {
  item: TodaysAgendaItem | null;
  message?: string;
};

type TodaysAgendaDeleteResponse = {
  success: boolean;
  message?: string;
};

type TodaysAgendaUpdateResponse = {
  item: TodaysAgendaItem | null;
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

export async function fetchTodaysAgendaItems(): Promise<TodaysAgendaItem[]> {
  const response = await fetchWithTimeout("/api/todays-agenda", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = await parseResponse<TodaysAgendaListResponse>(response);
  return payload.items ?? [];
}

export async function createTodaysAgendaItem(task: string): Promise<TodaysAgendaItem> {
  const response = await fetchWithTimeout("/api/todays-agenda", {
    method: "POST",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ task }),
  });

  const payload = await parseResponse<TodaysAgendaCreateResponse>(response);

  if (!payload.item) {
    throw new Error(payload.message ?? "Failed to create agenda task.");
  }

  return payload.item;
}

export async function updateTodaysAgendaItem(
  id: string,
  updates: { isCompleted?: boolean }
): Promise<TodaysAgendaItem> {
  const response = await fetchWithTimeout(`/api/todays-agenda/${id}`, {
    method: "PATCH",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const payload = await parseResponse<TodaysAgendaUpdateResponse>(response);

  if (!payload.item) {
    throw new Error(payload.message ?? "Failed to update agenda task.");
  }

  return payload.item;
}

export async function deleteTodaysAgendaItem(id: string): Promise<void> {
  const response = await fetchWithTimeout(`/api/todays-agenda/${id}`, {
    method: "DELETE",
    cache: "no-store",
    credentials: "include",
  });

  await parseResponse<TodaysAgendaDeleteResponse>(response);
}
