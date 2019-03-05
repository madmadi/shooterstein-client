import {
  Sprite,
  utils,
  extras,
} from 'pixi.js';

export const SPRITE_TYPES = {
  DEFAULT: 0,
  TILING: 1,
};

function validateProps (object, parentObject, shouldFunction = false) {
  Object.keys(object || {})
    .forEach((prop) => {
      if (parentObject[prop] !== undefined) throw new Error(`Property '${prop}' is already defined`);
      if (typeof object[prop] !== 'function' && shouldFunction) throw new Error(`Property '${prop}' should be function`);
      if (typeof object[prop] === 'function' && !shouldFunction) throw new Error(`Property '${prop}' should not be function`);
    });
}

function linkProps (props, target) {
  Object.keys(props)
    .forEach((state) => { target[state] = props[state]; });
}

const Entity = {
  texture: null,
  sprite: null,
  spriteType: SPRITE_TYPES.DEFAULT,
  states: {},
  methods: {},

  instantiate (container, states) {
    const context = Object.create(this);

    if (context.spriteType === SPRITE_TYPES.TILING) {
      const texture = utils.TextureCache[context.texture];
      context.sprite = new extras.TilingSprite(texture);
    } else {
      const texture = utils.TextureCache[context.texture];
      context.sprite = new Sprite(texture);
    }

    context.sprite.addChild = new Proxy(context.sprite.addChild, {
      apply (target, ctx, args) {
        const result = target.apply(ctx, args);
        context.updateLayersOrder();
        return result;
      },
    });

    validateProps(states, { ...context, ...context.methods });

    context.states = JSON.parse(JSON.stringify(this.states));
    Object.setPrototypeOf(context.states, Entity.states);

    // add initial states
    Object.assign(context.states, states);

    linkProps(context.states, context);

    // add position property helper
    if (context.position instanceof Object) {
      context.sprite.position.set(context.position.x, context.position.y);
    }
    Object.assign(context, {
      get position () { return context.sprite.position; },
      set position ({ x, y }) {
        context.sprite.position.set(x, y);
      },
    });

    if (typeof context.setup === 'function') {
      context.setup(states);
    }

    if (container.sprite) {
      container.sprite.addChild(context.sprite);
    } else {
      container.addChild(context.sprite);
    }

    return context;
  },
  setup () {},
  updateLayersOrder () {
    this.sprite.children.sort((b, a) => {
      a.zIndex = a.zIndex || 0;
      b.zIndex = b.zIndex || 0;
      return b.zIndex - a.zIndex;
    });
  },
  move (x, y) {
    this.position.x = x;
    this.position.y = y;
  },
  getPosition () {
    const { x, y } = this.sprite.position;
    return { x, y };
  },
  changeTexture (texture) {
    if (this.texture !== texture) {
      this.sprite.texture = utils.TextureCache[texture];
      this.texture = texture;
    }
  },
};

export default function (entity) {
  validateProps(entity.states, entity);
  validateProps(entity.methods, { ...entity, ...entity.state }, true);

  Object.setPrototypeOf(entity, Entity);
  Object.setPrototypeOf(entity.methods, Entity.methods);

  linkProps(Entity.states, entity);
  linkProps(Entity.methods, entity);
  linkProps(entity.methods, entity);

  return entity;
}
