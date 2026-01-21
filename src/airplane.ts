import * as THREE from 'three';
import { EngineTrailSystem, ContrailSystem } from './particles';

export class Airplane {
  public mesh: THREE.Group;
  public velocity: THREE.Vector3;
  public throttle: number = 0.5;

  private rotation: THREE.Euler;
  private rotationVelocity: THREE.Vector3;
  private forward: THREE.Vector3;

  // Particle systems
  private engineTrail: EngineTrailSystem;
  private contrail: ContrailSystem;
  private enginePosition: THREE.Vector3;

  // Control inputs
  public pitch: number = 0;
  public roll: number = 0;
  public yaw: number = 0;

  // Physics constants
  private readonly MAX_SPEED = 50;
  private readonly MIN_SPEED = 10;
  private readonly ACCELERATION = 5;
  private readonly DRAG = 0.98;
  private readonly LIFT_COEFFICIENT = 0.3;
  private readonly ROTATION_SPEED = 1.5;
  private readonly ROTATION_DAMPING = 0.95;

  constructor() {
    this.mesh = new THREE.Group();
    this.velocity = new THREE.Vector3(0, 0, 20);
    this.rotation = new THREE.Euler(0, 0, 0);
    this.rotationVelocity = new THREE.Vector3(0, 0, 0);
    this.forward = new THREE.Vector3(0, 0, 1);
    this.enginePosition = new THREE.Vector3();

    // Create particle systems
    this.engineTrail = new EngineTrailSystem();
    this.contrail = new ContrailSystem();

    this.createAirplaneModel();

    // Start at altitude (above terrain which can be 200+ units high)
    this.mesh.position.set(0, 350, 0);
  }

  public getEngineTrail(): EngineTrailSystem {
    return this.engineTrail;
  }

  public getContrail(): ContrailSystem {
    return this.contrail;
  }

  private createAirplaneModel(): void {
    // Fuselage (main body) - sleek and rounded
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 2.5, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6b6b,
      metalness: 0.3,
      roughness: 0.4,
      emissive: 0x220000,
      emissiveIntensity: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    this.mesh.add(body);

    // Cockpit canopy
    const canopyGeometry = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(0, 0.3, 0.5);
    canopy.rotation.x = -Math.PI / 2;
    canopy.castShadow = true;
    this.mesh.add(canopy);

    // Main wings
    const wingGeometry = new THREE.BoxGeometry(10, 0.15, 1.8);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ecdc4,
      metalness: 0.5,
      roughness: 0.3
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.y = -0.2;
    wings.castShadow = true;
    this.mesh.add(wings);

    // Wing tips (rounded)
    const wingTipGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const leftWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
    leftWingTip.scale.set(0.5, 0.5, 1.5);
    leftWingTip.position.set(-5, -0.2, 0);
    leftWingTip.castShadow = true;
    this.mesh.add(leftWingTip);

    const rightWingTip = new THREE.Mesh(wingTipGeometry, wingMaterial);
    rightWingTip.scale.set(0.5, 0.5, 1.5);
    rightWingTip.position.set(5, -0.2, 0);
    rightWingTip.castShadow = true;
    this.mesh.add(rightWingTip);

    // Horizontal stabilizer (tail wing)
    const tailGeometry = new THREE.BoxGeometry(2.5, 0.1, 1);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(0, 0.1, -1.5);
    tail.castShadow = true;
    this.mesh.add(tail);

    // Vertical stabilizer
    const vStabGeometry = new THREE.BoxGeometry(0.15, 1.2, 1);
    const vStab = new THREE.Mesh(vStabGeometry, wingMaterial);
    vStab.position.set(0, 0.6, -1.5);
    vStab.castShadow = true;
    this.mesh.add(vStab);

    // Engine/Propeller spinner
    const spinnerGeometry = new THREE.ConeGeometry(0.25, 0.6, 8);
    const spinnerMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2
    });
    const spinner = new THREE.Mesh(spinnerGeometry, spinnerMaterial);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.set(0, 0, 1.8);
    spinner.castShadow = true;
    this.mesh.add(spinner);

    // Propeller blades
    const bladeGeometry = new THREE.BoxGeometry(0.08, 3, 0.3);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.7,
      roughness: 0.3
    });
    const propeller = new THREE.Group();
    propeller.name = 'propeller';
    propeller.position.set(0, 0, 2);

    const blade1 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade1.castShadow = true;
    propeller.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade2.rotation.z = Math.PI / 2;
    blade2.castShadow = true;
    propeller.add(blade2);

    this.mesh.add(propeller);

    // Add subtle position lights
    const leftLight = new THREE.PointLight(0xff0000, 0.5, 3);
    leftLight.position.set(-5, -0.2, 0);
    this.mesh.add(leftLight);

    const rightLight = new THREE.PointLight(0x00ff00, 0.5, 3);
    rightLight.position.set(5, -0.2, 0);
    this.mesh.add(rightLight);
  }

  public update(deltaTime: number): void {
    // Clamp delta time to prevent large jumps
    deltaTime = Math.min(deltaTime, 0.1);

    // Update rotation velocity based on inputs
    this.rotationVelocity.x += this.pitch * this.ROTATION_SPEED * deltaTime;
    this.rotationVelocity.y += this.yaw * this.ROTATION_SPEED * deltaTime;
    this.rotationVelocity.z += this.roll * this.ROTATION_SPEED * deltaTime;

    // Apply damping to rotation
    this.rotationVelocity.multiplyScalar(this.ROTATION_DAMPING);

    // Update rotation
    this.mesh.rotation.x += this.rotationVelocity.x * deltaTime;
    this.mesh.rotation.y += this.rotationVelocity.y * deltaTime;
    this.mesh.rotation.z += this.rotationVelocity.z * deltaTime;

    // Limit roll and pitch
    this.mesh.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.mesh.rotation.x));
    this.mesh.rotation.z = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.mesh.rotation.z));

    // Update throttle-based speed
    const targetSpeed = this.MIN_SPEED + (this.MAX_SPEED - this.MIN_SPEED) * this.throttle;

    // Get forward direction
    this.forward.set(0, 0, 1);
    this.forward.applyQuaternion(this.mesh.quaternion);

    // Accelerate towards target speed
    const currentSpeed = this.velocity.length();
    const speedDiff = targetSpeed - currentSpeed;
    const acceleration = speedDiff * this.ACCELERATION * deltaTime;

    this.velocity.add(this.forward.clone().multiplyScalar(acceleration));

    // Apply drag
    this.velocity.multiplyScalar(this.DRAG);

    // Apply lift (upward force based on speed and pitch)
    const lift = currentSpeed * this.LIFT_COEFFICIENT * Math.sin(-this.mesh.rotation.x);
    this.velocity.y += lift * deltaTime;

    // Apply gravity
    this.velocity.y -= 9.8 * deltaTime;

    // Update position
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Prevent going below ground
    if (this.mesh.position.y < 5) {
      this.mesh.position.y = 5;
      this.velocity.y = Math.max(0, this.velocity.y);
    }

    // Rotate propeller
    const propeller = this.mesh.getObjectByName('propeller');
    if (propeller) {
      propeller.rotation.z += this.throttle * deltaTime * 50;
    }

    // Update engine trail position (back of the plane)
    const engineOffset = new THREE.Vector3(0, 0, -1.8);
    engineOffset.applyQuaternion(this.mesh.quaternion);
    this.enginePosition.copy(this.mesh.position).add(engineOffset);

    // Emit engine trail particles
    this.engineTrail.emit(this.enginePosition, this.velocity, this.throttle, deltaTime);
    this.engineTrail.update(deltaTime);

    // Emit contrail particles at high altitude
    this.contrail.emit(this.enginePosition, this.velocity, this.mesh.position.y, deltaTime);
    this.contrail.update(deltaTime);
  }
}
