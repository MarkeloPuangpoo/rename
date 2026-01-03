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
    console.log(`Processing file: ${filePath}`)
    const fileBuffer = await fs.readFile(filePath)

    // Prompt: No examples, explicit constraint on keywords
    const prompt = "Describe the main subject of this image using 2 to 4 keywords. Separate keywords with underscores. Return ONLY the keywords. Do not start with 'The image...'."

    const response = await ollama.generate({
      model: 'moondream',
      prompt: prompt,
      images: [fileBuffer.toString('base64')],
      stream: false
    })

    console.log('Raw AI Response:', response.response)

    let newName = response.response.trim()

    // Cleaning
    newName = newName
      .replace(/[\n\r]/g, '')
      .replace(/[^\w\s_-]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()

    // Fix for short names
    if (newName.length < 3) {
      newName = `image_${newName}`;
    }

    // Truncate if too long (keeping this as safety)
    if (newName.length > 50) {
      newName = newName.substring(0, 50);
    }

    console.log('Final Filename:', newName)

    if (!newName) {
      throw new Error('AI returned empty response')
    }

    return { success: true, newName }
  } catch (error) {
    console.error('AI Rename Error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('check-ai-status', async () => {
  try {
    const list = await ollama.list()
    const hasModel = list.models.some(m => m.name.includes('moondream'))
    if (hasModel) {
      return { success: true, message: 'Connected to Ollama (moondream available)' }
    }
    return { success: false, message: 'Ollama connected, but moondream model not found. Run "ollama pull moondream"' }
  } catch (error) {
    return { success: false, message: 'Failed to connect to Ollama. Make sure it is running.' }
  }
})
