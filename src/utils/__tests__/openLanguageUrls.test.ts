import assert from "node:assert/strict";
import { test } from "node:test";
import { openLanguageUrls } from "../openLanguageUrls";

test("counts opened and blocked language URL tabs", () => {
  const openedPaths: string[] = [];
  const result = openLanguageUrls(
    ["/live/channel/ko", "/live/channel/ja", "/live/channel/ru"],
    (path) => {
      openedPaths.push(path);
      return path.endsWith("/ja") ? null : ({} as Window);
    }
  );

  assert.deepEqual(openedPaths, ["/live/channel/ko", "/live/channel/ja", "/live/channel/ru"]);
  assert.deepEqual(result, {
    attemptedCount: 3,
    openedCount: 2,
    blockedCount: 1,
    blockedPaths: ["/live/channel/ja"]
  });
});

test("handles an empty language URL list", () => {
  const result = openLanguageUrls([], () => ({} as Window));

  assert.deepEqual(result, {
    attemptedCount: 0,
    openedCount: 0,
    blockedCount: 0,
    blockedPaths: []
  });
});
