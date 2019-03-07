import {
  Sprite,
  Graphics,
  Text,
  TextStyle,
  utils,
} from 'pixi.js';
import Entity from 'src/models/Entity';

function getDynamicSprite (tint) {
  const dynamicSprite = new Sprite(utils.TextureCache['shooter-dynamic.png']);

  dynamicSprite.anchor.x = 0.5;
  dynamicSprite.anchor.y = 0.5;

  if (tint) {
    dynamicSprite.tint = tint;
  }

  return dynamicSprite;
}

function createText (text, fontSize = 20, { x, y } = {}) {
  const shooterNameText = new Text(text, new TextStyle({
    fontFamily: 'monospace',
    fontSize,
    fill: 0x777777,
  }));

  shooterNameText.anchor.x = x || 1;
  shooterNameText.anchor.y = y || 1;

  return shooterNameText;
}

function getHealthbar () {
  const width = 70;
  const height = 3;
  const health = new Graphics();
  const healthbar = new Graphics();

  healthbar.beginFill(0xDDDDDD);
  healthbar.drawRect(-(width / 2), 65, width, height);
  healthbar.endFill();

  health.beginFill(0x00FF00);
  health.drawRect(-(width / 2), 65, width, height);
  health.endFill();

  return { health, healthbar };
}

export const SHOOTER_POWERUPS = {
  BLINK: 0,
};

const SHOOTER_POWERUP_SYMBOLS = {
  [SHOOTER_POWERUPS.BLINK]: '[B]',
};

export default Entity({
  texture: 'shooter.png',
  sprite: null,
  states: {
    position: { x: 0, y: 0 },
    tint: Math.random() * 0xFFFFFF,
    blinkMaxRange: 0,
    stoneCount: 0,
    shootedStones: [],
    powerups: [0],
    dynamicSprite: null,
    health: null,
    stoneCountText: null,
    powerupsText: null,
  },

  setup ({
    name,
    position,
    tint,
    blinkMaxRange,
  } = {}) {
    const dynamicSprite = getDynamicSprite(tint);
    const { health, healthbar } = getHealthbar();
    const stoneCountText = createText(this.stoneCount, 18, { x: 0.5, y: 3 });
    const powerupsText = createText('', 12, { x: 0.5, y: -6 });

    this.blinkMaxRange = blinkMaxRange;
    this.dynamicSprite = dynamicSprite;
    this.health = health;
    this.stoneCountText = stoneCountText;
    this.powerupsText = powerupsText;

    this.sprite.addChild(this.dynamicSprite);
    this.sprite.addChild(healthbar);
    this.sprite.addChild(health);
    this.sprite.addChild(
      createText(name, 20, { x: 0.5, y: -2 }),
    );
    this.sprite.addChild(this.stoneCountText);
    this.sprite.addChild(this.powerupsText);

    this.updatePowerupsText();

    if (position) {
      this.move(position.x, position.y);
    }

    this.sprite.zIndex = 1;
  },

  methods: {
    setDirection (radian) {
      this.dynamicSprite.rotation = radian;
    },
    getRotation () {
      return this.dynamicSprite.rotation;
    },
    setHealthPoint (percentage) {
      this.health.width = this.health.width / (100 / percentage);
    },
    setStoneCount (count) {
      this.stoneCount = count;
      this.stoneCountText.text = this.stoneCount;
    },
    addPowerup (powerup) {
      const index = this.powerups.indexOf(powerup);

      if (SHOOTER_POWERUPS[powerup] !== undefined && index === -1) {
        this.powerups.push(powerup);
      }

      this.updatePowerupsText();
    },
    removePowerup (powerup) {
      const index = this.powerups.indexOf(powerup);

      if (index !== -1) this.powerups.splice(index, 1);

      this.updatePowerupsText();
    },
    updatePowerupsText () {
      this.powerupsText.text = this.powerups.map(p => SHOOTER_POWERUP_SYMBOLS[p]).join(' | ');
    },
    blink (x, y) {
      if (!this.powerups.includes(SHOOTER_POWERUPS.BLINK)) return;

      if (Math.abs(this.position.x - x) > this.blinkMaxRange) {
        this.position.x = this.blinkMaxRange * (this.position.x < x ? 1 : -1);
      } else {
        this.position.x = x;
      }

      if (Math.abs(this.position.y - y) > this.blinkMaxRange) {
        this.position.y = this.blinkMaxRange * (this.position.y < y ? 1 : -1);
      } else {
        this.position.y = y;
      }

      this.removePowerup(SHOOTER_POWERUPS.BLINK);
    },
  },
});
