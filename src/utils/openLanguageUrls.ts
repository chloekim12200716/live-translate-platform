export interface OpenLanguageUrlsResult {
  attemptedCount: number;
  openedCount: number;
  blockedCount: number;
  blockedPaths: string[];
}

type LanguageUrlOpener = (path: string) => Window | null;

export function openLanguageUrls(
  paths: string[],
  opener: LanguageUrlOpener = (path) => window.open(path, "_blank", "noopener,noreferrer")
): OpenLanguageUrlsResult {
  const blockedPaths: string[] = [];

  paths.forEach((path) => {
    const openedWindow = opener(path);
    if (!openedWindow) {
      blockedPaths.push(path);
    }
  });

  return {
    attemptedCount: paths.length,
    openedCount: paths.length - blockedPaths.length,
    blockedCount: blockedPaths.length,
    blockedPaths
  };
}
