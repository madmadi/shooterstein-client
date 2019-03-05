import Entity from 'src/models/Entity';

export default Entity({
  texture: 'shooter.png',
  sprite: null,
  states: {
    position: { x: 0, y: 0 },
    tint: Math.random() * 0xFFFFFF,
  },

  setup ({ position, tint } = {}) {
    if (position) {
      this.move(position.x, position.y);
    }

    if (tint) {
      this.sprite.tint = tint;
    }
  },

  methods: {},
});
