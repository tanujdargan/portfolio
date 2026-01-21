import * as THREE from 'three';

interface TerrainChunk {
  mesh: THREE.Mesh;
  x: number;
  z: number;
}

export class ProceduralTerrainGenerator {
  public group: THREE.Group;
  private chunks: Map<string, TerrainChunk>;
  private readonly CHUNK_SIZE = 200;
  private readonly CHUNK_SEGMENTS = 48;  // Reduced for performance
  private readonly RENDER_DISTANCE = 6;  // Increased for smoother view
  private readonly MAX_CHUNKS_PER_FRAME = 2;  // Limit chunks created per frame to prevent stuttering
  private pendingChunks: Array<{x: number, z: number}> = [];

  constructor() {
    this.group = new THREE.Group();
    this.chunks = new Map();

    // Add ground/water plane
    this.createGroundPlane();
  }

  private createGroundPlane(): void {
    // Large ground plane that acts as water/sea level
    const groundGeometry = new THREE.PlaneGeometry(20000, 20000);
    groundGeometry.rotateX(-Math.PI / 2);

    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2980b9,  // Ocean blue
      roughness: 0.2,
      metalness: 0.3,
      side: THREE.DoubleSide
    });

    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.position.y = 0;  // At sea level
    groundMesh.receiveShadow = true;

    this.group.add(groundMesh);
  }

  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  // Simple noise function for procedural generation
  private noise2D(x: number, z: number): number {
    // Simple pseudo-random noise based on position
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, z: number): number {
    const corners = (this.noise2D(x - 1, z - 1) + this.noise2D(x + 1, z - 1) +
                     this.noise2D(x - 1, z + 1) + this.noise2D(x + 1, z + 1)) / 16;
    const sides = (this.noise2D(x - 1, z) + this.noise2D(x + 1, z) +
                   this.noise2D(x, z - 1) + this.noise2D(x, z + 1)) / 8;
    const center = this.noise2D(x, z) / 4;
    return corners + sides + center;
  }

  private interpolate(a: number, b: number, t: number): number {
    const ft = t * Math.PI;
    const f = (1 - Math.cos(ft)) * 0.5;
    return a * (1 - f) + b * f;
  }

  private interpolatedNoise(x: number, z: number): number {
    const intX = Math.floor(x);
    const fracX = x - intX;
    const intZ = Math.floor(z);
    const fracZ = z - intZ;

    const v1 = this.smoothNoise(intX, intZ);
    const v2 = this.smoothNoise(intX + 1, intZ);
    const v3 = this.smoothNoise(intX, intZ + 1);
    const v4 = this.smoothNoise(intX + 1, intZ + 1);

    const i1 = this.interpolate(v1, v2, fracX);
    const i2 = this.interpolate(v3, v4, fracX);

    return this.interpolate(i1, i2, fracZ);
  }

  private perlinNoise(x: number, z: number, octaves: number, persistence: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.interpolatedNoise(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  private generateHeightMap(offsetX: number, offsetZ: number): Float32Array {
    const size = this.CHUNK_SEGMENTS + 1;
    const heights = new Float32Array(size * size);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const worldX = offsetX + (i / this.CHUNK_SEGMENTS) * this.CHUNK_SIZE;
        const worldZ = offsetZ + (j / this.CHUNK_SEGMENTS) * this.CHUNK_SIZE;

        // Normalize coordinates for noise
        const x = worldX * 0.001;
        const z = worldZ * 0.001;

        // Continental/biome scale variation (very large features)
        const continentNoise = this.perlinNoise(x * 0.1, z * 0.1, 2, 0.5);

        // Mountain range mask - creates distinct mountain ranges
        const mountainMask = Math.pow(Math.max(0, this.perlinNoise(x * 0.3, z * 0.3, 2, 0.6)), 1.5);

        // Valley/river mask - creates low areas
        const valleyNoise = this.perlinNoise(x * 0.2 + 100, z * 0.2 + 100, 2, 0.5);
        const valleyMask = Math.pow(Math.max(0, valleyNoise), 2);

        let height = 0;

        // Base terrain elevation (rolling plains)
        height += continentNoise * 50 + 30;

        // Dramatic mountain ranges (up to 500 units high!)
        const mountainHeight = this.perlinNoise(x * 2, z * 2, 2, 0.5) * 400 +
                               this.perlinNoise(x * 4, z * 4, 2, 0.4) * 100;
        height += mountainHeight * mountainMask;

        // Deep valleys (can go below sea level)
        height -= valleyMask * 80;

        // Medium hills throughout
        height += this.perlinNoise(x * 5, z * 5, 2, 0.5) * 40;

        // Small terrain details
        height += this.noise2D(x * 20, z * 20) * 15;

        // Rocky outcrops on mountains
        if (mountainMask > 0.3) {
          height += this.noise2D(x * 50, z * 50) * 20 * mountainMask;
        }

        // Clamp minimum height (sea level is at 0, water plane at -5)
        height = Math.max(height, -2);

        heights[i * size + j] = height;
      }
    }

    return heights;
  }


  private createProceduralTexture(chunkX: number, chunkZ: number, heights: Float32Array): THREE.Texture {
    // Create terrain texture based on height - optimized version
    const canvas = document.createElement('canvas');
    const size = 256;  // Reduced from 512 for performance
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const segmentsPerPixel = this.CHUNK_SEGMENTS / size;

    // Use ImageData for faster pixel manipulation
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Sample height from heightmap
        const hx = Math.floor(x * segmentsPerPixel);
        const hy = Math.floor(y * segmentsPerPixel);
        const heightIndex = hy * (this.CHUNK_SEGMENTS + 1) + hx;
        const height = heights[heightIndex] || 0;

        // Simple noise using cheap hash for texture variation
        const noise = this.noise2D(chunkX * 1000 + x * 0.1, chunkZ * 1000 + y * 0.1) * 30 - 15;

        let r, g, b;

        if (height > 350) {
          // Snow peaks (high mountains)
          r = 250 + noise * 0.3;
          g = 250 + noise * 0.3;
          b = 255;
        } else if (height > 250) {
          // Rocky snow mix
          const snowMix = (height - 250) / 100;
          r = 140 + snowMix * 110 + noise;
          g = 130 + snowMix * 120 + noise;
          b = 120 + snowMix * 135 + noise * 0.5;
        } else if (height > 150) {
          // Rocky mountains
          r = 120 + noise;
          g = 110 + noise;
          b = 100 + noise * 0.7;
        } else if (height > 80) {
          // Forest/dense vegetation
          r = 45 + noise;
          g = 85 + noise * 1.2;
          b = 35 + noise * 0.5;
        } else if (height > 30) {
          // Grassland/meadows
          r = 90 + noise;
          g = 135 + noise * 1.3;
          b = 70 + noise * 0.8;
        } else if (height > 5) {
          // Lowlands/plains
          r = 140 + noise;
          g = 160 + noise;
          b = 100 + noise;
        } else {
          // Beach/sand near water
          r = 210 + noise;
          g = 195 + noise;
          b = 150 + noise;
        }

        const idx = (y * size + x) * 4;
        data[idx] = Math.max(0, Math.min(255, r));
        data[idx + 1] = Math.max(0, Math.min(255, g));
        data[idx + 2] = Math.max(0, Math.min(255, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private createChunk(chunkX: number, chunkZ: number): TerrainChunk {
    const geometry = new THREE.PlaneGeometry(
      this.CHUNK_SIZE,
      this.CHUNK_SIZE,
      this.CHUNK_SEGMENTS,
      this.CHUNK_SEGMENTS
    );

    // Rotate geometry first to make it horizontal
    geometry.rotateX(-Math.PI / 2);

    // Get height map
    const heights = this.generateHeightMap(
      chunkX * this.CHUNK_SIZE,
      chunkZ * this.CHUNK_SIZE
    );

    // Apply heights to vertices (now Y is truly vertical after rotation)
    const positionAttribute = geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const y = heights[i];
      positionAttribute.setY(i, y);
    }

    // CRITICAL: Mark position attribute as needing update
    positionAttribute.needsUpdate = true;

    // Recompute normals for proper lighting
    geometry.computeVertexNormals();

    // Create procedural texture based on height
    const texture = this.createProceduralTexture(chunkX, chunkZ, heights);

    // Create material with procedural texture
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    // No rotation needed - geometry is already rotated
    // Use exact integer multiplication to avoid floating point gaps
    mesh.position.set(
      chunkX * this.CHUNK_SIZE,
      0,
      chunkZ * this.CHUNK_SIZE
    );

    // Scale slightly to eliminate gaps between chunks
    mesh.scale.set(1.002, 1, 1.002);
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    // Add mesh to group
    this.group.add(mesh);

    return {
      mesh,
      x: chunkX,
      z: chunkZ
    };
  }

  public update(playerPosition: THREE.Vector3): void {
    // Calculate which chunk the player is in
    const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);

    // Generate chunks around player
    const chunksToKeep = new Set<string>();

    // First pass: identify all chunks needed and queue missing ones
    for (let x = -this.RENDER_DISTANCE; x <= this.RENDER_DISTANCE; x++) {
      for (let z = -this.RENDER_DISTANCE; z <= this.RENDER_DISTANCE; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const key = this.getChunkKey(chunkX, chunkZ);

        chunksToKeep.add(key);

        // Queue chunk for creation if it doesn't exist and isn't already pending
        if (!this.chunks.has(key)) {
          const alreadyPending = this.pendingChunks.some(p => p.x === chunkX && p.z === chunkZ);
          if (!alreadyPending) {
            // Calculate distance from player for priority (closer = higher priority)
            const dist = Math.abs(x) + Math.abs(z);
            // Insert sorted by distance (closest first)
            const insertIndex = this.pendingChunks.findIndex(p =>
              (Math.abs(p.x - playerChunkX) + Math.abs(p.z - playerChunkZ)) > dist
            );
            if (insertIndex === -1) {
              this.pendingChunks.push({x: chunkX, z: chunkZ});
            } else {
              this.pendingChunks.splice(insertIndex, 0, {x: chunkX, z: chunkZ});
            }
          }
        }
      }
    }

    // Process only a limited number of pending chunks per frame to prevent stuttering
    let chunksCreated = 0;
    while (this.pendingChunks.length > 0 && chunksCreated < this.MAX_CHUNKS_PER_FRAME) {
      const pending = this.pendingChunks.shift()!;
      const key = this.getChunkKey(pending.x, pending.z);

      // Double-check it's still needed and not already created
      if (chunksToKeep.has(key) && !this.chunks.has(key)) {
        const chunk = this.createChunk(pending.x, pending.z);
        this.chunks.set(key, chunk);
        chunksCreated++;
      }
    }

    // Remove chunks that are too far away (also limit removals per frame)
    let chunksRemoved = 0;
    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunksToKeep.has(key) && chunksRemoved < 2) {
        this.group.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        const material = chunk.mesh.material;
        if (material instanceof THREE.MeshStandardMaterial) {
          if (material.map) {
            material.map.dispose();
          }
          material.dispose();
        }
        this.chunks.delete(key);
        chunksRemoved++;
      }
    }

    // Clean up pending chunks that are no longer needed
    this.pendingChunks = this.pendingChunks.filter(p =>
      chunksToKeep.has(this.getChunkKey(p.x, p.z))
    );
  }
}
