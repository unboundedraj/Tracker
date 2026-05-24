"use client";

import type { HabitMonthDocument } from "@/types/habits";

type HabitMonthResponse = {
  document: HabitMonthDocument | null;
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

async function parseResponse(response: Response): Promise<HabitMonthResponse> {
  const payload = (await response.json().catch(() => null)) as HabitMonthResponse | null;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      // Clear auth on 401 to force re-login, but only once per session to prevent infinite reloads
      const reloadKey = "tracker-auth-reload-attempted";
      if (!window.sessionStorage.getItem(reloadKey)) {
        window.sessionStorage.setItem(reloadKey, "true");
        window.localStorage.removeItem("tracker-authenticated");
        window.location.reload();
      }
    }
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload ?? { document: null };
}

export async function fetchHabitMonth(monthKey: string): Promise<HabitMonthDocument | null> {
  const response = await fetchWithTimeout(`/api/habits/${monthKey}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const payload = await parseResponse(response);
  return payload.document;
}

export async function saveHabitMonth(document: HabitMonthDocument): Promise<HabitMonthDocument> {
  const response = await fetchWithTimeout(`/api/habits/${document.monthKey}`, {
    method: "PUT",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document }),
  });

  const payload = await parseResponse(response);

  if (!payload.document) {
    throw new Error("Month save response did not include a document.");
  }

  return payload.document;
}