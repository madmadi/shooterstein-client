<template>
  <div class='scene'>
    <h1>🔫 Shooterstein</h1>
    <p>Pick up stones and shoot them to your enemies</p>
    <input
      autofocus
      ref='username'
      type='text'
      name='username'
      placeholder='Who are you'
      @keyup.enter='play'
      v-model='username'
    >
    <button @click='play'>Join as a <b>{{ adjective }}</b> shooter</button>
  </div>
</template>

<script>
function getRandomAdjective () {
  const adjectives = [
    'dangerous',
    'cool',
    'newbie',
    'fantastic',
    'angry',
    'kind',
    'peaceful',
    'damn',
  ];

  return adjectives[Math.floor(Math.random() * (adjectives.length - 1))];
}

export default {
  name: 'StartScene',
  data () {
    return {
      adjective: getRandomAdjective(),
      username: '',
    };
  },
  methods: {
    play () {
      if (!this.username) {
        this.$refs.username.placeholder = 'Tell me who you are';
        return;
      }

      this.$parent.changeScene('playScene');
    },
  },
};
</script>

<style scoped>
.scene,
button,
input {
  font-family: monospace;
}

.scene {
  max-width: 768px;
  margin: 0 auto;
  text-align: center;
}

input,
button {
  height: 50px;
  border: none;
  border-radius: 4px;
}

input {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 0 20px;
  background-color: #ddd;
}

button {
  cursor: pointer;
  background-color: limegreen;
}
</style>
