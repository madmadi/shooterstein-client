import Entity from 'src/models/Entity';

export default Entity({
  texture: 'stone.png',
  sprite: null,
  states: {
    position: { x: 0, y: 0 },
  },

  setup ({ position, tint } = {}) {
    if (position) {
      this.move(position.x, position.y);
    }

    if (tint) {
      this.sprite.tint = tint;
    }

    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
  },

  methods: {},
});
