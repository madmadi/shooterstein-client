<template>
  <div>
    <div
      v-show='!isLoading'
      ref='container'
    />
  </div>
</template>

<script>
import { Application, loader } from 'pixi.js';
import textureAtlas from 'src/assets/sprites/spritesheet.json';
import game from './play';
import 'src/assets/sprites/spritesheet.png';


export default {
  name: 'PlayScene',
  data () {
    return {
      app: null,
      isLoading: true,
      username: localStorage.getItem('username'),
    };
  },
  created () {
    this.app = new Application({
      autoResize: true,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xEEEEEE,
    });
  },
  mounted () {
    this.isLoading = true;

    this.$refs.container.appendChild(this.app.view);

    if (!loader.resources[textureAtlas]) {
      loader
        .add(textureAtlas)
        .load(this.play);
    } else {
      this.play();
    }
  },
  destroyed () {
    game.destroy();
  },
  methods: {
    play () {
      game.setup(this.app, this.$data);
      this.isLoading = false;
    },
  },
};
</script>

<style>
</style>
