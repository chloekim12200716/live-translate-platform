import {
  defaultCaptionStyle,
  PlatformChannel,
  PlatformDisplayTarget,
  PlatformLayout
} from "./mockPlatformData";

export function getPlatformChannelsStorageKey(eventId: string) {
  return `platformChannels:${eventId}`;
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
    channelId: layout.channelId ?? "",
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
  const rawLayout = rawPlatformLayout;
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
}

function normalizeDisplay(display: PlatformDisplayTarget): PlatformDisplayTarget {
  return {
    ...display,
    channelId: display.channelId ?? ""
  };
}

function normalizeChannel(channel: PlatformChannel & { speakerAffiliation?: string }): PlatformChannel {
  return {
    ...channel,
    id: channel.id ?? channel.slug,
    slug: channel.slug ?? channel.id,
    notes: channel.notes ?? channel.speakerAffiliation ?? "",
    mode: channel.mode ?? "live",
    slides: channel.slides ?? []
  };
}

export function loadStoredPlatformChannels(eventId: string): PlatformChannel[] {
  if (typeof window === "undefined") return [];

  const rawChannels = window.localStorage.getItem(getPlatformChannelsStorageKey(eventId));
  if (!rawChannels) return [];

  try {
    const parsedChannels = JSON.parse(rawChannels) as PlatformChannel[];
    return parsedChannels
      .map(normalizeChannel)
      .filter((channel) => channel.id && channel.slug && channel.title);
  } catch (error) {
    console.error("Failed to parse stored platform channels:", error);
    return [];
  }
}

export function saveStoredPlatformChannels(eventId: string, channels: PlatformChannel[]) {
  window.localStorage.setItem(getPlatformChannelsStorageKey(eventId), JSON.stringify(channels.map(normalizeChannel)));
}

export function deleteStoredPlatformChannel(eventId: string, channelId: string) {
  const channels = loadStoredPlatformChannels(eventId);
  saveStoredPlatformChannels(eventId, channels.filter((channel) => channel.id !== channelId));
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
