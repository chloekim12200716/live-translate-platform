import { PlatformLayout } from "./mockPlatformData";

export function getLayoutStorageKey(sessionSlug: string) {
  return `layout:${sessionSlug}`;
}

function normalizeLayout(layout: PlatformLayout): PlatformLayout {
  return {
    ...layout,
    canvasWidth: layout.canvasWidth ?? 1920,
    canvasHeight: layout.canvasHeight ?? 1080,
    backgroundFit: layout.backgroundFit ?? "cover",
    backgroundPositionX: layout.backgroundPositionX ?? 50,
    backgroundPositionY: layout.backgroundPositionY ?? 50,
    backgroundColor: layout.backgroundColor ?? "#020617",
    components: layout.components.map((component) => ({
      ...component,
      visible: component.visible !== false
    }))
  };
}

export function loadStoredLayout(sessionSlug: string, fallbackLayout: PlatformLayout): PlatformLayout {
  if (typeof window === "undefined") return fallbackLayout;

  const rawLayout = window.localStorage.getItem(getLayoutStorageKey(sessionSlug));
  if (!rawLayout) return normalizeLayout(fallbackLayout);

  try {
    return normalizeLayout(JSON.parse(rawLayout) as PlatformLayout);
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return normalizeLayout(fallbackLayout);
  }
}

export function saveStoredLayout(sessionSlug: string, layout: PlatformLayout) {
  window.localStorage.setItem(getLayoutStorageKey(sessionSlug), JSON.stringify(normalizeLayout(layout)));
}

export function clearStoredLayout(sessionSlug: string) {
  window.localStorage.removeItem(getLayoutStorageKey(sessionSlug));
}
