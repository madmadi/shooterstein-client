<template>
  <div class='scene'>
    <h1>🔫 Shooterstein</h1>
    <p>Pick up stones and shoot them to your enemies</p>
    <input
      ref='username'
      v-model='username'
      autofocus
      type='text'
      name='username'
      placeholder='Who are you'
      @keyup.enter='play'
    >
    <button
      v-if='!isLoading'
      @click='play'
    >
      Join as a <b>{{ adjective }}</b> shooter
    </button>
    <em v-else>
      Good luck, it's connecting...
    </em>
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
      isLoading: false,
    };
  },
  mounted () {
    this.username = localStorage.getItem('username');

    if (this.username) {
      this.play();
    }
  },
  methods: {
    async login () {
      const res = await fetch(`${process.env.API_BASE_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({ username: this.username }),
      });

      return res.json();
    },
    async play () {
      if (!this.username) {
        this.$refs.username.placeholder = 'Tell me who you are';
        return;
      }

      this.isLoading = true;

      const res = await this.login();

      localStorage.setItem('username', this.username);
      localStorage.setItem('token', res.token);
      localStorage.setItem('websocket', res.websocket);

      this.$parent.changeScene('playScene');

      this.isLoading = false;
    },
  },
};
</script>
