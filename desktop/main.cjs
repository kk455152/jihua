const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } = require('electron')
const path = require('path')

const WIDGET_URL = process.env.JIHUA_WIDGET_URL || 'http://localhost:8080/widget'
const MAIN_URL = process.env.JIHUA_MAIN_URL || 'http://localhost:8080/'

let widgetWin = null
let tray = null

function createWidget() {
  if (widgetWin) {
    widgetWin.show()
    widgetWin.focus()
    return widgetWin
  }
  widgetWin = new BrowserWindow({
    width: 340,
    height: 640,
    minWidth: 280,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    title: '计划 · 桌面挂件',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  widgetWin.loadURL(WIDGET_URL)

  widgetWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  widgetWin.on('closed', () => {
    widgetWin = null
  })

  return widgetWin
}

function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip('计划 · Jihua')
  const menu = Menu.buildFromTemplate([
    { label: '显示挂件', click: () => createWidget() },
    { label: '打开主界面', click: () => shell.openExternal(MAIN_URL) },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on('click', () => createWidget())
}

ipcMain.handle('widget:setAlwaysOnTop', (_e, on) => {
  if (widgetWin) widgetWin.setAlwaysOnTop(!!on, 'floating')
  return !!on
})

ipcMain.handle('widget:close', () => {
  if (widgetWin) widgetWin.close()
})

ipcMain.handle('widget:openMain', () => {
  shell.openExternal(MAIN_URL)
})

app.whenReady().then(() => {
  createWidget()
  try { createTray() } catch (_) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWidget()
  })
})

app.on('window-all-closed', () => {
  // Keep app alive in tray; user must quit explicitly
})
