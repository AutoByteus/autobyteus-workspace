export {}

declare global {
  const useRuntimeConfig: () => {
    public: {
      graphqlBaseUrl: string
      restBaseUrl: string
      defaultNodeBaseUrl: string
      graphqlWsEndpoint: string
      terminalWsEndpoint: string
      audio: { transcriptionWsEndpoint: string }
    }
  }
}
