process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const sharp = require('sharp')
const QRCode = require('qrcode')
const crypto = require('crypto')
const express = require('express')

const expressApp = express()
expressApp.use(express.static(__dirname))
const expressServer = expressApp.listen(0, '127.0.0.1')

function getServerUrl() {
  return `http://127.0.0.1:${expressServer.address().port}`
}

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadURL(getServerUrl()+'/desktop.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  let mainWindow = createWindow()
  let watcher = new chokidar.FSWatcher()

  app.on('activate', () => mainWindow === null && createWindow())

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
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

async function selectFolder(mainWindow, watcher) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) { return }

  watcher.close()
  watcher = chokidar.watch(filePaths[0], { depth: 0 })
  watcher.on('all', (event, filePath) => {
    mainWindow.webContents.send('watch', { event, filePath })
  })

  return filePaths[0]
}

function loadImage(filePath) {
  return sharp(filePath).withMetadata()
}
