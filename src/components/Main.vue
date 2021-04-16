<template>
  <protocol @loadConsole="loadConsole" @updateInstructItem="loadInstructItem" :result="result"></protocol>
  <el-divider />
  <el-row>
    <el-col :span="8" :lg="6">
      <el-form label-suffix=":" label-width="100px" size="small">
        <el-form-item label="COM">
          <el-select
            v-model="com"
            placeholder="请选择"
            :disabled="Opt.isOpen"
            @focus="genPorts"
            size="small"
          >
            <el-option v-for="port in ports" :label="port.path" :value="port.path" :key="port.path"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="波特率">
          <el-select
            v-model="serialOpt.baudRate"
            placeholder="请选择"
            :disabled="Opt.isOpen"
            size="small"
          >
            <el-option
              v-for="baudRate in baudRateList"
              :label="baudRate.label"
              :value="baudRate.value"
              :key="baudRate.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="校验位">
          <el-select
            v-model="serialOpt.parity"
            placeholder="请选择"
            :disabled="Opt.isOpen"
            size="small"
          >
            <el-option
              v-for="parity in parityList"
              :label="parity.label"
              :value="parity.value"
              :key="parity.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="数据位">
          <el-select
            v-model="serialOpt.dataBits"
            placeholder="请选择"
            :disabled="Opt.isOpen"
            size="small"
          >
            <el-option
              v-for="dataBit in dataBitList"
              :label="dataBit.label"
              :value="dataBit.value"
              :key="dataBit.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="停止位">
          <el-select
            v-model="serialOpt.stopBits"
            placeholder="请选择"
            :disabled="Opt.isOpen"
            size="small"
          >
            <el-option
              v-for="stopBit in stopBitList"
              :label="stopBit.label"
              :value="stopBit.value"
              :key="stopBit.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="自动发送(ms)">
          <el-input type="number" v-model="Opt.autoSendRate" :min="10" size="small"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button
            icon="el-icon-switch-button"
            round
            size="small"
            :disabled="!com"
            :type="Opt.isOpen?'success':'info'"
            @click="openCom"
          >{{!Opt.isOpen?'打开':'关闭'}}串口</el-button>
        </el-form-item>
      </el-form>
    </el-col>
    <el-col :span="16" :lg="18" style="padding-left:2rem">
      <el-space direction="vertical"></el-space>
      <el-input
        id="pullDta"
        type="textarea"
        resize="none"
        placeholder="显示区"
        :rows="6"
        v-model="outContent"
        readonly
      ></el-input>
      <el-autocomplete
        placeholder="输入区"
        resize="none"
        type="text"
        v-model="datas.pushData"
        :fetch-suggestions="querySearch"
        class="block"
        show-word-limit
        style="display:block;margin:1rem 0"
      ></el-autocomplete>
      <div>
        <el-button size="small" @click="portWrite" :disabled="!Opt.isOpen" type="primary">手动发送</el-button>
        <span size="small" type="text" style="margin:0 1rem;">Tx: {{datas.pushBit}}</span>
        <span size="small" type="text" style="margin:0 1rem;">Rx: {{datas.pullBit}}</span>
      </div>
      <el-form label-suffix=":">
        <el-form-item label="发送">
          <el-checkbox v-model="Opt.hexSend">hex发送</el-checkbox>
          <el-checkbox v-model="Opt.autoSend" :disabled="!Opt.isOpen">自动发送</el-checkbox>
          <el-checkbox v-model="Opt.logSend">记录发送</el-checkbox>
        </el-form-item>
        <el-form-item label="输出">
          <el-radio
            v-model="Opt.Ecodeing"
            v-for="code in ['hex','ascii' , 'utf8' , 'ucs2' , 'base64' , 'binary' ]"
            :key="code"
            :label="code"
          >{{code}}</el-radio>
        </el-form-item>
        <el-form-item style="text-align: right;">
          <el-button-group>
            <el-button size="small" @click="()=>datas.pullData = []">清空接收区</el-button>
            <el-button size="small" @click="writeFile">保存接收记录</el-button>
            <el-button size="small" @click="readFile">读取记录</el-button>
            <el-button size="small" @click="resetCountBit">计数清零</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-col>
  </el-row>

  <span style="color: red;">{{datas.stateText}}</span>
</template>

<script lang="ts">
  import { computed, defineComponent, nextTick, reactive, ref, toRaw, unref, watch } from 'vue';
  import { baudRateList, parityList, dataBitList, stopBitList } from "../plugins/serialOptionArguments"
  // eslint-disable-next-line no-unused-vars
  import SerialPort, { PortInfo } from 'serialport';
  import { dialogOpen, dialogSave, formatTime, hexToNumber, Noti, NotiErr, serialPortList, Serial, protocolParse, crc, } from "../plugins/common"
  import Protocol from './protocol.vue';

  interface pullDatalog {
    time: string,
    data: string,
    type: 'recv' | 'send'
  }
  export default defineComponent({
    name: 'Main',
    components: { Protocol },
    setup() {
      const ports = ref<PortInfo[]>([])  // 本机串口列表
      const port = ref<Serial>()

      const queryCacheMap = new Map<string, string>() // 缓存查询字符串编码的crc
      const InstructItem = ref<Uart.protocolInstruct>()
      const result = ref<Uart.queryResultArgument[]>([]) // 存储协议解析结果

      // 软件参数配置
      const Opt = reactive({
        isOpen: false,  // 串口打开状态
        isShowPullDate: true,   // 是否显示
        autoSendRate: 1000, // 自动发送频率 ms
        Ecodeing: 'hex' as BufferEncoding, // 显示的格式
        autoSend: false,    // 自动发送状态
        hexSend: true, // 16 进制发送
        logSend: false, // 记录发送日志
        parseType: 485 as 485 | 232
      })

      const com = ref("")    // 串口路径 COM1
      // 串口参数配置
      const serialOpt = reactive<SerialPort.OpenOptions>({
        baudRate: 9600,
        parity: 'none',
        dataBits: 8,
        stopBits: 1,
        autoOpen: true
      })
      // 输入输出
      const datas = reactive({
        pullData: [] as pullDatalog[],   // 接收到的数据
        pushData: '',   // 发送的数据
        pushDataHis: [{ value: '050300000002' }] as { value: string }[], // 发送的历史数据
        stateText: '准备就绪',  // 状态提示
        pushBit: 0, // 发送字节数
        pullBit: 0, // 接收字节数
      })

      // 定时器
      const timer = reactive({
        write: 0, // 定时发送查询
      })
      // 格式化输出
      const outContent = computed(() => {
        nextTick(() => {
          const pullDataElement = document.getElementById('pullDta')!;
          pullDataElement.scrollTop = pullDataElement.scrollHeight;
        })
        return datas.pullData.map(el => `${el.time} ${el.type}=[${el.data}]`).join("\n")
      })



      // 监听设置参数变化
      watch(Opt, (val) => {
        // 如果自动发送打开且定时器未设定,设置定时器,
        // 如果自动发送设置打开,设定定时器
        if (val.autoSend) {
          if (timer.write !== 0) clearIntervalWrite()
          timer.write = setInterval(() => portWrite(), val.autoSendRate) as unknown as number
        }
        // 如果自动发送设置关闭且定时器未清除,清除定时器
        else if (timer.write !== 0 && !val.autoSend) clearIntervalWrite()
      })

      // 监听串口实例变化
      watch(port, newval => {
        Opt.isOpen = newval?.isOpen ? newval.isOpen : false
        if (Opt.isOpen) {
          datas.stateText = '串口已开启'
        } else {
          datas.stateText = '串口已关闭'
          Opt.autoSend = false
          clearIntervalWrite()
        }
      },
        {
          deep: true
        })

      /**
       * 清除自动发送查询的定时器
       */
      const clearIntervalWrite = () => {
        clearInterval(timer.write)
        timer.write = 0
      }


      /**
       * 打开串口
       */
      const openCom = () => {
        if (port.value) {
          const serial = unref(port)!
          serial.close()
          port.value = undefined
        } else {
          const serial = new Serial(com.value, toRaw(serialOpt))
          port.value = serial
          // 串口设备传来的数据 是buffer对象，用toString转一下码
          serial.data((data) => {
            // 如果启用了调试模式,把数据解析
            if (InstructItem) parseInstruct(data as any)
            // 
            datas.pullBit = datas.pullBit + data.length
            const pullData = data.toString(Opt.Ecodeing)
            datas.pullData.push({ time: formatTime(), data: pullData, type: 'recv' })
          })

        }

      }

      /**
       * 解析数据
       */
      const parseInstruct = async (data: Buffer) => {
        const Instruct = unref(InstructItem)!
        result.value = await protocolParse(data, toRaw(Instruct), Opt.parseType)
        // console.log({ arg, Instruct });
        /* InstructItem.value?.formResize.forEach(el => {
          el.enName = resultMap.get(el.name)?.value
        }) */
      }

      /**
       * 记录输入操作
       */
      const querySearch = async (queryString: string, cb: CallableFunction) => {
        const results = queryString ? datas.pushDataHis.filter(el => el.value.includes(queryString)) : datas.pushDataHis
        // 调用 callback 返回建议列表的数据
        if (queryString.length === 12) {
          const qr = queryCacheMap.get(queryString)
          if (qr) {
            results.unshift({ value: qr })
          } else {
            const [a1, a2, a3, a4, a5, a6, a7, a8, a9, b1, b2, b3] = [...queryString]
            const qr2 = crc(hexToNumber(a1 + a2), [a3, a4, a5, a6, a7, a8, a9, b1, b2, b3].join())
            // 缓存结果
            queryCacheMap.set(queryString, qr2)
            results.unshift({ value: qr2 })
          }
        }
        const instructsSet = new Set(results.map(el => el.value))
        cb(results.filter(el => !instructsSet.has(el.value)));
      }

      /**
       * 写入数据
       */
      const portWrite = () => {
        datas.pushDataHis.push({ value: datas.pushData })
        const serial = unref(port)!
        // const pushData = Opt.hexSend ? handlerHex(datas.pushData) : Iconv.encode(datas.pushData, 'GB2312')
        serial.write(datas.pushData, Opt.hexSend ? 'hex' : 'utf8')
        datas.pushBit = datas.pushBit + datas.pushData.length
        if (Opt.logSend) datas.pullData.push({ type: 'send', time: formatTime(), data: datas.pushData })
      }
      /**
       * 获取串口列表
       */
      const genPorts = () => {
        serialPortList().then(list => ports.value = list).catch(e => NotiErr(e))
      }

      /** 
       * 重置计数
       */
      const resetCountBit = () => {
        datas.pushBit = 0
        datas.pullBit = 0
      }

      /**
       * 读取文件
       */
      const readFile = () => {
        dialogOpen({
          title: '读取文件',
          filters: [
            { name: 'log.json', extensions: ['json'] }
          ],
          properties: ["openFile"]
        }).then(data => {
          const log = JSON.parse(data) as pullDatalog[]
          if (typeof log === "object" && 'data' in log[0]) {
            datas.pullData.push(...log)
          } else {
            Noti('文件内容错误')
          }
        }).catch(() => Noti('读取文件错误'))
      }
      /**
       * 写入文件
       */
      const writeFile = () => {
        dialogSave(JSON.stringify(datas.pullData), {
          title: '保存接收数据',
          filters: [
            { name: 'log.json', extensions: ['json'] }
          ]
        })
      }
      /**
       * 保存配置
       */
      const saveOptions = () => {
        dialogSave(JSON.stringify(serialOpt), {
          title: '保存配置信息',
          filters: [
            {
              name: 'json', extensions: ['json']
            }
          ]
        })
      }

      /**
       * 载入协议查询指令
       */
      const loadConsole = (instruct: string, type: "hex" | "utf8") => {
        datas.pushData = instruct
        if (type === "hex") {
          Opt.hexSend = true
          Opt.Ecodeing = 'hex'
          Opt.parseType = 485
        } else {
          Opt.hexSend = false
          Opt.Ecodeing = "utf8"
          Opt.parseType = 232
        }

      }

      /**
       * 更新
       */
      const loadInstructItem = (item: Uart.protocolInstruct) => {
        InstructItem.value = item
      }

      return { com, Opt, datas, timer, baudRateList, result, loadConsole, loadInstructItem, ports, parityList, dataBitList, stopBitList, outContent, serialOpt, openCom, genPorts, querySearch, resetCountBit, readFile, writeFile, saveOptions, portWrite }
    }
  })
</script>

<style scoped>
  .block {
    display: block;
  }
  .form-content-flex {
    display: flex;
  }
</style>