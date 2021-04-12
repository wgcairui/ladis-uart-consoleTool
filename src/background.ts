'use strict'

import { app, protocol, BrowserWindow, Menu, shell, screen, ipcMain, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import querystring from "querystring"
import path from "path"

import fs from 'fs'
import InterByteTimeout from "@serialport/parser-inter-byte-timeout"
import SerialPort from 'serialport'
import IpcEvent from './IpcEvent'

(<any>global).SerialPort = SerialPort;
(<any>global).fs = fs;
(<any>global).querystring = querystring;
(<any>global).InterByteTimeout = InterByteTimeout;

const isDevelopment = process.env.NODE_ENV !== 'production'
app.allowRendererProcessReuse = false
let win: BrowserWindow
const ipcEvent = new IpcEvent()

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])

function createWindow() {
    // Create the browser window.
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    win = new BrowserWindow({
        width,
        height,
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            // nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION
            // nodeIntegration: true,
            // nodeIntegrationInWorker: true,
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION as unknown as boolean,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }

    })

    win.once('ready-to-show', () => {
        win.show()
    })

    ipcEvent.attch(app, win)

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
        if (!process.env.IS_TEST) win.webContents.openDevTools()
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
    const menu = Menu.buildFromTemplate([
        {
            label: '文件',
            role: 'fileMenu',
            submenu: [
                {
                    label: '保存接收数据',
                    accelerator: 'Ctrl + S',
                    click: function () {
                        win.webContents.send('writeFile');
                    }
                },
                {
                    label: '读取文件数据',
                    accelerator: 'Ctrl + L',
                    click: function () {
                        win.webContents.send('readFile');
                    }
                }
                ,
                {
                    label: '保存配置信息',
                    accelerator: 'Ctrl + 1',
                    click: function () {
                        win.webContents.send('saveOptions');
                    }
                },
                {
                    label: '加载配置文件',
                    accelerator: 'Ctrl + 2',
                    click: function () {
                        win.webContents.send('loadOptions');
                    }
                }
            ]
        },
        {
            label: '帮助',
            role: 'help',
            accelerator: 'Ctrl + H',
            submenu: [
                {
                    label: '反馈',
                    click: function () {
                        shell.openExternal('https://github.com/wgcairui/ladis-uart-consoleTool')
                    }
                },
                {
                    label: '透传网站',
                    click: function () {
                        shell.openExternal('https://uart.ladishb.com')
                    }
                }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);
}

// Quit when all windows are closed.
app
    .on('window-all-closed', () => {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        console.log('window-all-closed');
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
    .on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow()
        }
    })
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    .on('ready', async () => {
        if (isDevelopment && !process.env.IS_TEST) {
            // Install Vue Devtools
            try {
                await installExtension(VUEJS_DEVTOOLS)
            } catch (e) {
                console.error('Vue Devtools failed to install:', e.toString())
            }
        }
        createWindow()
    })

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
