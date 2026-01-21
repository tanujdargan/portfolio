import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  protected particles: Particle[];
  protected geometry: THREE.BufferGeometry;
  protected material: THREE.PointsMaterial;
  protected maxParticles: number;
  protected particleCount: number = 0;

  constructor(maxParticles: number, color: THREE.Color, size: number = 1, transparent: boolean = true) {
    this.maxParticles = maxParticles;
    this.particles = [];

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create material with texture for better looking particles
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    // Create material
    this.material = new THREE.PointsMaterial({
      size: size,
      map: texture,
      vertexColors: true,
      transparent: transparent,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    // Create points
    this.points = new THREE.Points(this.geometry, this.material);
  }

  protected addParticle(position: THREE.Vector3, velocity: THREE.Vector3, life: number, size: number): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push({
        position: position.clone(),
        velocity: velocity.clone(),
        life: life,
        maxLife: life,
        size: size
      });
    }
  }

  public update(deltaTime: number): void {
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Update life
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update geometry
    this.updateGeometry();
  }

  protected updateGeometry(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const lifeRatio = particle.life / particle.maxLife;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Fade out as life decreases
      const alpha = lifeRatio;
      colors[i * 3] = alpha;
      colors[i * 3 + 1] = alpha;
      colors[i * 3 + 2] = alpha;

      sizes[i] = particle.size * (0.5 + lifeRatio * 0.5);
    }

    // Clear unused particles
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}

export class EngineTrailSystem extends ParticleSystem {
  private emissionRate: number;
  private timeSinceLastEmit: number = 0;

  constructor() {
    super(500, new THREE.Color(0xffffff), 2, true);
    this.emissionRate = 50; // particles per second
  }

  public emit(position: THREE.Vector3, velocity: THREE.Vector3, throttle: number, deltaTime: number): void {
    if (throttle < 0.1) return; // Don't emit when throttle is too low

    this.timeSinceLastEmit += deltaTime;
    const emitInterval = 1 / this.emissionRate;

    while (this.timeSinceLastEmit >= emitInterval && this.particles.length < this.maxParticles) {
      // Add some randomness to particle spawn
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );

      const particlePos = position.clone().add(randomOffset);

      // Particle velocity is opposite to plane velocity plus some randomness
      const particleVel = velocity.clone().multiplyScalar(-0.3);
      particleVel.add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));

      const life = 1.5 + Math.random() * 1.5;
      const size = 1 + Math.random() * 2;

      this.addParticle(particlePos, particleVel, life, size);
      this.timeSinceLastEmit -= emitInterval;
    }
  }

  protected updateGeometry(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const lifeRatio = particle.life / particle.maxLife;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Gray/white smoke color
      const colorValue = 0.5 + lifeRatio * 0.5;
      colors[i * 3] = colorValue;
      colors[i * 3 + 1] = colorValue;
      colors[i * 3 + 2] = colorValue;

      // Size grows over time
      sizes[i] = particle.size * (1 + (1 - lifeRatio) * 2);
    }

    // Clear unused particles
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}

export class ContrailSystem extends ParticleSystem {
  private emissionRate: number;
  private timeSinceLastEmit: number = 0;
  private readonly MIN_ALTITUDE = 150; // Minimum altitude for contrails

  constructor() {
    super(1000, new THREE.Color(0xffffff), 3, true);
    this.emissionRate = 30; // particles per second
    this.material.opacity = 0.8;
  }

  public emit(position: THREE.Vector3, velocity: THREE.Vector3, altitude: number, deltaTime: number): void {
    // Only emit contrails at high altitude
    if (altitude < this.MIN_ALTITUDE) return;

    this.timeSinceLastEmit += deltaTime;
    const emitInterval = 1 / this.emissionRate;

    while (this.timeSinceLastEmit >= emitInterval && this.particles.length < this.maxParticles) {
      // Contrails spawn directly behind the plane
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );

      const particlePos = position.clone().add(randomOffset);

      // Contrails mostly stay in place with slight drift
      const particleVel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.5
      );

      const life = 5 + Math.random() * 5; // Longer life for contrails
      const size = 2 + Math.random() * 2;

      this.addParticle(particlePos, particleVel, life, size);
      this.timeSinceLastEmit -= emitInterval;
    }
  }

  public update(deltaTime: number): void {
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Slow down over time
      particle.velocity.multiplyScalar(0.98);

      // Update life
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update geometry
    this.updateGeometry();
  }

  protected updateGeometry(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const lifeRatio = particle.life / particle.maxLife;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      // Pure white contrail
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;

      // Size grows significantly over time
      sizes[i] = particle.size * (1 + (1 - lifeRatio) * 4);
    }

    // Clear unused particles
    for (let i = this.particles.length; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}
