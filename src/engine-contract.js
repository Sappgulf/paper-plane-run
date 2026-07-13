export class EngineLifecycleError extends Error {
  constructor(phase, cause) {
    super(cause?.message || `Flight engine ${phase} failed`, { cause })
    this.name = 'EngineLifecycleError'
    this.phase = phase
    this.requiresReload = phase === 'boot'
  }
}

export function createEngineLoader(importEngine = () => import('./flight-engine.js')) {
  let status = 'idle'
  let promise = null

  const preload = () => {
    if (promise) return promise
    status = 'loading'
    let imported
    try {
      imported = importEngine()
    } catch (error) {
      imported = Promise.reject(error)
    }
    promise = Promise.resolve(imported)
      .catch((error) => {
        status = 'idle'
        promise = null
        throw new EngineLifecycleError('import', error)
      })
      .then((module) => Promise.resolve()
        .then(() => module.bootFlightEngine())
        .catch((error) => {
          status = 'reload-required'
          throw new EngineLifecycleError('boot', error)
        }))
      .then((engine) => {
        status = 'ready'
        return engine
      })
    return promise
  }

  return {
    preload,
    getStatus: () => status,
    async syncSettings(settings) {
      const engine = await preload()
      if (typeof engine.syncSettings !== 'function') return { settings, arPermissionDenied: false }
      return engine.syncSettings(settings)
    },
    async start(kind, options = {}) {
      return (await preload()).startMode(kind, options)
    },
  }
}
