import Entity, { SPRITE_TYPES } from 'src/models/Entity';

export default Entity({
  texture: 'cell.png',
  sprite: null,
  spriteType: SPRITE_TYPES.TILING,
  states: {
    position: { x: 0, y: 0 },
  },

  setup ({ width, height }) {
    this.sprite.width = width;
    this.sprite.height = height;
  },

  methods: {
    move (entity) {
      return {
        to: (destFn) => {
          const position = entity.getPosition();
          const { x, y } = destFn(position.x, position.y);

          if (x < 0 || x >= this.sprite.width
            || y < 0 || y >= this.sprite.height) {
            return false;
          }

          entity.move(x, y);

          if (entity.isPlayer) {
            this.position.x = window.innerWidth / 2 - entity.position.x;
            this.position.y = window.innerHeight / 2 - entity.position.y;
          }

          return true;
        },
      };
    },
  },
});
