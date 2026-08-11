import assert from "node:assert/strict";
import { test } from "node:test";
import { createGeminiLiveConnectConfig } from "../geminiLiveConfig";

test("omits Enterprise-only transparent session resumption for Developer API", () => {
  const connectConfig = createGeminiLiveConnectConfig({
    model: "gemini-3.5-live-translate-preview",
    targetLanguageCode: "ja"
  });

  assert.equal(connectConfig.config.translationConfig.targetLanguageCode, "ja");
  assert.equal(
    Object.hasOwn(connectConfig.config.sessionResumption, "transparent"),
    false
  );
});

test("keeps session handle when reconnecting without adding transparent", () => {
  const connectConfig = createGeminiLiveConnectConfig({
    model: "gemini-3.5-live-translate-preview",
    targetLanguageCode: "ru",
    sessionHandle: "session-123"
  });

  assert.equal(connectConfig.config.sessionResumption.handle, "session-123");
  assert.equal(
    Object.hasOwn(connectConfig.config.sessionResumption, "transparent"),
    false
  );
});
