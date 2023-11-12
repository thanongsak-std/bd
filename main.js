process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

const { app } = require('electron')

app.whenReady().then(async () => {
  const { BrowserWindow } = require('electron')
  const path = require('path')
  const express = require('express')

  const expressApp = express()
  expressApp.use(express.static(__dirname))
  const expressServer = await new Promise((resolve) => {
    const self = expressApp.listen(0, '127.0.0.1', () => resolve(self))
  })

  const getServerUrl = () => `http://127.0.0.1:${expressServer.address().port}`

  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    icon:'build/logo.ico',
    contextIsolation: false,
    nodeIntegration: true
  })

  mainWindow.loadURL(getServerUrl()+'/desktop.html')

  // mainWindow.webContents.openDevTools()

  const { dialog, ipcMain } = require('electron')
  const QRCode = require('qrcode')
  const chokidar = require('chokidar')
  const sharp = require('sharp')

  const loadImage = (filePath) => sharp(filePath).withMetadata()

  let watcher = new chokidar.FSWatcher()

  ipcMain.handle('getServerUrl', () => getServerUrl())

  ipcMain.handle('selectFolder', async () => {
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
  })

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
