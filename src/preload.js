import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    sendSync: (channel, ...args) => ipcRenderer.sendSync(channel, ...args)
})
