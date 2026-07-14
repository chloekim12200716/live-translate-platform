import React from "react";
import {
  PlatformLayout,
  PlatformLayoutComponent,
  PlatformSession
} from "../../data/mockPlatformData";
import {
  getBackgroundSize,
  getComponentFrameStyle
} from "../../utils/layoutEditor";
import CaptionComponent from "./CaptionComponent";
import NoticeComponent from "./NoticeComponent";
import QAComponent from "./QAComponent";
import SlideComponent from "./SlideComponent";
import VideoComponent from "./VideoComponent";

interface DisplayRendererProps {
  layout: PlatformLayout;
  session: PlatformSession;
  languageCode: string;
}

function renderComponent(component: PlatformLayoutComponent, session: PlatformSession, languageCode: string) {
  switch (component.type) {
    case "video":
      return <VideoComponent session={session} />;
    case "slide":
      return <SlideComponent session={session} />;
    case "caption":
      return (
        <CaptionComponent
          languageCode={languageCode}
          sourceLanguageCode={session.sourceLanguageCode}
          sourceText={session.sampleCaptionText}
        />
      );
    case "qa":
      return <QAComponent />;
    case "notice":
      return <NoticeComponent />;
    default:
      return null;
  }
}

export default function DisplayRenderer({ layout, session, languageCode }: DisplayRendererProps) {
  const canvasRatio = layout.canvasWidth / layout.canvasHeight;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">{session.mode} Session</p>
          <h1 className="text-xl font-bold md:text-2xl">{session.title}</h1>
        </div>
        <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur">
          /live/{session.slug}/{languageCode}
        </div>
      </div>

      <div className="flex justify-center">
        <div
          className="relative w-full overflow-hidden rounded-xl"
          style={{
            aspectRatio: `${layout.canvasWidth} / ${layout.canvasHeight}`,
            backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.78), rgba(2, 6, 23, 0.82)), url(${layout.backgroundImageUrl})`,
            backgroundColor: layout.backgroundColor,
            backgroundPosition: `${layout.backgroundPositionX}% ${layout.backgroundPositionY}%`,
            backgroundRepeat: "no-repeat",
            backgroundSize: getBackgroundSize(layout.backgroundFit),
            maxHeight: "calc(100vh - 8rem)",
            maxWidth: `calc((100vh - 8rem) * ${canvasRatio})`
          }}
        >
          {layout.components.filter((component) => component.visible !== false).map((component) => (
            <section
              key={component.id}
              aria-label={component.label}
              className="absolute min-h-0"
              style={{
                ...getComponentFrameStyle(component, layout),
                zIndex: component.zIndex
              }}
            >
              {renderComponent(component, session, languageCode)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
