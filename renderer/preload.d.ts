import { IpcHandler } from '../main/preload'

declare global {
  interface Window {
    ipc: IpcHandler
    electronAPI: {
      generateAiName: (filePath: string) => Promise<{ success: boolean; newName?: string; error?: string }>
      checkAiStatus: () => Promise<{ success: boolean; message: string }>
    }
  }
}
