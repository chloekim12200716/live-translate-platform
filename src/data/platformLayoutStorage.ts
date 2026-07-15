import { PlatformLayout } from "./mockPlatformData";

const legacyDefaultLayoutId = "layout-default-live-stage";

export function getLayoutStorageKey(sessionSlug: string) {
  return `layout:${sessionSlug}`;
}

export function getPlatformLayoutStorageKey(sessionSlug: string, layoutId: string) {
  return `layout:${sessionSlug}:${layoutId}`;
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

export function loadStoredLayout(sessionSlug: string, fallbackLayout: PlatformLayout, layoutId = fallbackLayout.id): PlatformLayout {
  if (typeof window === "undefined") return fallbackLayout;

  const rawPlatformLayout = window.localStorage.getItem(getPlatformLayoutStorageKey(sessionSlug, layoutId));
  const rawLegacyLayout = layoutId === legacyDefaultLayoutId ? window.localStorage.getItem(getLayoutStorageKey(sessionSlug)) : null;
  const rawLayout = rawPlatformLayout ?? rawLegacyLayout;
  if (!rawLayout) return normalizeLayout(fallbackLayout);

  try {
    return normalizeLayout(JSON.parse(rawLayout) as PlatformLayout);
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return normalizeLayout(fallbackLayout);
  }
}

export function saveStoredLayout(sessionSlug: string, layout: PlatformLayout, layoutId = layout.id) {
  window.localStorage.setItem(getPlatformLayoutStorageKey(sessionSlug, layoutId), JSON.stringify(normalizeLayout(layout)));
}

export function clearStoredLayout(sessionSlug: string, layoutId?: string) {
  if (layoutId) {
    window.localStorage.removeItem(getPlatformLayoutStorageKey(sessionSlug, layoutId));
    return;
  }

  window.localStorage.removeItem(getLayoutStorageKey(sessionSlug));
}
