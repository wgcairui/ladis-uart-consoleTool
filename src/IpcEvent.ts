import { App, BrowserWindow, dialog, ipcMain, OpenDialogOptions, Notification } from "electron";
import ProtocolParse from "./plugins/ProtocolParse";
import fs from "fs"
import SerialPort from "serialport";
import InterByteTimeout from "@serialport/parser-inter-byte-timeout"
import { crc16modbus } from "crc";

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
                const data = await new Promise<string>((resolve) => {
                    readStream
                        .on('open', fd => {
                            console.log('文件可读流已打开，句柄：%s', fd);
                        })
                        .on('error', err => { return '' })
                        .on('data', data => {
                            resolve(data.toString())
                        })
                })
                return data
            }
        })

        // 监听保存文件对话框
        ipcMain.on("saveDialog", (event, data: string | Buffer | Uint8Array, options: Electron.SaveDialogOptions) => {
            dialog.showSaveDialog(options).then(el => {
                console.log(el);

                if (el.filePath) {
                    const stream = fs.createWriteStream(el.filePath)
                    stream.write(data)
                    stream.end()
                }
            })
        })

        // 监听弹窗提醒
        ipcMain.on('noti', (event, msg: string, title: string) => {
            console.log(msg);
            new Notification({ title, body: msg })
        })

        // 获取serialList
        ipcMain.handle('seriallist', async () => {
            return await SerialPort.list()
        })

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
                    if (err) {
                        console.log(err);
                        new Notification({ title: err.name, body: err.message })
                    }

                })

                const parse = serial.pipe(new InterByteTimeout({ interval: 50 }))
                parse.on('data', (data: Buffer) => {
                    this.win.webContents.send(path + 'data', data)
                })
                this.serialParseMap.set(path, parse)
                this.serialMap.set(path, serial)
                event.returnValue = true

            })
            .on("serialWrite", (event, path: string, data: string, encoding?: "ascii" | "utf8" | "utf16le" | "ucs2" | "base64" | "binary" | "hex") => {
                const serial = this.serialMap.get(path)!
                const buf = Buffer.from(data, encoding)
                serial.write(buf, (err, result) => {
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
        ipcMain.handle("protocolParse", (event, data: Buffer, instructs: any, Type: 232 | 485) => {
            try {
                return this.parse.parse(Buffer.from(data), instructs, Type)
            } catch (error) {
                // console.log({ a: 'aaaaaaa', error });
                new Notification({ title: '协议解析出错' })
                dialog.showErrorBox('协议解析出错', error)
            }

        })

        // crc
        ipcMain.on("crc", (event, address: number, instruct: string) => {
            const body = address.toString(16).padStart(2, "0") + instruct;
            const crc = crc16modbus(Buffer.from(body, "hex"))
                .toString(16)
                .padStart(4, "0");
            const [a, b, c, d] = [...crc];
            event.returnValue = body + c + d + a + b;
        })

    }
}

export default IpcEvent