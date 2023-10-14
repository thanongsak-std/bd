/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

const backend = {
  getServerUrl () {
    return ipcRenderer.invoke('getServerUrl')
  },
  selectFolder () {
    return ipcRenderer.invoke('selectFolder')
  },
  getOriginImage (filePath) {
    return ipcRenderer.invoke('getOriginImage', filePath)
  },
  getThumbnailImage (filePath) {
    return ipcRenderer.invoke('getThumbnailImage', filePath)
  },
  getQRCodeImage (text, opts = null) {
    return ipcRenderer.invoke('getQRCodeImage', text, opts)
  },
  getBaseName (filePath) {
    return ipcRenderer.invoke('getBaseName', filePath)
  },
  watch (listener) {
    return ipcRenderer.on('watch', listener)
  },
}

contextBridge.exposeInMainWorld('backend', backend)
