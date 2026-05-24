import { RandomThought } from "@/types/random-thoughts";

const API_BASE = "/api/random-thoughts";
const TIMEOUT = 15000;

async function parseResponse(response: Response) {
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

export async function fetchRandomThoughts(): Promise<RandomThought[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(API_BASE, {
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await parseResponse(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch random thoughts";
    throw new Error(message);
  }
}

export async function createRandomThought(
  content: string
): Promise<RandomThought> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await parseResponse(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create random thought";
    throw new Error(message);
  }
}

export async function updateRandomThought(
  id: string,
  updates: Partial<Omit<RandomThought, "id" | "createdAt">>
): Promise<RandomThought> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return await parseResponse(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update random thought";
    throw new Error(message);
  }
}

export async function deleteRandomThought(id: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await parseResponse(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete random thought";
    throw new Error(message);
  }
}
