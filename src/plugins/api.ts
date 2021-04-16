interface crcbody {
    protocolType: number
    pid: number
    instructN: string
    address: number
    value: number
}

export default class Api {
    constructor() {
    }

    private post(url: string, data: { [x in string]: any } = {}) {
        return fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    private get(url: string, data: { [x in string]: any }) {
        // return fetch(`${url}?${Querystring.stringify(data)}`)
    }

    /**
     * 获取crc编码
     * @param body 
     * @returns 
     */
    /* async crc(body: crcbody) {
        const rs = await this.post('https://uart.ladishb.com/api/open/CRC', body);
        return rs.status === 200 ? await rs.text() : Promise.resolve('crc请求出错')
    }
 */
    /**
     * 获取协议数据
     * @returns 
     */
    async protocols() {
        const rs = await this.post('https://uart.ladishb.com/api/open/protocol');
        return await rs.json() as Uart.protocol[]
    }
}