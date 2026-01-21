import * as THREE from 'three';

interface TerrainChunk {
  mesh: THREE.Mesh;
  x: number;
  z: number;
}

export class TerrainGenerator {
  public group: THREE.Group;
  private chunks: Map<string, TerrainChunk>;
  private readonly CHUNK_SIZE = 200;
  private readonly CHUNK_SEGMENTS = 50;
  private readonly RENDER_DISTANCE = 3; // Number of chunks in each direction

  constructor() {
    this.group = new THREE.Group();
    this.chunks = new Map();
  }

  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  private generateHeightMap(offsetX: number, offsetZ: number): Float32Array {
    const size = this.CHUNK_SEGMENTS + 1;
    const heights = new Float32Array(size * size);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = (offsetX + (i / this.CHUNK_SEGMENTS)) * 0.02;
        const z = (offsetZ + (j / this.CHUNK_SEGMENTS)) * 0.02;

        // Multi-octave noise simulation (simple sine waves)
        let height = 0;
        height += Math.sin(x * 1) * 20;
        height += Math.sin(z * 1) * 20;
        height += Math.sin(x * 2 + z * 2) * 10;
        height += Math.sin(x * 4 + z * 4) * 5;

        heights[i * size + j] = height;
      }
    }

    return heights;
  }

  private createChunk(chunkX: number, chunkZ: number): TerrainChunk {
    const geometry = new THREE.PlaneGeometry(
      this.CHUNK_SIZE,
      this.CHUNK_SIZE,
      this.CHUNK_SEGMENTS,
      this.CHUNK_SEGMENTS
    );

    // Get height map
    const heights = this.generateHeightMap(
      chunkX * this.CHUNK_SIZE,
      chunkZ * this.CHUNK_SIZE
    );

    // Apply heights to vertices
    const positionAttribute = geometry.getAttribute('position');
    for (let i = 0; i < positionAttribute.count; i++) {
      const y = heights[i];
      positionAttribute.setY(i, y);
    }

    // Recompute normals for proper lighting
    geometry.computeVertexNormals();

    // Create gradient material based on height
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    });

    // Add vertex colors based on height
    const colors = new Float32Array(positionAttribute.count * 3);
    for (let i = 0; i < positionAttribute.count; i++) {
      const height = heights[i];

      // Color gradient: blue (water) -> green (grass) -> brown (mountains) -> white (snow)
      const normalizedHeight = (height + 40) / 80; // Normalize to 0-1 range

      let r, g, b;
      if (normalizedHeight < 0.3) {
        // Water - vibrant blue
        r = 0.15;
        g = 0.45;
        b = 0.75;
      } else if (normalizedHeight < 0.5) {
        // Beach/Sand - warm tan
        const t = (normalizedHeight - 0.3) / 0.2;
        r = 0.15 + t * (0.76 - 0.15);
        g = 0.45 + t * (0.70 - 0.45);
        b = 0.75 + t * (0.50 - 0.75);
      } else if (normalizedHeight < 0.7) {
        // Grass - rich green
        const t = (normalizedHeight - 0.5) / 0.2;
        r = 0.76 + t * (0.34 - 0.76);
        g = 0.70 + t * (0.65 - 0.70);
        b = 0.50 + t * (0.30 - 0.50);
      } else if (normalizedHeight < 0.85) {
        // Mountains - rocky brown/gray
        const t = (normalizedHeight - 0.7) / 0.15;
        r = 0.34 + t * (0.45 - 0.34);
        g = 0.65 + t * (0.42 - 0.65);
        b = 0.30 + t * (0.38 - 0.30);
      } else {
        // Snow peaks - bright white
        r = 0.95;
        g = 0.95;
        b = 0.98;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      chunkX * this.CHUNK_SIZE,
      0,
      chunkZ * this.CHUNK_SIZE
    );
    mesh.receiveShadow = true;

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

    for (let x = -this.RENDER_DISTANCE; x <= this.RENDER_DISTANCE; x++) {
      for (let z = -this.RENDER_DISTANCE; z <= this.RENDER_DISTANCE; z++) {
        const chunkX = playerChunkX + x;
        const chunkZ = playerChunkZ + z;
        const key = this.getChunkKey(chunkX, chunkZ);

        chunksToKeep.add(key);

        // Create chunk if it doesn't exist
        if (!this.chunks.has(key)) {
          const chunk = this.createChunk(chunkX, chunkZ);
          this.chunks.set(key, chunk);
        }
      }
    }

    // Remove chunks that are too far away
    for (const [key, chunk] of this.chunks.entries()) {
      if (!chunksToKeep.has(key)) {
        this.group.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }
  }
}
