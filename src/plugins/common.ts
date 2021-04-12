import { IpcRenderer } from "electron"
import SerialPort from "serialport";
import Api from "./api";


/**
 * ipcRenderer实例
 */
export const ipcRenderer: IpcRenderer = (<any>window).ipcRenderer

console.log({ window });



/**
 * api操作
 */
export const api = new Api()

/**
 * 打开文件对话框
 * @param options 
 * @returns 
 */
export const dialogOpen = (options: Electron.OpenDialogOptions): Promise<string> => {
    return ipcRenderer.invoke("openDialog", options)
}

/**
 * 保存数据
 * @param data 
 * @param options 
 */
export const dialogSave = (data: string | Buffer | Uint8Array, options: Electron.SaveDialogOptions) => {
    ipcRenderer.send('saveDialog', data, options)
}

/**
 * 弹窗提醒
 * @param msg 消息体
 * @param title 标题
 * @returns 
 */
export const Noti = (msg: string, title: string = 'Notifi') => {
    ipcRenderer.send('noti', msg, title)
}

export const NotiErr = (err: Error | any) => {
    if (err) Noti(err.message || err)
}

/**
 * 返回serialport列表
 * @returns 
 */
export const serialPortList = (): Promise<SerialPort.PortInfo[]> => {
    return ipcRenderer.invoke('seriallist')
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

// 重写serial实例
export class Serial {
    isOpen: boolean;
    path: string;
    options: SerialPort.OpenOptions;
    constructor(path: string, options: SerialPort.OpenOptions) {
        this.path = path
        this.options = options
        this.isOpen = ipcRenderer.sendSync('newSerial', path, options) as boolean
    }

    write(data: string | number[], encoding?: "ascii" | "utf8" | "utf16le" | "ucs2" | "base64" | "binary" | "hex") {
        ipcRenderer.send("serialWrite", this.path, data, encoding)
    }

    data(callback: (data: Buffer) => void) {
        ipcRenderer.on(this.path + 'data', (event, data: number[]) => {
            callback(Buffer.from(data))
        })
    }

    close() {
        ipcRenderer.send('serialClose', this.path)
    }
}

/**
 * 根据协议解析buffer数据
 * @param data 
 * @param instructs 
 * @param Type 
 * @returns 
 */
export const protocolParse = (data: Buffer, instructs: Uart.protocolInstruct, Type: 232 | 485): Promise<Map<string, Uart.queryResultArgument>> => {
    return ipcRenderer.invoke("protocolParse", data, JSON.stringify(instructs), Type)
}

/**
 * ArrayBuffer转string,Buffer
 * @param data 
 * @param encodeing 
 * @returns 
 */
export const numberArrayToString = (data: number, encodeing: "ascii" | "utf8" | "utf16le" | "ucs2" | "base64" | "binary" | "hex" = 'hex') => {
    return ipcRenderer.sendSync('numberArrayToString', data, encodeing)
}


/**
* 序列化接收stream，当接收流间隔为指定值内为连续字符内容
*/
/* class InterByteTimeoutParser extends stream.Transform {
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
} */