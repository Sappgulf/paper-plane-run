export function selectLayoutForStart(currentLayout, kind, options = {}) {
  if (kind === 'layout' && options.layout) return options.layout
  return currentLayout
}

export async function synchronizeRuntimeSettings(nextSettings, {
  deskAR,
  persist = (partial) => ({ ...nextSettings, ...partial }),
  applyDocumentA11y = () => {},
  applyPerformance = () => {},
  rebuildPowerPalette = () => {},
  applySeason = () => {},
  updateControls = () => {},
} = {}) {
  let settings = { ...nextSettings }
  let arPermissionDenied = false

  if (settings.arDesk) {
    let enabled = Boolean(deskAR?.active)
    if (!enabled) {
      try {
        enabled = Boolean(await deskAR?.start?.())
      } catch {
        enabled = false
      }
    }
    if (!enabled) {
      arPermissionDenied = true
      settings = { ...settings, ...(persist({ arDesk: false }) || {}), arDesk: false }
    }
  } else if (deskAR?.active) {
    deskAR.stop?.()
  }

  applyDocumentA11y(settings)
  applyPerformance(settings)
  rebuildPowerPalette(settings)
  applySeason(settings)
  updateControls(settings)

  return { settings, arPermissionDenied }
}
