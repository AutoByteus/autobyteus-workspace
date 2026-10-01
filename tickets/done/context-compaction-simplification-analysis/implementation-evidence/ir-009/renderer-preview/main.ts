import {createApp} from 'vue'; import Preview from './Preview.vue'; import './styles.css'; const app=createApp(Preview); app.config.globalProperties.$t=()=> 'Memory compaction'; app.mount('#app');
