import { Airplane } from './airplane';
import { CameraController } from './camera';
import { SkySystem } from './sky';

export class InputController {
  private airplane: Airplane;
  private cameraController: CameraController;
  private skySystem: SkySystem | null = null;
  private keys: Set<string>;

  constructor(airplane: Airplane, cameraController: CameraController) {
    this.airplane = airplane;
    this.cameraController = cameraController;
    this.keys = new Set();

    this.setupEventListeners();
  }

  public setSkySystem(skySystem: SkySystem): void {
    this.skySystem = skySystem;
    this.setupTimeControls();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key.toLowerCase());

    // Handle camera switch
    if (event.key.toLowerCase() === 'c') {
      this.cameraController.cycleMode();
    }

    this.updateControls();
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
    this.updateControls();
  }

  private updateControls(): void {
    // Reset controls
    this.airplane.pitch = 0;
    this.airplane.roll = 0;
    this.airplane.yaw = 0;

    // Pitch (W/S)
    if (this.keys.has('w')) {
      this.airplane.pitch = 1; // Pitch up
    }
    if (this.keys.has('s')) {
      this.airplane.pitch = -1; // Pitch down
    }

    // Roll (A/D)
    if (this.keys.has('a')) {
      this.airplane.roll = -1; // Roll left
    }
    if (this.keys.has('d')) {
      this.airplane.roll = 1; // Roll right
    }

    // Yaw (Q/E)
    if (this.keys.has('q')) {
      this.airplane.yaw = 1; // Yaw left
    }
    if (this.keys.has('e')) {
      this.airplane.yaw = -1; // Yaw right
    }

    // Throttle (Arrow Up/Down)
    if (this.keys.has('arrowup')) {
      this.airplane.throttle = Math.min(1, this.airplane.throttle + 0.01);
    }
    if (this.keys.has('arrowdown')) {
      this.airplane.throttle = Math.max(0, this.airplane.throttle - 0.01);
    }
  }

  private setupTimeControls(): void {
    const pauseButton = document.getElementById('pause-time');
    const normalButton = document.getElementById('normal-time');
    const fastButton = document.getElementById('fast-time');
    const veryFastButton = document.getElementById('very-fast-time');

    const updateActiveButton = (active: HTMLElement | null) => {
      [pauseButton, normalButton, fastButton, veryFastButton].forEach(btn => {
        btn?.classList.remove('active');
      });
      active?.classList.add('active');
    };

    pauseButton?.addEventListener('click', () => {
      if (this.skySystem) {
        this.skySystem.setTimeSpeed(0);
        updateActiveButton(pauseButton);
      }
    });

    normalButton?.addEventListener('click', () => {
      if (this.skySystem) {
        this.skySystem.setTimeSpeed(0.01);
        updateActiveButton(normalButton);
      }
    });

    fastButton?.addEventListener('click', () => {
      if (this.skySystem) {
        this.skySystem.setTimeSpeed(0.1);
        updateActiveButton(fastButton);
      }
    });

    veryFastButton?.addEventListener('click', () => {
      if (this.skySystem) {
        this.skySystem.setTimeSpeed(0.5);
        updateActiveButton(veryFastButton);
      }
    });

    // Set default active button
    updateActiveButton(normalButton);
  }
}
