export type PlatformVideoSourceType = "default" | "url" | "file";

export interface PlatformVideoSourceMetadata {
  sessionSlug: string;
  sourceType: PlatformVideoSourceType;
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  updatedAt: string;
}

const dbName = "platform-video-assets";
const storeName = "videos";

export function getPlatformVideoSourceStorageKey(sessionSlug: string) {
  return `videoSource:${sessionSlug}`;
}

function emitVideoSourceUpdated(sessionSlug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("platform-video-source-updated", { detail: { sessionSlug } }));
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

async function putVideoBlob(sessionSlug: string, file: File) {
  const db = await openVideoDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(file, sessionSlug);
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

async function deleteVideoBlob(sessionSlug: string) {
  if (typeof indexedDB === "undefined") return;

  const db = await openVideoDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(sessionSlug);
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

export async function loadStoredVideoBlob(sessionSlug: string): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;

  const db = await openVideoDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(sessionSlug);
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

export function loadStoredVideoMetadata(sessionSlug: string): PlatformVideoSourceMetadata | null {
  if (typeof window === "undefined") return null;

  const rawMetadata = window.localStorage.getItem(getPlatformVideoSourceStorageKey(sessionSlug));
  if (!rawMetadata) return null;

  try {
    return JSON.parse(rawMetadata) as PlatformVideoSourceMetadata;
  } catch (error) {
    console.error("Failed to parse video source metadata:", error);
    return null;
  }
}

export async function saveStoredVideoUrl(sessionSlug: string, url: string) {
  const metadata: PlatformVideoSourceMetadata = {
    sessionSlug,
    sourceType: "url",
    url,
    updatedAt: new Date().toISOString()
  };

  try {
    await deleteVideoBlob(sessionSlug);
  } catch (error) {
    console.warn("Failed to clear stored video file before saving URL:", error);
  }

  window.localStorage.setItem(getPlatformVideoSourceStorageKey(sessionSlug), JSON.stringify(metadata));
  emitVideoSourceUpdated(sessionSlug);
  return metadata;
}

export async function saveStoredVideoFile(sessionSlug: string, file: File) {
  const metadata: PlatformVideoSourceMetadata = {
    sessionSlug,
    sourceType: "file",
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    updatedAt: new Date().toISOString()
  };

  await putVideoBlob(sessionSlug, file);
  window.localStorage.setItem(getPlatformVideoSourceStorageKey(sessionSlug), JSON.stringify(metadata));
  emitVideoSourceUpdated(sessionSlug);
  return metadata;
}

export async function clearStoredVideoSource(sessionSlug: string) {
  try {
    await deleteVideoBlob(sessionSlug);
  } catch (error) {
    console.warn("Failed to clear stored video file:", error);
  }

  window.localStorage.removeItem(getPlatformVideoSourceStorageKey(sessionSlug));
  emitVideoSourceUpdated(sessionSlug);
}
