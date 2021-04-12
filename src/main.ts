/* import Vue from 'vue'
import App from './App.vue'
import './plugins/element.ts'
import VueCompositionAPI from '@vue/composition-api'

Vue.use(VueCompositionAPI)

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
 */

import { createApp } from "vue"
import elementPlus from "element-plus"
import "element-plus/lib/theme-chalk/index.css"
import app from "./App.vue"

createApp(app).use(elementPlus).mount("#app")