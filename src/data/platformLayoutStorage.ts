import {
  defaultCaptionStyle,
  PlatformChannel,
  PlatformDisplayTarget,
  PlatformLayout
} from "./mockPlatformData";
import {
  defaultLiveLanguageCodes,
  normalizeLiveLanguageList
} from "./liveLanguages";

const PLATFORM_CHANNELS_STORAGE_KEY = "platformChannels";
const LEGACY_PLATFORM_CHANNELS_STORAGE_KEYS = ["platformChannels:event-medicast-2026"];

export function getPlatformChannelsStorageKey() {
  return PLATFORM_CHANNELS_STORAGE_KEY;
}

export function getPlatformLayoutStorageKey(channelSlug: string, layoutId: string) {
  return `layout:${channelSlug}:${layoutId}`;
}

export function getPlatformDisplaysStorageKey(channelSlug: string) {
  return `platformDisplays:${channelSlug}`;
}

export function getPlatformChannelLanguagesStorageKey(channelSlug: string) {
  return `platformChannelLanguages:${channelSlug}`;
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

function readLocalStorageItem(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    console.error(`Failed to read localStorage key ${storageKey}:`, error);
    return null;
  }
}

function writeLocalStorageItem(storageKey: string, value: string) {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch (error) {
    console.error(`Failed to write localStorage key ${storageKey}:`, error);
    throw error;
  }
}

function removeLocalStorageItem(storageKey: string) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.error(`Failed to remove localStorage key ${storageKey}:`, error);
    throw error;
  }
}

export function loadStoredLayout(channelSlug: string, fallbackLayout: PlatformLayout, layoutId = fallbackLayout.id): PlatformLayout {
  if (typeof window === "undefined") return fallbackLayout;

  const rawPlatformLayout = readLocalStorageItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
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

  const rawLayout = readLocalStorageItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
  if (!rawLayout) return null;

  try {
    return normalizeLayout(JSON.parse(rawLayout) as PlatformLayout);
  } catch (error) {
    console.error("Failed to parse stored layout:", error);
    return null;
  }
}

export function saveStoredLayout(channelSlug: string, layout: PlatformLayout, layoutId = layout.id) {
  writeLocalStorageItem(getPlatformLayoutStorageKey(channelSlug, layoutId), JSON.stringify(normalizeLayout(layout)));
}

export function clearStoredLayout(channelSlug: string, layoutId?: string) {
  if (layoutId) {
    removeLocalStorageItem(getPlatformLayoutStorageKey(channelSlug, layoutId));
    return;
  }
}

function normalizeDisplay(display: PlatformDisplayTarget): PlatformDisplayTarget {
  return {
    ...display,
    channelId: display.channelId ?? "",
    defaultLanguageCode: normalizeLiveLanguageList([display.defaultLanguageCode], ["ko"])[0] ?? "ko"
  };
}

function normalizeChannel(channel: PlatformChannel & { speakerAffiliation?: string; speakerName?: string }): PlatformChannel {
  const { speakerAffiliation: _speakerAffiliation, speakerName: _speakerName, ...channelWithoutSpeaker } = channel;

  return {
    ...channelWithoutSpeaker,
    id: channel.id ?? channel.slug,
    slug: channel.slug ?? channel.id,
    notes: channel.notes ?? _speakerAffiliation ?? "",
    enabledLanguageCodes: normalizeLiveLanguageList(channel.enabledLanguageCodes ?? defaultLiveLanguageCodes),
    mode: channel.mode ?? "live",
    slides: channel.slides ?? []
  };
}

export function loadStoredPlatformChannels(): PlatformChannel[] {
  if (typeof window === "undefined") return [];

  const rawChannels = readLocalStorageItem(getPlatformChannelsStorageKey())
    ?? LEGACY_PLATFORM_CHANNELS_STORAGE_KEYS
      .map((storageKey) => readLocalStorageItem(storageKey))
      .find(Boolean);
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

export function saveStoredPlatformChannels(channels: PlatformChannel[]) {
  writeLocalStorageItem(getPlatformChannelsStorageKey(), JSON.stringify(channels.map(normalizeChannel)));
}

export function deleteStoredPlatformChannel(channelId: string) {
  const channels = loadStoredPlatformChannels();
  saveStoredPlatformChannels(channels.filter((channel) => channel.id !== channelId));
}

export function loadStoredChannelLanguageCodes(channelSlug: string, fallbackLanguageCodes = defaultLiveLanguageCodes) {
  if (typeof window === "undefined") return normalizeLiveLanguageList(fallbackLanguageCodes);

  const rawLanguageCodes = readLocalStorageItem(getPlatformChannelLanguagesStorageKey(channelSlug));
  if (!rawLanguageCodes) return normalizeLiveLanguageList(fallbackLanguageCodes);

  try {
    const parsedLanguageCodes = JSON.parse(rawLanguageCodes) as string[];
    return normalizeLiveLanguageList(parsedLanguageCodes, fallbackLanguageCodes);
  } catch (error) {
    console.error("Failed to parse stored channel languages:", error);
    return normalizeLiveLanguageList(fallbackLanguageCodes);
  }
}

export function saveStoredChannelLanguageCodes(channelSlug: string, languageCodes: string[]) {
  writeLocalStorageItem(
    getPlatformChannelLanguagesStorageKey(channelSlug),
    JSON.stringify(normalizeLiveLanguageList(languageCodes))
  );
}

export function loadStoredPlatformDisplays(channelSlug: string): PlatformDisplayTarget[] {
  if (typeof window === "undefined") return [];

  const rawDisplays = readLocalStorageItem(getPlatformDisplaysStorageKey(channelSlug));
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
  writeLocalStorageItem(getPlatformDisplaysStorageKey(channelSlug), JSON.stringify(displays.map(normalizeDisplay)));
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
