import { Container, ticker } from 'pixi.js';
import Mousetrap from 'mousetrap';
import Map from 'src/entities/map';
import Shooter from 'src/entities/shooter';
import Stone from 'src/entities/stone';
import { isFullyContained } from 'src/helpers';

const SOCKET_MESSAGE_TYPE_CONFIG = 'config';
const SOCKET_MESSAGE_TYPE_UPDATE = 'update';
const SERVER_UPDATE_TIME_DELTA_COUNT = 60;
const MAX_SMOOTH_DISTANCE = 100;
const OBJECT_TYPE_PLAYER = 'player';
const OBJECT_TYPE_STONE = 'bullet';
const START_FREEZ_TIME_MS = 1000;
const PING_MAGIC_NUMBER = 50;

const CONTROLS = {
  UP: 'w',
  LEFT: 'a',
  DOWN: 's',
  RIGHT: 'd',
};

export default {
  appState: null,
  container: null,
  ticker: null,
  socket: null,
  map: null,
  username: localStorage.getItem('username'),
  stones: [],
  shooters: {},
  shootedStones: {},
  mouseposition: { x: 0, y: 0 },
  serverLastUpdateTime: 0,
  serverUpdateTimeDelta: [],
  configs: {
    MAP_WIDTH: window.innerWidth,
    MAP_HEIGHT: window.innerHeight,
    SHOOTER_SPEED: 320,
    STONE_SPEED: 640,
    MAX_BLINK_RANGE: 420,
    STONE_TTL: 5000,
  },

  setup (app, state) {
    this.appState = state;
    this.container = new Container();
    this.ticker = new ticker.Ticker();
    this.map = Map.instantiate(this.container, {
      width: this.configs.MAP_WIDTH,
      height: this.configs.MAP_HEIGHT,
    });

    this.setupWebsocket();
    this.setupShooter();
    this.setupStones();

    this.socket.onmessage = this.onSocketMessage.bind(this);

    this.ticker.add(delta => this.updateShootersPosition(delta));
    this.ticker.add(delta => this.updateCameraPosition(delta));
    this.ticker.add(delta => this.updateStonesPositions(delta));
    this.ticker.start();

    app.stage.addChild(this.container);
  },
  destroy () {
    this.container.parent.removeChild(this.container);
    this.container.destroy();
    this.ticker.stop();
    this.socket.close();
  },

  setupWebsocket () {
    this.socket = new WebSocket(
      localStorage.getItem('websocket'),
    );

    this.socket.onopen = () => {
      this.socket.send(JSON.stringify({
        action: 'join',
        payload: {
          token: localStorage.getItem('token'),
        },
      }));
    };
  },
  setupShooter () {
    const movementPressedKeys = [];
    const shooter = Shooter.instantiate(this.map, {
      name: this.username,
      tint: 0xFBBC10,
      blinkMaxRange: this.configs.MAX_BLINK_RANGE,
      velocity: {
        x: 0,
        y: 0,
      },
    });

    const onControlChange = () => {
      const velocity = { x: 0, y: 0 };

      movementPressedKeys.forEach((key) => {
        if (key === CONTROLS.UP) velocity.y = -1;
        if (key === CONTROLS.LEFT) velocity.x = -1;
        if (key === CONTROLS.DOWN) velocity.y = 1;
        if (key === CONTROLS.RIGHT) velocity.x = 1;
      });

      if (velocity.x !== 0
        && velocity.y !== 0) {
        velocity.x *= Math.cos(45 * Math.PI / 180);
        velocity.y *= Math.sin(45 * Math.PI / 180);
      }

      this.socket.send(JSON.stringify({
        action: 'move',
        payload: {
          velocity: {
            x: velocity.x,
            y: velocity.y,
          },
        },
      }));
    };

    Object.keys(CONTROLS).forEach((key) => {
      Mousetrap.bind(CONTROLS[key], () => {
        const index = movementPressedKeys.indexOf(CONTROLS[key]);
        if (index === -1) {
          movementPressedKeys.push(CONTROLS[key]);
          onControlChange();
        }
      });

      Mousetrap.bind(CONTROLS[key], () => {
        const index = movementPressedKeys.indexOf(CONTROLS[key]);
        movementPressedKeys.splice(index, 1);
        onControlChange();
      }, 'keyup');
    });

    Mousetrap.bind('space', () => {
      shooter.blink(this.mouseposition.x, this.mouseposition.y);
    });

    window.addEventListener('click', () => this.shoot(shooter));

    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      this.mouseposition.x = clientX - this.map.position.x;
      this.mouseposition.y = clientY - this.map.position.y;

      const angle = Math.atan2(
        -(this.mouseposition.y - shooter.position.y),
        this.mouseposition.x - shooter.position.x,
      );

      shooter.setDirection(-angle);

      this.socket.send(JSON.stringify({
        action: 'direction',
        payload: {
          direction: angle,
        },
      }));
    });

    this.shooters[this.username] = shooter;
  },
  setupStones () {
    this.stones.push(
      Stone.instantiate(this.map, { position: { x: 220, y: 220 } }),
      Stone.instantiate(this.map, { position: { x: 550, y: 120 } }),
      Stone.instantiate(this.map, { position: { x: 420, y: 220 } }),
      Stone.instantiate(this.map, { position: { x: 420, y: 550 } }),
      Stone.instantiate(this.map, { position: { x: 550, y: 350 } }),
    );
  },
  addShooter (shooter) {
    const newshooter = Shooter.instantiate(this.map, {
      tint: Math.random() * 0xFFFFFF,
      name: shooter.name,
      blinkMaxRange: this.configs.MAX_BLINK_RANGE,
      velocity: {
        x: 0,
        y: 0,
      },
      position: {
        x: shooter.position.x,
        y: shooter.position.y,
      },
    });

    newshooter.sprite.anchor.x = 0.5;
    newshooter.sprite.anchor.y = 0.5;

    this.shooters[shooter.id] = newshooter;
  },
  addStone (stone) {
    const newstone = Stone.instantiate(this.map, {
      position: {
        x: stone.position.x,
        y: stone.position.y,
      },
      rotation: stone.direction,
      tint: stone.tint,
    });

    this.shootedStones[stone.id] = newstone;
  },
  shoot (shooter) {
    if (shooter.stoneCount < 1) return;

    this.socket.send(JSON.stringify({
      action: 'shoot',
      payload: {
        direction: shooter.getRotation(),
      },
    }));
  },
  updateShootersPosition (delta) {
    Object.keys(this.shooters).forEach((id) => {
      this.shooters[id].position.x += this.shooters[id].velocity.x
        * delta * this.configs.SHOOTER_SPEED / this.ticker.FPS;
      this.shooters[id].position.y += this.shooters[id].velocity.y
        * delta * this.configs.SHOOTER_SPEED / this.ticker.FPS;

      this.updateStoneCollection(this.shooters[id]);
    });
  },
  updateCameraPosition () {
    // this.map.position.x = window.innerWidth / 2 - this.shooters[this.username].position.x;
    // this.map.position.y = window.innerHeight / 2 - this.shooters[this.username].position.y;
  },
  updateStonesPositions (delta) {
    Object.keys(this.shootedStones).forEach((id) => {
      this.shootedStones[id].position.x += Math.cos(-this.shootedStones[id].rotation) * delta
      * this.configs.STONE_SPEED / this.ticker.FPS;
      this.shootedStones[id].position.y -= Math.sin(-this.shootedStones[id].rotation) * delta
      * this.configs.STONE_SPEED / this.ticker.FPS;
    });
  },
  updateStoneCollection (shooter) {
    this.stones.forEach((stone) => {
      if (isFullyContained(shooter.sprite, stone.sprite)) {
        const stoneIndex = this.stones.indexOf(stone);

        if (stoneIndex !== -1) {
          this.stones.splice(stoneIndex, 1);
          stone.destroy();
        }
      }
    });
  },
  async onSocketMessage (event) {
    const res = await (new Response(event.data)).json();

    if (res.type === SOCKET_MESSAGE_TYPE_CONFIG) {
      this.setServerConfigs(res);
    }

    if (res.type === SOCKET_MESSAGE_TYPE_UPDATE) {
      this.dispatchServerUpdates(res);
    }
  },
  setServerConfigs ({ payload }) {
    this.configs.MAP_WIDTH = payload.configs.map_width;
    this.configs.MAP_HEIGHT = payload.configs.map_height;
    this.configs.SHOOTER_SPEED = payload.configs.player_speed;
    this.configs.MAX_BLINK_RANGE = payload.configs.max_blink_range;
    this.configs.STONE_SPEED = payload.configs.bullet_speed;
    this.configs.STONE_TTL = payload.configs.bullet_ttl;

    this.map.sprite.width = this.configs.MAP_WIDTH;
    this.map.sprite.height = this.configs.MAP_HEIGHT;

    setTimeout(() => { this.appState.isLoading = false; }, START_FREEZ_TIME_MS);
  },
  dispatchServerUpdates ({ payload }) {
    const now = Date.now();

    if (this.serverLastUpdateTime !== 0) {
      this.serverUpdateTimeDelta.push(now - this.serverLastUpdateTime);
    }

    this.serverLastUpdateTime = now;

    if (this.serverUpdateTimeDelta.length > SERVER_UPDATE_TIME_DELTA_COUNT) {
      this.serverUpdateTimeDelta.shift();
    }

    payload.forEach((update) => {
      let object = null;

      if (update.type === OBJECT_TYPE_PLAYER
        && !this.shooters[update.id]
        && update.name !== this.username) {
        this.addShooter(update);
      } else if (update.type === OBJECT_TYPE_STONE && !this.shootedStones[update.id]) {
        this.addStone(update);
      }

      if (update.type === OBJECT_TYPE_PLAYER) {
        if (update.name === this.username) {
          object = this.shooters[update.name];
        } else {
          object = this.shooters[update.id];
        }

        object.setHealthPoint(update.hp);
        object.setStoneCount(update.ammo);

        if (object.name !== this.username) {
          object.setDirection(-update.direction);
          if (object.health.width < 1) this.appState.isDead = true;
        }
      } else if (update.type === OBJECT_TYPE_STONE) {
        object = this.shootedStones[update.id];
      }


      if (object.position.x === 0
      && object.position.y === 0) {
        object.position.x = update.position.x;
        object.position.y = update.position.y;
      } else if (Math.sqrt(
        (object.position.x - update.position.x)
        * (object.position.x - update.position.x)
        + (object.position.y - update.position.y)
        * (object.position.y - update.position.y),
      ) > MAX_SMOOTH_DISTANCE) {
        object.position = update.position;
        object.velocity = update.velocity;
      } else {
        const futurePosition = {
          x: update.position.x + (update.velocity.x * PING_MAGIC_NUMBER),
          y: update.position.y + (update.velocity.y * PING_MAGIC_NUMBER),
        };

        const velocity = {
          x: (futurePosition.x - object.position.x) / PING_MAGIC_NUMBER,
          y: (futurePosition.y - object.position.y) / PING_MAGIC_NUMBER,
        };

        object.velocity.x = velocity.x;
        object.velocity.y = velocity.y;
      }
    });

    this.destroyUselessObjects(
      payload
        .filter(({ name }) => name !== this.username)
        .map(({ id }) => id),
    );
  },
  destroyUselessObjects (liveObjects) {
    Object.keys(this.shootedStones).forEach((id) => {
      if (!liveObjects.includes(id)) {
        this.shootedStones[id].destroy();
        delete this.shootedStones[id];
      }
    });

    Object.keys(this.shooters).forEach((id) => {
      if (!liveObjects.includes(id)) {
        this.shooters[id].destroy();
        delete this.shooters[id];
      }
    });
  },
};
