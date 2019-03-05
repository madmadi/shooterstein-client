<template>
  <component
    :is='scene'
    @scene='changeScene'
  />
</template>

<script>
import StartScene from 'src/scenes/start';

export default {
  name: 'App',
  components: {
    StartScene,
    PlayScene: () => import('src/scenes/play'),
  },
  data () {
    return {
      scene: 'StartScene',
    };
  },
  methods: {
    changeScene (scene) {
      this.scene = scene || this.scene;
    },
  },
};
</script>
