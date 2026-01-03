import path from 'path'
import { app, ipcMain, dialog } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import fs from 'fs/promises'
import ollama from 'ollama'

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

ipcMain.handle('ask-ai-rename', async (_, filePath: string) => {
  try {
    const fileBuffer = await fs.readFile(filePath)
    const response = await ollama.generate({
      model: 'llava',
      prompt: "Analyze this image. Return ONLY a short, descriptive filename in snake_case (e.g., sunny_beach_dog). Do NOT include the file extension. Do NOT add any conversational text. If unsure, return 'unknown_image'.",
      images: [fileBuffer.toString('base64')], // ollama-js expects base64 string or Uint8Array, let's try base64 to be safe or check docs. 
      // Actually, ollama-js `images` is `(string | Uint8Array)[]`. passing buffer directly might fail if not handled? 
      // Let's stick to base64 for safety as per common usage, or pass buffer if supported. 
      // Documentation says `Uint8Array` is supported. fs.readFile returns Buffer which is Uint8Array.
    })

    let newName = response.response.trim()
    // cleanup in case model adds extra text
    newName = newName.replace(/[\n\r]/g, '').replace(/\s/g, '_').toLowerCase()

    return { success: true, newName }
  } catch (error) {
    console.error('AI Rename Error:', error)
    return { success: false, error: String(error) }
  }
})
