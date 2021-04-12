import SerialPort from "serialport";
import { Remote, IpcRenderer } from "electron"
import fs from "fs"
import querystring from "querystring"
import stream from 'stream'
import Api from "./api";
import ProtocolParse from "./ProtocolParse";

/**
 * electron远程对象
 */
const electronRemote = (<any>window).electron.remote as Remote

/**
 * api操作
 */
export const api = new Api()

/**
 * 协议解析
 */
export const protocolParse = new ProtocolParse()

/**
 * ipcRender
 */
export const ipcRenderer = (<IpcRenderer>(<any>window).electron.ipcRenderer)

/**
 * node querystring
 */
export const Querystring = (<typeof querystring>electronRemote.getGlobal('querystring'))

/** 
 * serial串口对象
 */
export const serialport = (<typeof SerialPort>electronRemote.getGlobal('SerialPort'))

/**
 * serialPort/parse/timeOut对象
 */
export const InterByteTimeout = (<typeof InterByteTimeoutParser>electronRemote.getGlobal("InterByteTimeout"))
/**
 * 文件操作对象
 */
export const Fs = (<typeof fs>electronRemote.getGlobal("fs"))

/**
 * 打开文件对话框
 * @param options 
 * @returns 
 */
export const dialogOpen = (options: Electron.OpenDialogOptions) => {
    return new Promise<string>((resolve, reject) => {
        const result = ipcRenderer.sendSync('dialogOpen', options) as Electron.OpenDialogReturnValue
        if (result.canceled) reject(result)
        // 创建可读流
        const readStream = Fs.createReadStream(result.filePaths[0], {
            flags: 'r',       // 设置文件只读模式打开文件
            encoding: 'utf8'  // 设置读取文件的内容的编码
        });
        // 打开文件流的事件。
        readStream
            .on('open', fd => {
                console.log('文件可读流已打开，句柄：%s', fd);
            })
            .on('error', err => reject(err))
            .on('data', data => {
                resolve(data as string)
            })
    })
}

/**
 * 保存数据
 * @param data 
 * @param options 
 */
export const dialogSave = (data: string | Buffer | Uint8Array, options: Electron.SaveDialogOptions) => {
    electronRemote.dialog.showSaveDialog(electronRemote.getCurrentWindow(), options).then(result => {
        if (result.filePath) {
            // 创建一个可以写入的流，写入到文件 output.txt 中
            const writerStream = Fs.createWriteStream(result.filePath);
            // 使用 utf8 编码写入数据
            writerStream.write(data || '');
            // 标记文件末尾
            writerStream.end();
            writerStream.on('error', err => NotiErr(err));
        }
    }).catch(err => NotiErr(err))
}

/**
 * 弹窗提醒
 * @param msg 消息体
 * @param title 标题
 * @returns 
 */
export const Noti = (msg: string, title: string = 'Notifi') => {
    console.log(title, msg);
    new Notification(title, { body: msg })
    return msg
}

export const NotiErr = (err: Error | any) => {
    if (err) Noti(err.message || err)
}

/**
 * 返回serialport列表
 * @returns 
 */
export const serialPortList = () => {
    return serialport.list()
}

/**
 * buffer转字符串
 * @param hex buffer
 * @returns 
 */
export const bufferToString = (hex: ArrayBuffer | SharedArrayBuffer) => {
    return Buffer.from(hex).toString('utf8')
}

/**
 * hex字符串转字符串
 * @param hex 
 * @returns 
 */
export const hexToString = (hex: string) => {
    return Buffer.from(hex, 'hex').toString('utf8')
}

/**
 * hex转数字
 * @param hex hex字符串
 * @returns 
 */
export const hexToNumber = (hex: string) => {
    const buf = Buffer.from(hex, 'hex')
    return buf.readIntBE(0, buf.length)
}

/**
 * 格式化的时间
 * @returns 
 */
export const formatTime = () => {
    const time = new Date()
    return `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}:${time.getMilliseconds()}`
}


/**
* 序列化接收stream，当接收流间隔为指定值内为连续字符内容
*/
class InterByteTimeoutParser extends stream.Transform {
    maxBufferSize: number
    currentPacket: number[]
    interval: number
    intervalID!: NodeJS.Timeout
    constructor(options: { interval: number; maxBufferSize?: number }) {
        super()
        options = { maxBufferSize: 65536, ...options }

        this.maxBufferSize = options.maxBufferSize!
        this.currentPacket = []
        this.interval = options.interval
    }
    _transform(chunk: number[], encoding: string, cb: CallableFunction) {

        clearTimeout(this.intervalID)
        for (let offset = 0; offset < chunk.length; offset++) {
            this.currentPacket.push(chunk[offset])
            if (this.currentPacket.length >= this.maxBufferSize) {
                this.emitPacket()
            }
        }
        this.intervalID = setTimeout(this.emitPacket.bind(this), this.interval)
        cb()
    }
    emitPacket() {
        clearTimeout(this.intervalID)
        if (this.currentPacket.length > 0) {
            this.push(Buffer.from(this.currentPacket))
        }
        this.currentPacket = []
    }
    _flush(cb: CallableFunction) {
        this.emitPacket()
        cb()
    }
}