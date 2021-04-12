import { App, BrowserWindow, dialog, ipcMain, OpenDialogOptions } from "electron";
import ProtocolParse from "./plugins/ProtocolParse";
import fs from "fs"
import SerialPort from "serialport";
import InterByteTimeout from "@serialport/parser-inter-byte-timeout"

class IpcEvent {
    private app!: App
    private parse: ProtocolParse;
    private serialMap: Map<string, SerialPort>
    private serialParseMap: Map<string, any>
    private win!: BrowserWindow;
    constructor() {
        this.parse = new ProtocolParse()
        this.serialMap = new Map()
        this.serialParseMap = new Map()
        this.listen()
    }

    attch(app: App, win: BrowserWindow) {
        this.app = app
        this.win = win
    }

    private listen() {
        // 监听打开文件对话框
        ipcMain.handle('openDialog', async (event, options: OpenDialogOptions) => {
            const { canceled, filePaths } = await dialog.showOpenDialog(options)
            if (canceled) return ''
            else {
                const readStream = fs.createReadStream(filePaths[0], {
                    flags: 'r',       // 设置文件只读模式打开文件
                    encoding: 'utf8'  // 设置读取文件的内容的编码
                });
                // 打开文件流的事件。
                readStream
                    .on('open', fd => {
                        console.log('文件可读流已打开，句柄：%s', fd);
                    })
                    .on('error', err => { return '' })
                    .on('data', data => {
                        return data as string
                    })
            }
        })

        // 监听保存文件对话框
        ipcMain.on("saveDialog", (event, data: string | Buffer | Uint8Array, options: Electron.SaveDialogOptions) => {
            dialog.showSaveDialog(options).then(el => {
                if (el.filePath) {
                    const stream = fs.createWriteStream(el.filePath[0])
                    stream.write(data)
                    stream.end()
                }
            })
        })

        // 监听弹窗提醒
        ipcMain.on('noti', (event, msg: string, title: string) => {
            console.log(msg);
            new Notification(title, { body: msg })
        })

        // 获取serialList
        ipcMain.handle('seriallist', async () => await SerialPort.list())

        // 创建新的serial实例
        ipcMain
            .on('newSerial', (event, path: string, options: SerialPort.OpenOptions) => {
                if (this.serialMap.has(path)) {
                    const serial = this.serialMap.get(path)!
                    if (serial.isOpen) serial.close()
                    if (!serial.destroyed) serial.destroy()
                    this.serialMap.delete(path)
                    this.serialParseMap.delete(path)
                }

                const serial = new SerialPort(path, options, err => {
                    console.log({ err });

                })

                const parse = serial.pipe(new InterByteTimeout({ interval: 20 }))
                parse.on('data', (data: Buffer) => {
                    this.win.webContents.send(path + 'data', data)
                })
                this.serialParseMap.set(path, parse)
                this.serialMap.set(path, serial)
                event.returnValue = true
                // console.log(this.serialMap);

            })
            .on("serialWrite", (event, path: string, data: string | Buffer | number[], encoding?: "ascii" | "utf8" | "utf16le" | "ucs2" | "base64" | "binary" | "hex") => {
                const serial = this.serialMap.get(path)!
                serial.write(data, encoding, (err, result) => {
                    if (err) console.log('Error while sending message : ' + err)
                    if (result) console.log('Response received after sending message : ' + result)
                })
            })
            .on('serialClose', (event, path) => {
                if (this.serialMap.has(path)) {
                    const serial = this.serialMap.get(path)!
                    if (serial.isOpen) serial.close()
                    if (!serial.destroyed) serial.destroy()
                    this.serialMap.delete(path)
                    this.serialParseMap.delete(path)
                }
            })

        // 解析Buffer数据
        ipcMain.handle("protocolParse", (event, data: Buffer, instructs: string, Type: 232 | 485) => {
            return this.parse.parse(Buffer.from(data), JSON.parse(instructs), Type)
        })

    }
}

export default IpcEvent