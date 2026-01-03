import path from 'path'
import { app, ipcMain, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import fs from 'fs/promises'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

; (async () => {
  await app.whenReady()

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./home')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/home`)
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
  })
  return result.filePaths
})

ipcMain.handle('rename-files', async (_, files: { original: string; new: string }[]) => {
  const results = []
  for (const file of files) {
    try {
      const dir = path.dirname(file.original)
      const newPath = path.join(dir, file.new)
      await fs.rename(file.original, newPath)
      results.push({ ...file, status: 'success' })
    } catch (error) {
      console.error(`Failed to rename ${file.original}:`, error)
      results.push({ ...file, status: 'error', error: String(error) })
    }
  }
  return results
})
