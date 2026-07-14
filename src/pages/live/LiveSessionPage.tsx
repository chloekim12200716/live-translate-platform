import React, { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import DisplayRenderer from "../../components/platform/DisplayRenderer";
import {
  mockPlatformData,
  mockPlatformLayout,
  mockPlatformSession
} from "../../data/mockPlatformData";
import { loadStoredLayout } from "../../data/platformLayoutStorage";

export default function LiveSessionPage() {
  const { sessionSlug, languageCode } = useParams();
  const resolvedLanguage = languageCode ?? mockPlatformData.event.defaultLanguageCode;
  const [layout] = useState(() => loadStoredLayout(mockPlatformSession.slug, mockPlatformLayout));

  if (sessionSlug !== mockPlatformSession.slug) {
    return <Navigate to={`/live/${mockPlatformSession.slug}/${resolvedLanguage}`} replace />;
  }

  return (
    <DisplayRenderer
      layout={layout}
      session={mockPlatformSession}
      languageCode={resolvedLanguage}
    />
  );
}
