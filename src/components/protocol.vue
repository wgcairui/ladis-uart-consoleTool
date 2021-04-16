<template>
  <el-row>
    <el-col :span="8" :lg="6">
      <el-form label-width="100px" label-suffix=":" size="small">
        <el-form-item label="协议">
          <el-cascader
            :options="formatProtocol"
            :show-all-levels="false"
            v-model="protocolOpt.protocol"
          ></el-cascader>
        </el-form-item>
        <el-form-item label="调试指令">
          <el-select v-model="InstructItem" value-key="name" @focus="focusInstructs">
            <el-option
              v-for="instruct in Instructs"
              :key="instruct"
              :value="instruct.value"
              :label="instruct.label"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="设备地址">
          <el-select v-model="protocolOpt.pid" placeholder="选择设备的地址">
            <el-option v-for="n in 255" :key="n" :label="n" :value="n"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button-group>
            <el-button @click="loadConsole">载入调试</el-button>
          </el-button-group>
        </el-form-item>
        <el-form-item>
          <el-button-group>
            <el-button type="primary" @click="loadProtocol">载入协议</el-button>
            <el-button type="primary" @click="saveProtocol" :disabled="!protocols">保存协议</el-button>
            <el-button type="success" @click="addInstruct" :disabled="!protocolOpt.protocol">添加指令</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
    </el-col>
    <el-col :span="16" :lg="18" style="padding-left:2rem">
      <el-card style="height:300px;overflow:auto">
        <el-tabs v-if="InstructItem && InstructItem.formResize">
          <el-tab-pane label="参数">
            <el-table :data="InstructItem.formResize" size="small" @cell-click="tableClick">
              <el-table-column prop="name" label="name"></el-table-column>
              <el-table-column prop="regx" label="字段">
                <template
                  #default="scope"
                >{{scope.row.regx}}{{getArgumentValue(scope.row.name).regx}}</template>
              </el-table-column>
              <el-table-column prop="bl" label="bl"></el-table-column>
              <el-table-column prop="enName" label="值">
                <template #default="scope">{{getArgumentValue(scope.row.name).value}}</template>
              </el-table-column>
              <el-table-column prop="unit" label="unit"></el-table-column>
            </el-table>
            <el-button type="text" @click="addIntructFrom">添加</el-button>
          </el-tab-pane>
          <el-tab-pane label="设定">
            <el-form label-width="50px" label-suffix=":" inline>
              <el-form-item label="状态">
                <el-checkbox v-model="InstructItem.isUse" disabled>{{InstructItem.isUse?'启用':'禁用'}}</el-checkbox>
              </el-form-item>
              <el-form-item label="去头">
                <el-checkbox v-model="InstructItem.shift"></el-checkbox>
                <el-button
                  style="margin-left:.8rem"
                  type="text"
                  @click="setShiftPopNum(InstructItem,'shiftNum')"
                >{{InstructItem.shiftNum}}</el-button>
              </el-form-item>
              <el-form-item label="去尾">
                <el-checkbox v-model="InstructItem.pop"></el-checkbox>
                <el-button
                  style="margin-left:.8rem"
                  type="text"
                  @click="setShiftPopNum(InstructItem,'popNum')"
                >{{InstructItem.popNum}}</el-button>
              </el-form-item>
            </el-form>
            <el-form label-width="50px" label-suffix=":">
              <el-form-item label="指令">
                <el-input v-model="InstructItem.name" placeholder="去除校验码和地址的查询指令"></el-input>
              </el-form-item>
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
              <el-input
                readonly
                type="textarea"
                v-model="InstructItem.resize"
                :rows="5"
                size="small"
                autosize
              ></el-input>
            </el-form>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </el-col>
  </el-row>
</template>

<script lang="ts">
  import { api, clone, crc, dialogOpen, dialogSave, inputValue } from "@/plugins/common";
  import { query } from "@/plugins/ProtocolParse";
  import { ElMessageBox } from "element-plus";
  import { CascaderOption } from "element-plus/lib/el-cascader-panel";
  import { TableColumnCtx } from "element-plus/lib/el-table/src/table.type";
  import { computed, defineComponent, onMounted, reactive, ref, unref, watch, PropType, Ref, isRef } from "vue";

  export default defineComponent({
    name: 'protocol',
    emits: ['loadConsole', "updateInstructItem"],
    props: {
      result: {
        type: Array as PropType<query[]>,
        default: []
      }
    },
    setup(props, ctx) {
      const protocols = ref<Uart.protocol[]>([])
      // 可选择的协议
      const Instructs = reactive<{ label: string, value: any }[]>([])
      // 协议指令
      const InstructItem = ref<Uart.protocolInstruct | undefined>()
      // 协议
      const protocolOpt = reactive({
        protocol: ['th', '温湿度1'] as string[],
        pid: 5
      })

      const instructFrom = {
        name: '未命名',
        regx: '1-1',
        bl: '1',
        unit: "",
        isState: false
      }

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

      // 协议解析结果集Map
      const resultMap = computed(() => {
        return new Map(props.result.map(el => [el.name, el]))
      })

      // 监听指令解析实例,有修改就推送到
      watch(InstructItem, val => {
        if (val) {
          loadConsole()
          ctx.emit('updateInstructItem', clone(val))
          focusInstructs()
        }
      }, {
        deep: true
      })

      /**
       * 刷新指令列表
       */
      const focusInstructs = () => {
        const protocol = protocolOpt.protocol
        const items = protocol ? protocols.value?.find(el => el.ProtocolType === protocol[0] && el.Protocol === protocol[1])?.instruct.map(el => ({ label: el.name, value: el })) || [] : []
        Instructs.splice(0, Instructs.length, ...items)
      }

      /**
       * 载入调试
       */
      const loadConsole = async () => {
        const protocol = protocols.value.find(el => el.Protocol === protocolOpt.protocol[1] && el.ProtocolType === protocolOpt.protocol[0])!
        if (protocol.Type === 485) {
          ctx.emit("loadConsole", crc(protocolOpt.pid, unref(InstructItem)!.name), 'hex')
        } else {
          ctx.emit("loadConsole", unref(InstructItem)!.name + '\r', 'utf8')
        }
      }

      /**
       * 保存所有协议
       */
      const saveProtocol = async () => {
        const ps = unref(protocols)
        const el = await ElMessageBox.confirm(`是否保存全部协议,取消则仅保存 (${protocolOpt.protocol[1]}) 协议!!`,
          {
            cancelButtonText: protocolOpt.protocol[1],
            confirmButtonText: '全部',
            type: "info",
            lockScroll: false,
            roundButton: true
          })
          .catch(() => false)
        dialogSave(JSON.stringify(el ? ps : ps.find(el => el.Protocol === protocolOpt.protocol[1] && el.ProtocolType === protocolOpt.protocol[0])), {
          title: '保存透传协议',
          filters: [
            { name: 'json', extensions: ['json'] }
          ]
        })
      }

      /**
       * 载入协议
       */
      const loadProtocol = () => {
        dialogOpen({
          title: '载入透传设备协议',
          filters: [
            { name: 'json', extensions: ['json'] }
          ]
        }).then(data => {
          try {
            const loadProtocols = JSON.parse(data) as Uart.protocol[]
            if (loadProtocols[0]?.Protocol) {
              loadProtocols.forEach(el => {
                const index = protocols.value?.findIndex(el2 => el2.Protocol === el.Protocol && el.ProtocolType === el2.ProtocolType)
                if (index !== -1) {
                  protocols.value?.splice(index, 1, el)
                } else {
                  protocols.value?.push(el)
                }
              })
            } else {
              alert('文件格式错误')
            }
          } catch (error) {
            alert(error)
          }
        })
      }

      // 返回对应的参数解析值
      const getArgumentValue = (name: string) => {
        const arg = resultMap.value.get(name)
        return {
          value: arg?.value || 'null',
          regx: `[${arg?.regx || 'null'}]`
        }
      }

      // 修改头尾的值
      const setShiftPopNum = async (obj: Ref<any> | any, name: string) => {
        const value = unref(obj)[name]
        inputValue(value).then(val => {
          if (val) {
            if (isRef(obj)) {
              (obj.value as any)[name] = val
            } else obj[name] = val
          }
        })
      }

      /**
       * 修改表格中的参数
       */
      const tableClick = (row: Uart.protocolInstructFormrize, column: TableColumnCtx) => {
        // console.log({ row, column });
        const property = column.property
        const value = (<any>row)[property] as string
        if (property !== 'enName') {
          inputValue(value).then(el => {
            if (el) {
              if (property === 'unit') {
                row.isState = /^{.*}$/.test(el)
                // 替换可能出现的全角字符
                el = el.replaceAll("：", ":")
                el = el.replaceAll("，", ",")
              }
              (<any>row)[property] = el
              const item = unref(InstructItem)!
              item.resize = item.formResize.map(el => Object.values(el).join("+")).join("&\n")
            }
          })
        }
      }

      /**
       * 添加新的指令
       */
      const addInstruct = async () => {
        const result = await ElMessageBox.prompt('写入指令字符:', '添加新的指令').catch(() => false)
        if (result) {
          const value = (result as any).value as string
          const protocol = protocols.value.find(el => el.Protocol === protocolOpt.protocol[1])!
          // 如果指令名称不重复
          if (protocol.instruct.findIndex(el => el.name === value) === -1) {
            const isModbus = protocol.Type === 485
            const newInstruct: Uart.protocolInstruct = {
              name: value,
              resultType: isModbus ? 'hex' : 'utf8',
              shift: true,
              shiftNum: isModbus ? 3 : 1,
              pop: true,
              popNum: isModbus ? 2 : 0,
              isUse: true,
              isSplit: true,
              resize: '未命名+1-1+1&\n',
              formResize: [instructFrom],
              noStandard: false,
              scriptStart: '',
              scriptEnd: ''
            }
            // 加入到指令列表
            protocol.instruct.push(newInstruct)
            // 手动更新指令列表
            focusInstructs()
            // 替换现有实例
            InstructItem.value = newInstruct
          } else {
            await ElMessageBox.alert("指令名称重复!!!", { type: "warning" })
            addInstruct()
          }

        }
      }

      /**
       * 添加指令新的参数
       */
      const addIntructFrom = () => {
        InstructItem.value?.formResize.push(instructFrom)
      }

      onMounted(() => {
        api.protocols().then(el => {
          protocols.value = el
        }).catch(() => {
          protocols.value = []
        })
      })

      return { protocols, loadConsole, Instructs, InstructItem, focusInstructs, setShiftPopNum, formatProtocol, protocolOpt, addInstruct, addIntructFrom, saveProtocol, loadProtocol, getArgumentValue, tableClick }
    }
  })


</script>

<style>
</style>