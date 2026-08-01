import React from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import DisplayRenderer from "../../components/platform/DisplayRenderer";
import {
  findPlatformChannelBySlug,
  mockPlatformData,
  mockPlatformChannel,
  mockPlatformLayout,
  mockPlatformLayouts,
  mockPlatformDisplays
} from "../../data/mockPlatformData";
import {
  loadStoredLayout,
  loadStoredLayoutById,
  loadStoredPlatformChannels,
  loadStoredPlatformDisplays
} from "../../data/platformLayoutStorage";

export default function LiveChannelPage() {
  const { channelSlug, languageCode } = useParams();
  const [searchParams] = useSearchParams();
  const storedChannels = loadStoredPlatformChannels(mockPlatformData.event.id);
  const channel = findPlatformChannelBySlug(channelSlug)
    ?? storedChannels.find((storedChannel) => storedChannel.slug === channelSlug);
  const resolvedLanguage = languageCode ?? mockPlatformData.event.defaultLanguageCode;
  const shouldShowFullLayout = searchParams.get("view") === "full" || searchParams.get("overlay") === "none";
  const overlayMode = shouldShowFullLayout ? "none" : "caption";
  const audioParam = (searchParams.get("audio") ?? "").toLowerCase();
  const enableInterpretationAudio = !["0", "false", "no"].includes(audioParam);
  const transparentBackground = overlayMode === "caption"
    || ["1", "true", "yes"].includes((searchParams.get("transparent") ?? "").toLowerCase());

  if (!channel) {
    return <Navigate to={`/live/${mockPlatformChannel.slug}/${resolvedLanguage}`} replace />;
  }

  const channelDisplays = [
    ...mockPlatformDisplays.filter((display) => display.channelId === channel.id),
    ...loadStoredPlatformDisplays(channel.slug)
  ];
  const requestedLayoutId = searchParams.get("layoutId") ?? channelDisplays[0]?.layoutId ?? mockPlatformLayout.id;
  const fallbackLayout = mockPlatformLayouts.find((layout) => layout.id === requestedLayoutId && layout.channelId === channel.id)
    ?? loadStoredLayoutById(channel.slug, requestedLayoutId)
    ?? mockPlatformLayouts.find((layout) => layout.channelId === channel.id)
    ?? {
      ...mockPlatformLayout,
      id: requestedLayoutId,
      channelId: channel.id,
      name: `${channel.title} Caption Stage`
    };
  const layout = loadStoredLayout(channel.slug, fallbackLayout, fallbackLayout.id);

  return (
    <DisplayRenderer
      layout={layout}
      channel={channel}
      languageCode={resolvedLanguage}
      overlayMode={overlayMode}
      transparentBackground={transparentBackground}
      enableInterpretationAudio={enableInterpretationAudio}
    />
  );
}
