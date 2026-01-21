import * as THREE from 'three';
import { Airplane } from './airplane';

export enum CameraMode {
  CHASE,
  COCKPIT,
  CINEMATIC,
  FREE
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private airplane: Airplane;
  private mode: CameraMode;
  private currentPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private targetLookAt: THREE.Vector3;

  // Camera smoothing
  private readonly LERP_FACTOR = 0.1;

  // Camera offsets for different modes
  private readonly CHASE_OFFSET = new THREE.Vector3(0, 8, -15);  // Raised Y from 3 to 8 for better terrain view
  private readonly COCKPIT_OFFSET = new THREE.Vector3(0, 0.5, 1);
  private readonly CINEMATIC_OFFSET = new THREE.Vector3(8, 4, -8);

  constructor(camera: THREE.PerspectiveCamera, airplane: Airplane) {
    this.camera = camera;
    this.airplane = airplane;
    this.mode = CameraMode.CHASE;
    this.currentPosition = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
  }

  public cycleMode(): void {
    this.mode = (this.mode + 1) % 4;
    console.log(`Camera mode: ${CameraMode[this.mode]}`);
  }

  private updateChaseCamera(): void {
    // Position camera behind and above the airplane
    const offset = this.CHASE_OFFSET.clone();
    offset.applyQuaternion(this.airplane.mesh.quaternion);
    this.targetPosition.copy(this.airplane.mesh.position).add(offset);

    // Look ahead of airplane and slightly down to see terrain
    const lookOffset = new THREE.Vector3(0, -2, 5);  // Look 5 units ahead and 2 units down
    lookOffset.applyQuaternion(this.airplane.mesh.quaternion);
    this.targetLookAt.copy(this.airplane.mesh.position).add(lookOffset);
  }

  private updateCockpitCamera(): void {
    // Position camera inside the cockpit
    const offset = this.COCKPIT_OFFSET.clone();
    offset.applyQuaternion(this.airplane.mesh.quaternion);
    this.targetPosition.copy(this.airplane.mesh.position).add(offset);

    // Look forward
    const lookOffset = new THREE.Vector3(0, 0, 10);
    lookOffset.applyQuaternion(this.airplane.mesh.quaternion);
    this.targetLookAt.copy(this.airplane.mesh.position).add(lookOffset);
  }

  private updateCinematicCamera(): void {
    // Side view that follows the airplane
    const offset = this.CINEMATIC_OFFSET.clone();

    // Rotate offset based on time for dynamic view
    const time = Date.now() * 0.0002;
    const rotatedOffset = offset.clone();
    rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), time);

    this.targetPosition.copy(this.airplane.mesh.position).add(rotatedOffset);

    // Look at airplane
    this.targetLookAt.copy(this.airplane.mesh.position);
  }

  private updateFreeCamera(): void {
    // Static camera that watches the airplane fly by
    this.targetPosition.set(
      this.airplane.mesh.position.x + 50,
      this.airplane.mesh.position.y + 20,
      this.airplane.mesh.position.z + 50
    );

    // Look at airplane
    this.targetLookAt.copy(this.airplane.mesh.position);
  }

  public update(deltaTime: number): void {
    // Update target position and look-at based on current mode
    switch (this.mode) {
      case CameraMode.CHASE:
        this.updateChaseCamera();
        break;
      case CameraMode.COCKPIT:
        this.updateCockpitCamera();
        break;
      case CameraMode.CINEMATIC:
        this.updateCinematicCamera();
        break;
      case CameraMode.FREE:
        this.updateFreeCamera();
        break;
    }

    // Smoothly interpolate camera position and look-at
    this.currentPosition.lerp(this.targetPosition, this.LERP_FACTOR);
    this.currentLookAt.lerp(this.targetLookAt, this.LERP_FACTOR);

    // Apply to camera
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }
}
