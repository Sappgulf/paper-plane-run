export function selectLayoutForStart(currentLayout, kind, options = {}) {
  if (kind === 'layout' && options.layout) return options.layout
  return currentLayout
}

/**
 * Apply a settings change to the live runtime.
 *
 * `arPermissionDenied` is retained in the shape rather than dropped: the iOS
 * shell and the settings panel both read the result, and a field that silently
 * disappears is a worse break than one that is always false.
 */
export async function synchronizeRuntimeSettings(nextSettings, {
  persist = (partial) => ({ ...nextSettings, ...partial }),
  applyDocumentA11y = () => {},
  applyPerformance = () => {},
  rebuildPowerPalette = () => {},
  applySeason = () => {},
  updateControls = () => {},
} = {}) {
  const settings = { ...nextSettings }

  applyDocumentA11y(settings)
  applyPerformance(settings)
  rebuildPowerPalette(settings)
  applySeason(settings)
  updateControls(settings)

  return { settings, arPermissionDenied: false }
}
