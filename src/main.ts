import * as THREE from 'three';
import { Airplane } from './airplane';
import { ProceduralTerrainGenerator } from './mapbox-terrain';
import { CameraController } from './camera';
import { InputController } from './input';
import { SkySystem } from './sky';
import { CloudSystem } from './clouds';
import { PostProcessing } from './postprocessing';

class FlightSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private airplane: Airplane;
  private terrain: ProceduralTerrainGenerator;
  private cameraController: CameraController;
  private inputController: InputController;
  private clock: THREE.Clock;
  private skySystem: SkySystem;
  private cloudSystem: CloudSystem;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private postProcessing: PostProcessing;

  constructor() {
    this.clock = new THREE.Clock();

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87CEEB, 200, 3000);  // Increased fog distance

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      8000  // Increased far plane
    );

    // Setup renderer
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Setup lighting
    this.setupLighting();

    // Setup post-processing
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

    // Create airplane
    this.airplane = new Airplane();
    this.scene.add(this.airplane.mesh);

    // Add particle systems to scene
    this.scene.add(this.airplane.getEngineTrail().points);
    this.scene.add(this.airplane.getContrail().points);

    // Create procedurally generated terrain
    this.terrain = new ProceduralTerrainGenerator();
    this.scene.add(this.terrain.group);

    // Setup camera controller
    this.cameraController = new CameraController(this.camera, this.airplane);

    // Setup input controller
    this.inputController = new InputController(this.airplane, this.cameraController);
    this.inputController.setSkySystem(this.skySystem);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Initialize terrain at starting position
    this.terrain.update(this.airplane.mesh.position);

    // Hide loading screen after terrain loads
    setTimeout(() => {
      const loadingBar = document.getElementById('loading-bar');
      if (loadingBar) {
        loadingBar.style.width = '100%';
      }

      setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
          loadingScreen.classList.add('hidden');
        }
      }, 500);
    }, 1500);

    // Start animation loop
    this.animate();
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Hemisphere light for better outdoor lighting
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x6b8e23, 0.5);
    this.scene.add(hemisphereLight);

    // Directional light for sun
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.sunLight.position.set(100, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -200;
    this.sunLight.shadow.camera.right = 200;
    this.sunLight.shadow.camera.top = 200;
    this.sunLight.shadow.camera.bottom = -200;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.scene.add(this.sunLight);

    // Create sky system
    this.skySystem = new SkySystem(this.sunLight);
    this.scene.add(this.skySystem.group);

    // Create cloud system
    this.cloudSystem = new CloudSystem();
    this.scene.add(this.cloudSystem.group);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postProcessing.resize(
      window.innerWidth,
      window.innerHeight,
      this.renderer.getPixelRatio()
    );
  }

  private updateUI(): void {
    const speedElement = document.getElementById('speed');
    const altitudeElement = document.getElementById('altitude');
    const timeElement = document.getElementById('time');

    if (speedElement) {
      const speed = Math.round(this.airplane.velocity.length() * 10);
      speedElement.textContent = `Speed: ${speed} km/h`;
    }

    if (altitudeElement) {
      const altitude = Math.round(this.airplane.mesh.position.y);
      altitudeElement.textContent = `Altitude: ${altitude} m`;
    }

    if (timeElement) {
      const time = this.skySystem.timeOfDay;
      const hours = Math.floor(time * 24);
      const minutes = Math.floor((time * 24 - hours) * 60);
      timeElement.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Update airplane physics
    this.airplane.update(deltaTime);

    // Update terrain (generate new chunks)
    this.terrain.update(this.airplane.mesh.position);

    // Update camera
    this.cameraController.update(deltaTime);

    // Update sky and lighting
    this.skySystem.update(deltaTime);

    // Update clouds
    this.cloudSystem.update(deltaTime, this.airplane.mesh.position);

    // Update fog color based on time of day
    const fogColor = this.skySystem.getFogColor(this.skySystem.timeOfDay);
    (this.scene.fog as THREE.Fog).color.copy(fogColor);

    // Update cloud colors based on time of day
    const t = this.skySystem.timeOfDay;
    let cloudColor: THREE.Color;
    if (t < 0.27 || t > 0.73) {
      // Dawn/Dusk/Night - orange/pink tinted clouds
      cloudColor = new THREE.Color(0xffccaa);
    } else {
      // Day - white clouds
      cloudColor = new THREE.Color(0xffffff);
    }
    this.cloudSystem.setColor(cloudColor);

    // Update UI
    this.updateUI();

    // Render scene with post-processing
    this.postProcessing.render();
  };
}

// Initialize the simulator
new FlightSimulator();
