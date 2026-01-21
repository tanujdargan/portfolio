import * as THREE from 'three';

interface Cloud {
  group: THREE.Group;
  velocity: THREE.Vector3;
  baseY: number;
}

export class CloudSystem {
  public group: THREE.Group;
  private clouds: Cloud[];
  private readonly CLOUD_COUNT = 60;
  private readonly CLOUD_AREA = 1500;
  private readonly CLOUD_HEIGHT_MIN = 400;
  private readonly CLOUD_HEIGHT_MAX = 600;
  private readonly CLOUD_SPEED = 3;
  private cloudTexture: THREE.Texture;

  constructor() {
    this.group = new THREE.Group();
    this.clouds = [];
    this.cloudTexture = this.createCloudTexture();
    this.generateClouds();
  }

  private createCloudTexture(): THREE.Texture {
    // Create a soft, fluffy cloud texture using canvas
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Create radial gradient for soft edges
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createCloudGroup(): THREE.Group {
    const cloudGroup = new THREE.Group();

    // Create multiple billboards to form a volumetric cloud
    const puffCount = 8 + Math.floor(Math.random() * 12);

    for (let i = 0; i < puffCount; i++) {
      const size = 30 + Math.random() * 50;

      const spriteMaterial = new THREE.SpriteMaterial({
        map: this.cloudTexture,
        color: 0xeeeeee,  // Slightly off-white to reduce glow
        transparent: true,
        opacity: 0.25 + Math.random() * 0.2,  // Reduced opacity
        depthWrite: false,
        fog: true
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(size, size * 0.6, 1);

      // Position puffs to form cloud shape - flatter, wider
      sprite.position.set(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 60
      );

      cloudGroup.add(sprite);
    }

    // Add some larger background puffs for volume
    for (let i = 0; i < 4; i++) {
      const size = 60 + Math.random() * 40;

      const spriteMaterial = new THREE.SpriteMaterial({
        map: this.cloudTexture,
        color: 0xdddddd,  // Slightly darker for depth
        transparent: true,
        opacity: 0.15 + Math.random() * 0.15,  // Reduced opacity
        depthWrite: false,
        fog: true
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(size, size * 0.5, 1);

      sprite.position.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 80
      );

      cloudGroup.add(sprite);
    }

    return cloudGroup;
  }

  private generateClouds(): void {
    for (let i = 0; i < this.CLOUD_COUNT; i++) {
      const cloudGroup = this.createCloudGroup();

      const x = (Math.random() - 0.5) * this.CLOUD_AREA * 2;
      const y = this.CLOUD_HEIGHT_MIN + Math.random() * (this.CLOUD_HEIGHT_MAX - this.CLOUD_HEIGHT_MIN);
      const z = (Math.random() - 0.5) * this.CLOUD_AREA * 2;

      cloudGroup.position.set(x, y, z);

      // Random scale for variety
      const scale = 0.6 + Math.random() * 1.0;
      cloudGroup.scale.setScalar(scale);

      // Random rotation
      cloudGroup.rotation.y = Math.random() * Math.PI * 2;

      this.group.add(cloudGroup);

      // Store cloud data
      this.clouds.push({
        group: cloudGroup,
        velocity: new THREE.Vector3(
          (Math.random() - 0.3) * this.CLOUD_SPEED,  // Slight eastward bias
          0,
          (Math.random() - 0.5) * this.CLOUD_SPEED * 0.5
        ),
        baseY: y
      });
    }
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.clouds.forEach(cloud => {
      // Move cloud
      cloud.group.position.add(cloud.velocity.clone().multiplyScalar(deltaTime));

      // Gentle vertical bobbing
      cloud.group.position.y = cloud.baseY + Math.sin(Date.now() * 0.0003 + cloud.baseY) * 5;

      // Wrap clouds around player
      const dx = cloud.group.position.x - playerPosition.x;
      const dz = cloud.group.position.z - playerPosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > this.CLOUD_AREA) {
        // Reposition cloud relative to player
        const angle = Math.random() * Math.PI * 2;
        const dist = this.CLOUD_AREA * 0.4 + Math.random() * this.CLOUD_AREA * 0.5;

        cloud.group.position.set(
          playerPosition.x + Math.cos(angle) * dist,
          this.CLOUD_HEIGHT_MIN + Math.random() * (this.CLOUD_HEIGHT_MAX - this.CLOUD_HEIGHT_MIN),
          playerPosition.z + Math.sin(angle) * dist
        );
        cloud.baseY = cloud.group.position.y;
      }
    });
  }

  public setOpacity(opacity: number): void {
    this.clouds.forEach(cloud => {
      cloud.group.traverse((child) => {
        if (child instanceof THREE.Sprite && child.material instanceof THREE.SpriteMaterial) {
          child.material.opacity = Math.max(0.15, Math.min(0.7, opacity * 0.7));
        }
      });
    });
  }

  public setColor(color: THREE.Color): void {
    this.clouds.forEach(cloud => {
      cloud.group.traverse((child) => {
        if (child instanceof THREE.Sprite && child.material instanceof THREE.SpriteMaterial) {
          child.material.color.copy(color);
        }
      });
    });
  }
}
