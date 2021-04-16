
export interface query extends Uart.queryResultArgument {
    regx: string
}

/**
 * 设备返回数据解析类,根据协议解析bufer
 */
class ProtocolParse {
    /**
     * 序列化参数regx解析
     */
    private unitCache: Map<string, Map<string, string>>
    private CacheParseRegx: Map<string, [number, number]>
    constructor() {
        this.CacheParseRegx = new Map()
        this.unitCache = new Map()
    }

    /**
     * 协议解析，数据存取数量尺寸缓存
     * @param regx 从buffer中截取数据的起始位和长度,例:3-2,从第三位截取两个数解析
     */
    private getProtocolRegx(regx: string) {
        const Regx = this.CacheParseRegx.get(regx)
        if (!Regx) {
            const [start, end] = regx.split("-").map(el => parseInt(el))
            this.CacheParseRegx.set(regx, [start, end]);
        }
        return this.CacheParseRegx.get(regx)!
    }

    /**
     * 处理232协议
     * @param IntructResult 设备返回数据对象数组 
     * @param protocol 设备协议名称
     * @returns 设备解析结果
     */
    private parse232(data: Buffer, instructs: Uart.protocolInstruct) {
        // 把buffer转换为utf8字符串并掐头去尾
        const parseStr = Buffer.from(data)
            .toString("utf8", instructs.shift ? instructs.shiftNum : 0, instructs.pop ? data.length - instructs.popNum : data.length)
            .replace(/(#)/g, "")
            // 如果是utf8,分隔符为' '
            .split(instructs.isSplit ? " " : "");
        // console.log({ cont:el.content,parseStr, parseStrlen: parseStr.length, ins: instructs.formResize.length });
        return instructs.formResize.map<query>(el2 => {
            const [start] = this.getProtocolRegx(el2.regx!)
            const regx = parseStr[start - 1]
            return { name: el2.name, regx, value: this.getUnit(regx, el2.unit!, el2.isState), unit: el2.unit }
        });
    }

    /**
     * 处理485协议
      * @param IntructResult 设备返回数据对象数组 
     * @param protocol 设备协议名称
     * @returns 设备解析结果
     */
    private parse485(data: Buffer, instructs: Uart.protocolInstruct) {
        // console.log({ shift: instructs.shift, shiftNum: instructs.shiftNum, pop: instructs.pop, popNum: instructs.popNum });

        const dataSlice = data.slice(instructs.shift ? instructs.shiftNum : 3, instructs.pop ? data.length - instructs.popNum : data.length - 2)

        // 把结果字段中的10进制转换为2进制,翻转后补0至8位,代表modbus线圈状态
        // https://blog.csdn.net/qq_26093511/article/details/58628270
        // http://blog.sina.com.cn/s/blog_dc9540b00102x9p5.html

        // 1,读bit2指读线圈oil，方法为把10/16进制转为2进制,不满8位则前补0至8位，然后翻转这个8位数组，
        // 2,把连续的几个数组拼接起来，转换为数字
        // 例子：[1,0,0,0,1],[0,1,1,1,1]补0为[0,0,0,1,0,0,0,1],[0,0,0,0,1,1,1,1],数组顺序不变，每个数组内次序翻转
        // [1,0,0,0,1,0,0,0],[1,1,1,1,0,0,0,0],然后把二维数组转为一维数组
        //data.map(el2 => el2.toString(2).padStart(8, '0').split('').reverse().map(el3 => Number(el3))).flat()
        const buffer = instructs.resultType === "bit2" ? Buffer.from(dataSlice.toJSON().data.map(el2 => el2.toString(2).padStart(8, '0').split('').reverse().map(el3 => Number(el3))).flat()) : dataSlice
        return instructs.formResize.map(el2 => {
            // 申明结果
            const result: query = { name: el2.name, value: '0', unit: el2.unit, regx: '' }
            // 每个数据的结果地址
            const [start, len] = this.getProtocolRegx(el2.regx!)
            switch (instructs.resultType) {
                // 处理
                case 'bit2':
                    const val = buffer[start - 1].toString()
                    result.regx = buffer.slice(start - 1, start).toString('hex')
                    result.value = this.getUnit(val, el2.unit!, el2.isState)
                    break
                // 处理整形
                case "hex":
                case "short":
                    // 如果是浮点数则转换为带一位小数点的浮点数
                    const num = this.ParseCoefficient(el2.bl, buffer.readIntBE(start - 1, len))
                    const str = num.toString()
                    result.regx = buffer.slice(start - 1, start - 1 + len).toString('hex')
                    result.value = /\./.test(str) ? num.toFixed(1) : this.getUnit(str, el2.unit!, el2.isState)
                    break;
            }
            return result
        })
    }

    /**
    * 转换参数值系数
    * @param fun 代码文本
    * @param val 值
    * @returns 解析后的实际值
    */
    private ParseCoefficient(fun: string, val: number) {
        if (Number(fun)) return Number(fun) * val as number
        else {
            const args = fun.replace(/(^\(|\)$)/g, '').split(',')
            const Fun = new Function(args[0], `return ${args[1]}`)
            return Fun(val) as number
        }
    }

    // 缓存单位声明
    private getUnit(value: string, unit: string, isObj: boolean) {
        // 检查unit是否含有“{.*}”
        if (!isObj) {
            return /\./.test(value) && !Number.isNaN(value) ? parseFloat(value).toFixed(2).replace(/(\.|0)$/g, '') || "0" : value
        }
        else
            return this.getParseUnitObject(unit).get(value) || "null"

    }

    /**
     * 转换unit单位
     * @param unit 
     * @returns 
     */
    private getParseUnitObject(unit: string) {
        const Obj = this.unitCache.get(unit)
        if (Obj) return Obj
        else {
            const arr = unit.replace(/(\{|\}| )/g, "").split(",").map(el => el.split(":")) as Iterable<readonly [string, string]>
            this.unitCache.set(unit, new Map(arr))
            return this.unitCache.get(unit)!
        }
    }

    /**
     * 解析查询结果
     * @param IntructResult 设备返回数据对象数组 
     * @param protocol 设备协议名称
     * @returns 设备解析结果 
     */
    public parse(data: Buffer, instructs: Uart.protocolInstruct, Type: 232 | 485) {
        const result = Type === 232 ? this.parse232(data, instructs) : this.parse485(data, instructs)
        return result
    }
}

export default ProtocolParse