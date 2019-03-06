import { Container, ticker } from 'pixi.js';
import Mousetrap from 'mousetrap';
import Map from 'src/entities/map';
import Shooter from 'src/entities/shooter';
import Stone from 'src/entities/stone';

const SOCKET_MESSAGE_TYPE_CONFIG = 'config';
const SOCKET_MESSAGE_TYPE_UPDATE = 'update';

const POSITION_ERROR_THRESHOLD = 20;

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
  shooters: [],
  shootedStones: [],
  configs: {
    MAP_WIDTH: window.innerWidth,
    MAP_HEIGHT: window.innerHeight,
    SHOOTER_SPEED: 1,
    MAX_BLINK_RANGE: 10,
    STONE_SPEED: 2,
    STONE_TTL: 50000,
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
      name: localStorage.getItem('username'),
      tint: 0xFBBC10,
      velocity: {
        x: 0,
        y: 0,
      },
    });

    const onControlChange = () => {
      shooter.velocity.x = 0;
      shooter.velocity.y = 0;

      movementPressedKeys.forEach((key) => {
        if (key === CONTROLS.UP) shooter.velocity.y = -1;
        if (key === CONTROLS.LEFT) shooter.velocity.x = -1;
        if (key === CONTROLS.DOWN) shooter.velocity.y = 1;
        if (key === CONTROLS.RIGHT) shooter.velocity.x = 1;
      });

      if (shooter.velocity.x !== 0
        && shooter.velocity.y !== 0) {
        shooter.velocity.x *= Math.cos(45 * Math.PI / 180);
        shooter.velocity.y *= Math.sin(45 * Math.PI / 180);
      }

      this.socket.send(JSON.stringify({
        action: 'move',
        payload: {
          velocity: {
            x: shooter.velocity.x,
            y: shooter.velocity.y,
          },
        },
      }));
    };

    shooter.sprite.anchor.x = 0.5;
    shooter.sprite.anchor.y = 0.5;

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

    window.addEventListener('click', () => this.shoot(shooter));

    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      const angle = Math.atan2(-(clientY - shooter.position.y), clientX - shooter.position.x);
      // shooter.sprite.rotation = -angle;

      this.socket.send(JSON.stringify({
        action: 'direction',
        payload: {
          direction: angle,
        },
      }));
    });

    this.shooters[localStorage.getItem('username')] = shooter;
  },
  addShooter (shooter) {
    const newshooter = Shooter.instantiate(this.map, {
      tint: Math.random() * 0xFFFFFF,
      name: shooter.name,
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
    const stone = Stone.instantiate(this.map, {
      position: {
        x: shooter.position.x,
        y: shooter.position.y,
      },
      rotation: shooter.sprite.rotation,
      tint: shooter.tint,
    });

    this.shootedStones.push(stone);

    setTimeout(() => {
      stone.destroy();
      this.shootedStones.splice(this.shootedStones.indexOf(stone), 1);
    }, this.configs.STONE_TTL);
  },
  updateShootersPosition (delta) {
    Object.keys(this.shooters).forEach((name) => {
      this.shooters[name].position.x += this.shooters[name].velocity.x
        * delta * this.configs.SHOOTER_SPEED;
      this.shooters[name].position.y += this.shooters[name].velocity.y
        * delta * this.configs.SHOOTER_SPEED;
    });
  },
  updateStonesPositions (delta) {
    this.shootedStones.forEach((stone) => {
      stone.position.x += Math.cos(-stone.rotation) * delta * this.configs.STONE_SPEED;
      stone.position.y -= Math.sin(-stone.rotation) * delta * this.configs.STONE_SPEED;
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
    this.configs.SHOOTER_SPEED = payload.configs.player_speed * 16;
    this.configs.MAX_BLINK_RANGE = payload.configs.blink_range;
    this.configs.STONE_SPEED = payload.configs.bullet_speed;
    this.configs.STONE_TTL = payload.configs.bullet_ttl;

    this.map.sprite.width = this.configs.MAP_WIDTH;
    this.map.sprite.height = this.configs.MAP_HEIGHT;
  },
  dispatchServerUpdates ({ payload }) {
    if (this.appState.isLoading) this.appState.isLoading = false;

    payload.forEach((shooter) => {
      if (!this.shooters[shooter.name]) {
        this.addShooter(shooter);
      }

      if (Math.abs(this.shooters[shooter.name].position.x - shooter.position.x) > POSITION_ERROR_THRESHOLD) {
        this.shooters[shooter.name].position.x = shooter.position.x;
      }

      if (Math.abs(this.shooters[shooter.name].position.y - shooter.position.y) > POSITION_ERROR_THRESHOLD) {
        this.shooters[shooter.name].position.y = shooter.position.y;
      }

      this.shooters[shooter.name].velocity = shooter.velocity;
      this.shooters[shooter.name].sprite.rotation = -shooter.direction;
    });

    Object.keys(this.shooters)
      .filter(name => name !== localStorage.getItem('username'))
      .filter(name => !payload.find(s => s.name === name))
      .forEach(name => this.removeShooter(name));
  },
};
