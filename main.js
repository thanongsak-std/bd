// Modules to control application life and create native browser window
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const chokidar = require('chokidar')
const sharp = require('sharp')
const QRCode = require('qrcode')
const crypto = require('crypto')

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
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  let mainWindow = createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0)
      mainWindow = createWindow()
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return canceled ? null : filePaths[0]
  })

  let watcher = new chokidar.FSWatcher()

  ipcMain.handle('set:directoryPath', (event, dirPath) => {
    watcher.close()
    watcher = chokidar.watch(dirPath, { depth: 0 })
    watcher.on('all', (event, filePath) => {
      mainWindow.webContents.send('watch', { event, filePath })
    })
  })

  ipcMain.handle('get:thumbnail', async (event, filePath, text = null) => {
    const image = sharp(filePath).resize(500, 500).withMetadata()
    if (text) image.composite([{
      input: await QRCode.toBuffer(text, { margin: 2, scale: 3 }),
      gravity: sharp.gravity.northeast,
    }])
    return image.toBuffer()
  })

  ipcMain.handle('get:basename', (event, filePath) => {
    return path.basename(filePath)
  })

  ipcMain.handle('get:image', (event, filePath) => {
    return sharp(filePath).withMetadata().toBuffer()
  })

  ipcMain.handle('md5', (event, data) => {
    return crypto.createHash('md5').update(data).digest('hex')
  })

  ipcMain.handle('get:qrcode', (event, text, opts = null) => {
    return QRCode.toBuffer(text, opts)
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
require('electron-reloader')(module)
