process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true;

const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const sharp = require('sharp')
const QRCode = require('qrcode')
const express = require('express')

const expressApp = express()
expressApp.use(express.static(__dirname))
const expressServer = expressApp.listen(0, '127.0.0.1')

app.whenReady().then(() => {
  let mainWindow = createWindow()
  let watcher = new chokidar.FSWatcher()

  ipcMain.handle('getServerUrl', () => getServerUrl())

  ipcMain.handle('selectFolder', () => selectFolder(mainWindow, watcher))

  ipcMain.handle('getOriginImage', (event, filePath) => {
    return loadImage(filePath).toBuffer()
  })

  ipcMain.handle('getThumbnailImage', (event, filePath) => {
    return loadImage(filePath).resize(300, 300).toBuffer()
  })

  ipcMain.handle('getQRCodeImage', (event, text, opts = null) => {
    return QRCode.toBuffer(text, opts)
  })

  ipcMain.handle('getBaseName', (event, filePath) => {
    return path.basename(filePath)
  })
})

function getServerUrl() {
  return `http://127.0.0.1:${expressServer.address().port}`
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    icon:'IMG/Backdrop_Booth_logo.png',
    contextIsolation: false,
    nodeIntegration: true
  })

  mainWindow.loadURL(getServerUrl()+'/desktop.html')

  // mainWindow.webContents.openDevTools()

  return mainWindow
}

async function selectFolder(mainWindow, watcher) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) { return }

  watcher.close()
  watcher = chokidar.watch(filePaths[0], { depth: 0, awaitWriteFinish: true })
  watcher.on('all', (event, filePath) => {
    mainWindow.webContents.send('watch', { event, filePath })
  })

  return filePaths[0]
}

function loadImage(filePath) {
  return sharp(filePath).withMetadata()
}
