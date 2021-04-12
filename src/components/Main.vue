<template>
  <el-row>
    <el-col :span="8" :lg="6">
      <el-form label-width="100px" label-suffix=":">
        <el-form-item label="协议">
          <el-cascader
            :options="formatProtocol"
            :show-all-levels="false"
            v-model="protocolOpt.protocol"
          ></el-cascader>
        </el-form-item>
        <el-form-item label="调试指令">
          <el-select v-model="protocolOpt.instruct">
            <el-option
              v-for="instruct in Instructs"
              :key="instruct"
              :value="instruct"
              :label="instruct"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="设备地址">
          <el-select v-model="protocolOpt.pid" placeholder="选择设备的地址">
            <el-option v-for="n in 255" :key="n" :label="n" :value="n"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="loadConsole" :disabled="!InstructItem">载入调试</el-button>
        </el-form-item>
      </el-form>
    </el-col>
    <el-col :span="16" :lg="18" style="padding-left:2rem">
      <el-card style="height:300px;overflow:auto">
        <el-tabs v-if="InstructItem">
          <el-tab-pane label="参数">
            <el-table :data="InstructItem.formResize" size="small">
              <el-table-column prop="name" label="name"></el-table-column>
              <el-table-column prop="regx" label="字段"></el-table-column>
              <el-table-column prop="bl" label="bl"></el-table-column>
              <el-table-column prop="enName" label="值"></el-table-column>
              <el-table-column prop="unit" label="unit"></el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="设定">
            <el-form label-width="50px" label-suffix=":" inline>
              <el-form-item label="状态">
                <el-checkbox v-model="InstructItem.isUse">{{InstructItem.isUse?'启用':'禁用'}}</el-checkbox>
              </el-form-item>
              <el-form-item label="去头">
                <el-checkbox v-model="InstructItem.shift"></el-checkbox>
                <el-button type="text">{{InstructItem.shiftNum}}</el-button>
                <!-- <el-slider v-model=""></el-slider> -->
              </el-form-item>
              <el-form-item label="去尾">
                <el-checkbox v-model="InstructItem.pop"></el-checkbox>
                <el-button type="text">{{InstructItem.popNum}}</el-button>
              </el-form-item>
            </el-form>
            <el-form>
              <el-form-item label="格式">
                <el-select v-model="InstructItem.resultType" size="small">
                  <el-option
                    v-for="val in ['hex','utf8','bit2']"
                    :key="val"
                    :value="val"
                    :label="val"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="resize">
            <el-input type="textarea" v-model="InstructItem.resize" :rows="5" size="small" autosize></el-input>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </el-col>
  </el-row>
  <el-divider />
  <el-row>
    <el-col :span="8" :lg="6">
      <el-form label-suffix=":" label-width="100px">
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
            <el-button size="small" @click="readFile">读取文件</el-button>
            <el-button size="small" @click="resetCountBit">计数清零</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-col>
  </el-row>

  <span style="color: red;">{{datas.stateText}}</span>
</template>

<script lang="ts">
  import { computed, defineComponent, nextTick, onMounted, reactive, ref, unref, watch } from 'vue';
  import { baudRateList, parityList, dataBitList, stopBitList } from "../plugins/serialOptionArguments"
  // eslint-disable-next-line no-unused-vars
  import SerialPort, { PortInfo } from 'serialport';
  import { api, dialogOpen, dialogSave, formatTime, hexToNumber, Noti, NotiErr, serialPortList, Serial, ipcRenderer, protocolParse, } from "../plugins/common"
  import { CascaderOption } from 'element-plus/lib/el-cascader-panel';

  interface pullDatalog {
    time: string,
    data: string,
    type: 'recv' | 'send'
  }
  export default defineComponent({
    name: 'Main',
    setup() {
      const ports = ref<PortInfo[]>([])  // 本机串口列表
      const port = ref<Serial>()
      const protocols = ref<Uart.protocol[]>()
      const queryCacheMap = new Map<string, string>() // 缓存查询字符串编码的crc
      const InstructItem = ref<Uart.protocolInstruct>()
      // 软件参数配置
      const Opt = reactive({
        isOpen: false,  // 串口打开状态
        isShowPullDate: true,   // 是否显示
        autoSendRate: 1000, // 自动发送频率 ms
        Ecodeing: 'hex' as BufferEncoding, // 显示的格式
        autoSend: false,    // 自动发送状态
        hexSend: true, // 16 进制发送
        logSend: false // 记录发送日志
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
      // 协议
      const protocolOpt = reactive({
        protocol: '',
        instruct: '',
        type: 485 as 485 | 232,
        pid: 1
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

      // 格式化协议选择
      const formatProtocol = computed(() => {
        const protocolArray = unref(protocols)
        if (protocolArray) {
          const types = new Set(protocolArray.map(el => el.ProtocolType))
          return [...types].map<CascaderOption>(el => ({
            label: el, value: el, children: protocolArray
              .filter(el1 => el1.ProtocolType === el)
              .map(el2 => ({ label: el2.Protocol, value: el2.Protocol }))
          }))

        } else return []
      })

      // 可选择的协议
      const Instructs = computed(() => {
        const protocol = protocolOpt.protocol
        if (protocol) {
          return protocols.value?.find(el => el.ProtocolType === protocol[0] && el.Protocol === protocol[1])?.instruct.map(el => el.name)
        } else return []
      })

      // 监听协议选择
      watch(protocolOpt, val => {
        if (val.instruct) {
          const protocol = protocols.value!.find(el => el.ProtocolType === protocolOpt.protocol[0] && el.Protocol === protocolOpt.protocol[1])!
          protocolOpt.type = protocol.Type
          const instrct = protocol.instruct
            .find(el => el.name === val.instruct)!
          instrct.formResize.forEach(el => el.enName = '')
          InstructItem.value = instrct
        } else {
          InstructItem.value = undefined
        }
      })

      // 监听设置参数变化
      watch(Opt, (val, old) => {
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
       * 载入调试
       */
      const loadConsole = () => {
        if (protocolOpt.type === 485) {
          const [a3, a4, a5, a6, a7, a8, a9, b1, b2, b3] = [...protocolOpt.instruct]
          const data = {
            protocolType: 0,
            pid: protocolOpt.pid,
            instructN: hexToNumber(a3 + a4).toString().padStart(2, '0'),
            address: hexToNumber(a5 + a6 + a7 + a8),
            value: hexToNumber(a9 + b1 + b2 + b3)
          }
          Opt.hexSend = true
          Opt.Ecodeing = 'hex'
          api.crc(data).then(el => datas.pushData = el)
        } else {
          Opt.hexSend = false
          Opt.Ecodeing = "utf8"
          datas.pushData = protocolOpt.instruct + '\n'
        }
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
          const serial = new Serial(com.value, serialOpt)
          console.log({ serial });

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
        const resultMap = await protocolParse(data, Instruct, protocolOpt.type)
        // console.log({ arg, Instruct });
        InstructItem.value?.formResize.forEach(el => {
          el.enName = resultMap.get(el.name)?.value
        })
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
            const data = {
              protocolType: 0,
              pid: hexToNumber(a1 + a2),
              instructN: hexToNumber(a3 + a4).toString().padStart(2, '0'),
              address: hexToNumber(a5 + a6 + a7 + a8),
              value: hexToNumber(a9 + b1 + b2 + b3)
            }
            const qr2 = await api.crc(data)
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
       * 接受列表操作信息
       */
      const genRenderer = () => {
        /* ipcRenderer
          .on('saveOptions', () => saveOptions())
          .on('loadOptions', () => loadOptions())
          .on('reloadPorts', () => genPorts())
          .on('writeFile', () => writeFile())
          .on('readFile', () => readFile()) */
      }

      /** 
       * 重置计数
       */
      const resetCountBit = () => {
        datas.pushBit = 0
        datas.pullBit = 0
        console.log({ protocolOpt, InstructItem });

      }

      /**
       * 读取文件
       */
      const readFile = () => {
        dialogOpen({
          title: '读取文件',
          filters: [
            { name: 'txt', extensions: ['txt'] }
          ],
          properties: ["openFile"]
        }).then(data => {
          const log = JSON.parse(data) as pullDatalog[]
          if (typeof log === "object" && 'data' in log[0]) {
            datas.pullData.push(...log)
          } else {
            Noti('文件内容错误')
          }
        }).catch(e => Noti('读取文件错误'))
      }
      /**
       * 写入文件
       */
      const writeFile = () => {
        dialogSave(JSON.stringify(datas.pullData), {
          title: '保存接收数据',
          filters: [
            { name: 'txt', extensions: ['txt'] }
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
       * 读取配置
       */
      const loadOptions = () => {
        dialogOpen({
          title: '加载配置信息',
          filters: [{
            name: 'json', extensions: ['json']
          }]
        }).then(data => {
          console.log({ data });
        }).catch(e => NotiErr(e))
      }

      onMounted(() => {
        genRenderer();
        api.protocols().then(el => {
          protocols.value = el
        })
      })

      return { formatProtocol, Instructs, InstructItem, com, Opt, datas, protocolOpt, timer, baudRateList, loadConsole, ports, parityList, dataBitList, stopBitList, outContent, serialOpt, openCom, genPorts, querySearch, resetCountBit, readFile, writeFile, saveOptions, portWrite }
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
