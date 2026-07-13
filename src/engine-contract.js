export function createEngineLoader(importEngine = () => import('./flight-engine.js')) {
  let status = 'idle'
  let promise = null

  const preload = () => {
    if (promise) return promise
    status = 'loading'
    promise = importEngine()
      .then((module) => module.bootFlightEngine())
      .then((engine) => {
        status = 'ready'
        return engine
      })
      .catch((error) => {
        status = 'idle'
        promise = null
        throw error
      })
    return promise
  }

  return {
    preload,
    getStatus: () => status,
    async start(kind, options = {}) {
      return (await preload()).startMode(kind, options)
    },
  }
}
