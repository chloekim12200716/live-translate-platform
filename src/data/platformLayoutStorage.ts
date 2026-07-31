import {
  defaultCaptionStyle,
  PlatformDisplayTarget,
  PlatformLayout
} from "./mockPlatformData";

const legacyDefaultLayoutId = "layout-default-live-stage";

export function getLayoutStorageKey(channelSlug: string) {
  return `layout:${channelSlug}`;
}

export function getPlatformLayoutStorageKey(channelSlug: string, layoutId: string) {
  return `layout:${channelSlug}:${layoutId}`;
}

export function getPlatformDisplaysStorageKey(channelSlug: string) {
  return `platformDisplays:${channelSlug}`;
}

function normalizeLayout(layout: PlatformLayout): PlatformLayout {
  return {
    ...layout,
    channelId: layout.channelId ?? layout.sessionId ?? "",
    sessionId: layout.sessionId ?? layout.channelId,
    canvasWidth: layout.canvasWidth ?? 1920,
    canvasHeight: layout.canvasHeight ?? 1080,
    backgroundFit: layout.backgroundFit ?? "cover",
    backgroundPositionX: layout.backgroundPositionX ?? 50,
    backgroundPositionY: layout.backgroundPositionY ?? 50,
    backgroundColor: layout.backgroundColor ?? "#020617",
    components: layout.components.map((component) => ({
      ...component,
      visible: component.visible !== false,
      captionStyle: component.type === "caption"
        ? { ...defaultCaptionStyle, ...component.captionStyle }
        : component.captionStyle
    }))
  };
}

export function loadStoredLayout(channelSlug: string, fallbackLayout: PlatformLayout, layoutId = fallbackLayout.id): PlatformLayout {
  if (typeof window === "undefined") return fallbackLayout;

  const rawPlatformLayout = window.localStorage.getItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
  const rawLegacyLayout = layoutId === legacyDefaultLayoutId ? window.localStorage.getItem(getLayoutStorageKey(channelSlug)) : null;
  const rawLayout = rawPlatformLayout ?? rawLegacyLayout;
  if (!rawLayout) return normalizeLayout(fallbackLayout);

  try {
    return normalizeLayout(JSON.parse(rawLayout) as PlatformLayout);
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return normalizeLayout(fallbackLayout);
  }
}

export function loadStoredLayoutById(channelSlug: string, layoutId: string): PlatformLayout | null {
  if (typeof window === "undefined") return null;

  const rawLayout = window.localStorage.getItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
  if (!rawLayout) return null;

  try {
    return normalizeLayout(JSON.parse(rawLayout) as PlatformLayout);
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return null;
  }
}

export function saveStoredLayout(channelSlug: string, layout: PlatformLayout, layoutId = layout.id) {
  window.localStorage.setItem(getPlatformLayoutStorageKey(channelSlug, layoutId), JSON.stringify(normalizeLayout(layout)));
}

export function clearStoredLayout(channelSlug: string, layoutId?: string) {
  if (layoutId) {
    window.localStorage.removeItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
    return;
  }

  window.localStorage.removeItem(getLayoutStorageKey(channelSlug));
}

function normalizeDisplay(display: PlatformDisplayTarget): PlatformDisplayTarget {
  return {
    ...display,
    channelId: display.channelId ?? display.sessionId ?? "",
    sessionId: display.sessionId ?? display.channelId
  };
}

export function loadStoredPlatformDisplays(channelSlug: string): PlatformDisplayTarget[] {
  if (typeof window === "undefined") return [];

  const rawDisplays = window.localStorage.getItem(getPlatformDisplaysStorageKey(channelSlug));
  if (!rawDisplays) return [];

  try {
    const parsedDisplays = JSON.parse(rawDisplays) as PlatformDisplayTarget[];
    return parsedDisplays
      .map(normalizeDisplay)
      .filter((display) => display.channelId && display.layoutId && display.name);
  } catch (error) {
    console.error("Failed to parse stored platform displays:", error);
    return [];
  }
}

export function saveStoredPlatformDisplays(channelSlug: string, displays: PlatformDisplayTarget[]) {
  window.localStorage.setItem(getPlatformDisplaysStorageKey(channelSlug), JSON.stringify(displays.map(normalizeDisplay)));
}

export function deleteStoredPlatformDisplay(channelSlug: string, displayId: string) {
  const displays = loadStoredPlatformDisplays(channelSlug);
  const displayToDelete = displays.find((display) => display.id === displayId);
  const nextDisplays = displays.filter((display) => display.id !== displayId);
  saveStoredPlatformDisplays(channelSlug, nextDisplays);

  if (displayToDelete) {
    clearStoredLayout(channelSlug, displayToDelete.layoutId);
  }
}
