import React from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import DisplayRenderer from "../../components/platform/DisplayRenderer";
import {
  mockPlatformData,
  mockPlatformChannel,
  mockPlatformLayout,
  mockPlatformLayouts
} from "../../data/mockPlatformData";
import { loadStoredLayout, loadStoredLayoutById } from "../../data/platformLayoutStorage";

export default function LiveChannelPage() {
  const { channelSlug, languageCode } = useParams();
  const [searchParams] = useSearchParams();
  const resolvedLanguage = languageCode ?? mockPlatformData.event.defaultLanguageCode;
  const requestedLayoutId = searchParams.get("layoutId") ?? mockPlatformLayout.id;
  const shouldShowFullLayout = searchParams.get("view") === "full" || searchParams.get("overlay") === "none";
  const overlayMode = shouldShowFullLayout ? "none" : "caption";
  const transparentBackground = overlayMode === "caption"
    || ["1", "true", "yes"].includes((searchParams.get("transparent") ?? "").toLowerCase());
  const fallbackLayout = mockPlatformLayouts.find((layout) => layout.id === requestedLayoutId)
    ?? loadStoredLayoutById(mockPlatformChannel.slug, requestedLayoutId)
    ?? mockPlatformLayout;
  const layout = loadStoredLayout(mockPlatformChannel.slug, fallbackLayout, fallbackLayout.id);

  if (channelSlug !== mockPlatformChannel.slug) {
    return <Navigate to={`/live/${mockPlatformChannel.slug}/${resolvedLanguage}`} replace />;
  }

  return (
    <DisplayRenderer
      layout={layout}
      channel={mockPlatformChannel}
      languageCode={resolvedLanguage}
      overlayMode={overlayMode}
      transparentBackground={transparentBackground}
    />
  );
}
