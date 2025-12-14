import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import "virtual:uno.css";
import router from "./router"; // <--- IMPORT ROUTER

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router); // <--- USE ROUTER
app.mount("#app");
