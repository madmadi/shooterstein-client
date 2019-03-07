import { Container, ticker } from 'pixi.js';
import Mousetrap from 'mousetrap';
import Map from 'src/entities/map';
import Shooter from 'src/entities/shooter';
import Stone from 'src/entities/stone';
import { isFullyContained } from 'src/helpers';

const SOCKET_MESSAGE_TYPE_CONFIG = 'config';
const SOCKET_MESSAGE_TYPE_UPDATE = 'update';
const SERVER_UPDATE_TIME_DELTA_COUNT = 60;
const MAX_SMOOTH_DISTANCE = 200;

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
  shooters: [],
  stones: [],
  shootedStones: [],
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
      this.mouseposition.x = clientX;
      this.mouseposition.y = clientY;

      const angle = Math.atan2(-(clientY - shooter.position.y), clientX - shooter.position.x);
      shooter.setRotation(-angle);

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

    this.shooters[shooter.name] = newshooter;
  },
  removeShooter (name) {
    this.shooters[name].destroy();
    delete this.shooters[name];
  },
  shoot (shooter) {
    if (shooter.stoneCount < 1) return;

    const stone = Stone.instantiate(this.map, {
      position: {
        x: shooter.position.x,
        y: shooter.position.y,
      },
      rotation: shooter.getRotation(),
      tint: shooter.tint,
    });

    this.shootedStones.push(stone);
    shooter.decreaseStoneCount();

    setTimeout(() => {
      stone.destroy();
      this.shootedStones.splice(this.shootedStones.indexOf(stone), 1);
    }, this.configs.STONE_TTL);
  },
  updateShootersPosition (delta) {
    Object.keys(this.shooters).forEach((name) => {
      this.shooters[name].position.x += this.shooters[name].velocity.x
        * delta * this.configs.SHOOTER_SPEED / this.ticker.FPS;
      this.shooters[name].position.y += this.shooters[name].velocity.y
        * delta * this.configs.SHOOTER_SPEED / this.ticker.FPS;

      // console.log("x",this.shooters[name].position.x);
      // console.log("y",this.shooters[name].position.y);

      this.updateStoneCollection(this.shooters[name]);
    });
  },
  updateStonesPositions (delta) {
    this.shootedStones.forEach((stone) => {
      stone.position.x += Math.cos(-stone.rotation) * delta
      * this.configs.STONE_SPEED / this.ticker.FPS;
      stone.position.y -= Math.sin(-stone.rotation) * delta
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

          shooter.increamentStoneCount();
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
  },
  dispatchServerUpdates ({ payload }) {
    if (this.appState.isLoading) this.appState.isLoading = false;

    const now = Date.now();

    if (this.serverLastUpdateTime !== 0) {
      this.serverUpdateTimeDelta.push(now - this.serverLastUpdateTime);
    }

    this.serverLastUpdateTime = now;

    if (this.serverUpdateTimeDelta.length > SERVER_UPDATE_TIME_DELTA_COUNT) {
      this.serverUpdateTimeDelta.shift();
    }

    const ping = 50;

    payload.forEach((shooter) => {
      if (!this.shooters[shooter.name]) {
        this.addShooter(shooter);
      }

      if (this.shooters[shooter.name].position.x === 0
      && this.shooters[shooter.name].position.y === 0) {
        this.shooters[shooter.name].position.x = shooter.position.x;
        this.shooters[shooter.name].position.y = shooter.position.y;
      }

      if (Math.sqrt(
        (this.shooters[shooter.name].position.x - shooter.position.x)
        * (this.shooters[shooter.name].position.x - shooter.position.x)
        + (this.shooters[shooter.name].position.y - shooter.position.y)
        * (this.shooters[shooter.name].position.y - shooter.position.y),
      ) > MAX_SMOOTH_DISTANCE) {
        this.shooters[shooter.name].position = shooter.position;
        this.shooters[shooter.name].velocity = shooter.velocity;
      } else {
        const futurePosition = {
          x: shooter.position.x + (shooter.velocity.x * ping),
          y: shooter.position.y + (shooter.velocity.y * ping),
        };

        const velocity = {
          x: (futurePosition.x - this.shooters[shooter.name].position.x) / ping,
          y: (futurePosition.y - this.shooters[shooter.name].position.y) / ping,
        };

        this.shooters[shooter.name].velocity = velocity;
      }


      this.shooters[shooter.name].setHealthPoint(shooter.hp);

      if (shooter.name !== this.username) {
        this.shooters[shooter.name].setRotation(-shooter.direction);
      }
    });

    Object.keys(this.shooters)
      .filter(name => name !== this.username)
      .filter(name => !payload.find(s => s.name === name))
      .forEach(name => this.removeShooter(name));
  },
};
