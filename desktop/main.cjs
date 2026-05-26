const { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage } = require('electron')
const path = require('path')

const WIDGET_URL = process.env.JIHUA_WIDGET_URL || 'http://124.222.99.202/widget'
const MAIN_URL = process.env.JIHUA_MAIN_URL || 'http://124.222.99.202/'

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
    maxHeight: 900,
    useContentSize: true,
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

  // Center-anchored resize: 拖任意边都围绕中心对称扩张/收缩
  let resizeCenter = null
  let suppressMove = false

  widgetWin.on('will-resize', () => {
    if (!resizeCenter) {
      const b = widgetWin.getBounds()
      resizeCenter = { cx: b.x + b.width / 2, cy: b.y + b.height / 2 }
    }
  })

  widgetWin.on('resize', () => {
    if (!resizeCenter) return
    const b = widgetWin.getBounds()
    const newX = Math.round(resizeCenter.cx - b.width / 2)
    const newY = Math.round(resizeCenter.cy - b.height / 2)
    if (newX === b.x && newY === b.y) return
    suppressMove = true
    widgetWin.setBounds({ x: newX, y: newY, width: b.width, height: b.height })
    setImmediate(() => { suppressMove = false })
  })

  widgetWin.on('resized', () => { resizeCenter = null })

  widgetWin.on('move', () => {
    if (suppressMove) return
    resizeCenter = null
  })

  widgetWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  widgetWin.on('enter-full-screen', () => {
    widgetWin.webContents.send('widget:fullScreenChanged', true)
  })
  widgetWin.on('leave-full-screen', () => {
    widgetWin.webContents.send('widget:fullScreenChanged', false)
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

ipcMain.handle('widget:toggleFullScreen', () => {
  if (!widgetWin) return false
  const next = !widgetWin.isFullScreen()
  widgetWin.setFullScreen(next)
  return next
})

ipcMain.handle('widget:isFullScreen', () => {
  return widgetWin ? widgetWin.isFullScreen() : false
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (widgetWin) {
      if (widgetWin.isMinimized()) widgetWin.restore()
      widgetWin.show()
      widgetWin.focus()
    } else {
      createWidget()
    }
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
}
