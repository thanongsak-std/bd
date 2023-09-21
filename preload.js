/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron')

const myAPI = {
  openDirectory: () => {
    return ipcRenderer.invoke('dialog:openDirectory')
  },
  setDirectoryPath: (directoryPath) => {
    ipcRenderer.invoke('set:directoryPath', directoryPath)
  },
  watch: (callback) => {
    ipcRenderer.on('watch', callback)
  },
  getBasename: (filePath) => {
    return ipcRenderer.invoke('get:basename', filePath)
  },
  getThumbnail: async (filePath, text = null) => {
    const buffer = await ipcRenderer.invoke('get:thumbnail', filePath, text)
    const fileName = myAPI.getBasename(filePath)
    return new File([buffer], fileName)
  },
  getThumbnailURL: async (filePath, text = null) => {
    return URL.createObjectURL(await myAPI.getThumbnail(filePath, text))
  },
  getImage: async (filePath) => {
    const buffer = await ipcRenderer.invoke('get:image', filePath)
    const fileName = myAPI.getBasename(filePath)
    return new File([buffer], fileName)
  },
  getImageURL: async (filePath) => {
    return URL.createObjectURL(await myAPI.getImage(filePath))
  },
  md5: (data) => {
    return ipcRenderer.invoke('md5', data)
  },
  getQRCode: async (text, opts = null) => {
    return ipcRenderer.invoke('get:qrcode', text, opts)
  }
}

contextBridge.exposeInMainWorld('myAPI', myAPI)
