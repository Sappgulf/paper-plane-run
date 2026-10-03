import { createProgressBackup, MAX_BACKUP_BYTES, parseProgressBackup, restoreProgressBackup } from '../game/progress-backup.js'

const RECOVERY_KEY = 'paper-plane-run-recovery-v1'

export function initProgressKit() {
  const element = id => document.getElementById(id)
  if (!element('backup-export')) return
  let previewText = null
  let fileRequest = 0
  const status = (message, error = false) => {
    element('backup-status').textContent = message
    element('backup-status').dataset.error = String(error)
  }
  const invalidate = () => {
    previewText = null
    element('backup-preview').hidden = true
  }
  const preview = text => {
    invalidate()
    try {
      const backup = parseProgressBackup(text)
      previewText = text
      const { pilot, wallet, runs, postcards } = backup.summary
      element('backup-preview-summary').textContent = `${pilot} · ${wallet}★ wallet · ${runs} flights · ${postcards} postcards. Saved ${new Date(backup.createdAt).toLocaleString()}.`
      element('backup-preview').hidden = false
      status('Backup checked. Review the flight log before restoring.')
    } catch (error) { status(error.message, true) }
  }
  try { element('backup-undo').hidden = !localStorage.getItem(RECOVERY_KEY) } catch { /* Export reports unavailable storage on use. */ }
  const nativeBackupShare = window.webkit?.messageHandlers?.shareBackup
  element('backup-share').hidden = !nativeBackupShare
  element('backup-download').hidden = location.protocol === 'paper-plane:' || Boolean(nativeBackupShare)
  if (nativeBackupShare) element('backup-export-label').textContent = 'Your portable save · save or share the file'
  element('backup-export').onclick = () => {
    try {
      element('backup-export-text').value = createProgressBackup(localStorage)
      element('backup-export-panel').hidden = false
      element('backup-export-text').focus()
      element('backup-export-text').select()
      status('Portable save ready. Copy the text or download a file to keep it.')
    } catch (error) { status(`Could not export progress: ${error.message}`, true) }
  }
  element('backup-download').onclick = () => {
    const text = element('backup-export-text').value
    if (!text) return
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `paper-plane-progress-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  element('backup-share').onclick = () => {
    const text = element('backup-export-text').value
    if (!text || !nativeBackupShare) return
    try {
      nativeBackupShare.postMessage(text)
      status('Choose where to save or share your progress backup.')
    } catch (error) { status(`Could not share backup: ${error.message}`, true) }
  }
  element('backup-import-text').oninput = () => {
    fileRequest++
    invalidate()
    status('Preview this save to check its contents.')
  }
  element('backup-preview-btn').onclick = () => preview(element('backup-import-text').value)
  element('backup-file').onchange = async event => {
    const request = ++fileRequest
    invalidate()
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) { status('Choose a backup smaller than 2 MB.', true); return }
    try {
      const text = await file.text()
      if (request !== fileRequest) return
      element('backup-import-text').value = text
      preview(text)
    } catch { if (request === fileRequest) status('Could not read this file. Try pasting the save text.', true) }
  }
  element('backup-restore').onclick = () => {
    if (!previewText) return
    try {
      // A recoverable snapshot must be stored before any existing save keys change.
      const recovery = createProgressBackup(localStorage)
      localStorage.setItem(RECOVERY_KEY, recovery)
      restoreProgressBackup(localStorage, previewText)
      location.reload()
    } catch (error) {
      status(error.message, true)
      element('backup-undo').hidden = false
    }
  }
  element('backup-undo').onclick = () => {
    try {
      const recovery = localStorage.getItem(RECOVERY_KEY)
      if (!recovery) { status('No earlier restore to undo.'); return }
      restoreProgressBackup(localStorage, recovery)
      localStorage.removeItem(RECOVERY_KEY)
      location.reload()
    } catch (error) { status(error.message, true) }
  }
}
