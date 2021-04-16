import { createApp } from "vue"
import elementPlus from "element-plus"
import "element-plus/lib/theme-chalk/index.css"
import app from "./App.vue"

createApp(app).use(elementPlus).mount("#app")