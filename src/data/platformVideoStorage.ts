export type PlatformVideoSourceType = "default" | "url" | "file";

export interface PlatformVideoSourceMetadata {
  channelSlug: string;
  sourceType: PlatformVideoSourceType;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  updatedAt: string;
}

const dbName = "platform-video-assets";
const storeName = "videos";

export function getPlatformVideoSourceStorageKey(channelSlug: string) {
  return `videoSource:${channelSlug}`;
}

function emitVideoSourceUpdated(channelSlug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("platform-video-source-updated", { detail: { channelSlug } }));
}

function openVideoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putVideoBlob(channelSlug: string, file: File) {
  const db = await openVideoDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(file, channelSlug);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function deleteVideoBlob(channelSlug: string) {
  if (typeof indexedDB === "undefined") return;

  const db = await openVideoDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(channelSlug);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function loadStoredVideoBlob(channelSlug: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;

  const db = await openVideoDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(channelSlug);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as Blob | undefined) ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export function loadStoredVideoMetadata(channelSlug: string): PlatformVideoSourceMetadata | null {
  if (typeof window === "undefined") return null;

  const rawMetadata = window.localStorage.getItem(getPlatformVideoSourceStorageKey(channelSlug));
  if (!rawMetadata) return null;

  try {
    const metadata = JSON.parse(rawMetadata) as Partial<PlatformVideoSourceMetadata>;
    return {
      ...metadata,
      channelSlug: metadata.channelSlug ?? channelSlug
    } as PlatformVideoSourceMetadata;
  } catch (error) {
    console.error("Failed to parse video source metadata:", error);
    return null;
  }
}

export async function saveStoredVideoUrl(channelSlug: string, url: string) {
  const metadata: PlatformVideoSourceMetadata = {
    channelSlug,
    sourceType: "url",
    url,
    updatedAt: new Date().toISOString()
  };

  try {
    await deleteVideoBlob(channelSlug);
  } catch (error) {
    console.warn("Failed to clear stored video file before saving URL:", error);
  }

  window.localStorage.setItem(getPlatformVideoSourceStorageKey(channelSlug), JSON.stringify(metadata));
  emitVideoSourceUpdated(channelSlug);
  return metadata;
}

export async function saveStoredVideoFile(channelSlug: string, file: File) {
  const metadata: PlatformVideoSourceMetadata = {
    channelSlug,
    sourceType: "file",
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    updatedAt: new Date().toISOString()
  };

  await putVideoBlob(channelSlug, file);
  window.localStorage.setItem(getPlatformVideoSourceStorageKey(channelSlug), JSON.stringify(metadata));
  emitVideoSourceUpdated(channelSlug);
  return metadata;
}

export async function clearStoredVideoSource(channelSlug: string) {
  try {
    await deleteVideoBlob(channelSlug);
  } catch (error) {
    console.warn("Failed to clear stored video file:", error);
  }

  window.localStorage.removeItem(getPlatformVideoSourceStorageKey(channelSlug));
  emitVideoSourceUpdated(channelSlug);
}
