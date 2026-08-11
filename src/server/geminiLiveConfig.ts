interface CreateGeminiLiveConnectConfigParams {
  model: string;
  targetLanguageCode: string;
  sessionHandle?: string;
}

export function createGeminiLiveConnectConfig({
  model,
  targetLanguageCode,
  sessionHandle
}: CreateGeminiLiveConnectConfigParams) {
  return {
    model,
    config: {
      responseModalities: ["AUDIO"],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: {
        slidingWindow: {}
      },
      sessionResumption: {
        ...(sessionHandle ? { handle: sessionHandle } : {})
      },
      translationConfig: {
        targetLanguageCode,
        echoTargetLanguage: true
      }
    }
  };
}
