import { Container, ticker } from 'pixi.js';
import Mousetrap from 'mousetrap';
import Map from 'src/entities/map';
import Shooter from 'src/entities/shooter';

const CONTROLS = {
  UP: 'w',
  LEFT: 'a',
  DOWN: 's',
  RIGHT: 'd',
};

export default {
  appState: null,
  container: null,
  map: null,
  shooters: [],

  setup (app, state) {
    this.appState = state;
    this.container = new Container();
    this.ticker = new ticker.Ticker();
    this.map = Map.instantiate(this.container, { width: 10000, height: 10000 });

    this.setupShooter();

    this.ticker.speed = 4;
    this.ticker.add(delta => this.updateShootersPosition(delta));
    this.ticker.start();

    app.stage.addChild(this.container);
  },
  destroy () {
    this.container.parent.removeChild(this.container);
    this.container.destroy();
  },

  setupShooter () {
    const shooter = Shooter.instantiate(this.map, {
      tint: 0xFBBC10,
      velocity: {
        x: 0,
        y: 0,
      },
    });

    Mousetrap.bind(CONTROLS.UP, () => { shooter.velocity.y = -1; });
    Mousetrap.bind(CONTROLS.LEFT, () => { shooter.velocity.x = -1; });
    Mousetrap.bind(CONTROLS.DOWN, () => { shooter.velocity.y = 1; });
    Mousetrap.bind(CONTROLS.RIGHT, () => { shooter.velocity.x = 1; });

    Mousetrap.bind([CONTROLS.UP, CONTROLS.DOWN], () => { shooter.velocity.y = 0; }, 'keyup');
    Mousetrap.bind([CONTROLS.LEFT, CONTROLS.RIGHT], () => { shooter.velocity.x = 0; }, 'keyup');

    shooter.sprite.anchor.x = 0.5;
    shooter.sprite.anchor.y = 0.5;

    window.addEventListener('mousemove', ({ clientX, clientY }) => {
      const angle = Math.atan2(shooter.position.x - clientX, shooter.position.y - clientY);

      shooter.sprite.rotation = -angle;
    });

    this.shooters.push(shooter);
  },
  updateShootersPosition (delta) {
    this.shooters.forEach((shooter) => {
      shooter.position.x += shooter.velocity.x * delta;
      shooter.position.y += shooter.velocity.y * delta;
    });
  },
};
