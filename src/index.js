import Vue from 'vue';
import App from 'src/App.vue';

new Vue({
  data () {
    return {
      version: 'v0.1.0',
    };
  },
  render: h => h(App),
}).$mount('#app');
