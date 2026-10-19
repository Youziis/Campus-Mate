import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { motionHover } from "./directives/motionHover";

createApp(App)
  .use(router)
  .use(ElementPlus)
  .directive("motion-hover", motionHover)
  .mount("#app");
