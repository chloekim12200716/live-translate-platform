import { PlatformLayout } from "./mockPlatformData";

const STORAGE_PREFIX = "medicast-layout";

export function getLayoutStorageKey(sessionId: string) {
  return `${STORAGE_PREFIX}:${sessionId}`;
}

export function loadStoredLayout(sessionId: string, fallbackLayout: PlatformLayout): PlatformLayout {
  if (typeof window === "undefined") return fallbackLayout;

  const rawLayout = window.localStorage.getItem(getLayoutStorageKey(sessionId));
  if (!rawLayout) return fallbackLayout;

  try {
    return JSON.parse(rawLayout) as PlatformLayout;
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return fallbackLayout;
  }
}

export function saveStoredLayout(layout: PlatformLayout) {
  window.localStorage.setItem(getLayoutStorageKey(layout.sessionId), JSON.stringify(layout));
}

export function clearStoredLayout(sessionId: string) {
  window.localStorage.removeItem(getLayoutStorageKey(sessionId));
}
