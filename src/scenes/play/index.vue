<template>
  <div class='scene'>
    <div
      v-show='!isLoading && !isDead'
      ref='container'
    />
    <p v-if='isLoading'>
      Communicating...
    </p>
    <div v-if='isDead'>
      <p>Oh, you are dead {{ username }}!</p>
      <button @click='retry'>Fight again</button>
    </div>
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
      username: localStorage.getItem('username'),
      isLoading: true,
      isDead: false,
    };
  },
  watch: {
    isDead (value) {
      if (value === true) {
        game.destroy();
      }
    },
  },
  created () {
    this.app = new Application({
      autoResize: true,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xEEEEEE,
    });
    window.addEventListener('resize', () => this.app.renderer.resize(
      window.innerWidth, window.innerHeight,
    ));
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
    },
    retry () {
      this.$parent.changeScene('startScene');
    },
  },
};
</script>

<style>
</style>
