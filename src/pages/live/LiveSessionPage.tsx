import React from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import DisplayRenderer from "../../components/platform/DisplayRenderer";
import {
  mockPlatformData,
  mockPlatformLayout,
  mockPlatformLayouts,
  mockPlatformSession
} from "../../data/mockPlatformData";
import { loadStoredLayout, loadStoredLayoutById } from "../../data/platformLayoutStorage";

export default function LiveSessionPage() {
  const { channelSlug, sessionSlug, languageCode } = useParams();
  const resolvedChannelSlug = channelSlug ?? sessionSlug;
  const [searchParams] = useSearchParams();
  const resolvedLanguage = languageCode ?? mockPlatformData.event.defaultLanguageCode;
  const requestedLayoutId = searchParams.get("layoutId") ?? mockPlatformLayout.id;
  const overlayMode = searchParams.get("overlay") === "caption" ? "caption" : "none";
  const transparentBackground = overlayMode === "caption"
    || ["1", "true", "yes"].includes((searchParams.get("transparent") ?? "").toLowerCase());
  const fallbackLayout = mockPlatformLayouts.find((layout) => layout.id === requestedLayoutId)
    ?? loadStoredLayoutById(mockPlatformSession.slug, requestedLayoutId)
    ?? mockPlatformLayout;
  const layout = loadStoredLayout(mockPlatformSession.slug, fallbackLayout, fallbackLayout.id);

  if (resolvedChannelSlug !== mockPlatformSession.slug) {
    return <Navigate to={`/live/${mockPlatformSession.slug}/${resolvedLanguage}`} replace />;
  }

  return (
    <DisplayRenderer
      layout={layout}
      session={mockPlatformSession}
      languageCode={resolvedLanguage}
      overlayMode={overlayMode}
      transparentBackground={transparentBackground}
    />
  );
}
