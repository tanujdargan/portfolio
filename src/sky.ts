import * as THREE from 'three';

export class SkySystem {
  public group: THREE.Group;
  private sunLight: THREE.DirectionalLight;
  private skyMaterial: THREE.ShaderMaterial;
  private sunMesh: THREE.Mesh;
  private moonMesh: THREE.Mesh;

  public timeOfDay: number = 0.3; // 0 = midnight, 0.5 = noon, 1.0 = midnight
  public timeSpeed: number = 0.01; // Time progression speed

  constructor(sunLight: THREE.DirectionalLight) {
    this.group = new THREE.Group();
    this.sunLight = sunLight;

    this.createSky();
    this.createSun();
    this.createMoon();
    this.update(0);
  }

  private createSky(): void {
    // Create sky dome
    const skyGeometry = new THREE.SphereGeometry(2000, 32, 15);

    // Custom sky shader for gradient
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide
    });

    const skyDome = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.group.add(skyDome);
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(50, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      fog: false
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.group.add(this.sunMesh);
  }

  private createMoon(): void {
    const moonGeometry = new THREE.SphereGeometry(40, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      fog: false
    });
    this.moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    this.group.add(this.moonMesh);
  }

  private getSkyColors(time: number): { top: THREE.Color; bottom: THREE.Color; sun: THREE.Color } {
    // Normalize time to 0-1 range
    const t = time % 1.0;

    let top, bottom, sun;

    if (t < 0.23) {
      // Night (0.0 - 0.23)
      top = new THREE.Color(0x000033);
      bottom = new THREE.Color(0x000011);
      sun = new THREE.Color(0xffffcc);
    } else if (t < 0.27) {
      // Dawn (0.23 - 0.27)
      const factor = (t - 0.23) / 0.04;
      top = new THREE.Color().lerpColors(
        new THREE.Color(0x000033),
        new THREE.Color(0xff6b4a),
        factor
      );
      bottom = new THREE.Color().lerpColors(
        new THREE.Color(0x000011),
        new THREE.Color(0xffa07a),
        factor
      );
      sun = new THREE.Color(0xffaa77);
    } else if (t < 0.3) {
      // Sunrise (0.27 - 0.3)
      const factor = (t - 0.27) / 0.03;
      top = new THREE.Color().lerpColors(
        new THREE.Color(0xff6b4a),
        new THREE.Color(0x4a90e2),
        factor
      );
      bottom = new THREE.Color().lerpColors(
        new THREE.Color(0xffa07a),
        new THREE.Color(0xffffff),
        factor
      );
      sun = new THREE.Color(0xffdd88);
    } else if (t < 0.7) {
      // Day (0.3 - 0.7)
      top = new THREE.Color(0x0077ff);
      bottom = new THREE.Color(0xd6eaff);
      sun = new THREE.Color(0xffffee);
    } else if (t < 0.73) {
      // Sunset (0.7 - 0.73)
      const factor = (t - 0.7) / 0.03;
      top = new THREE.Color().lerpColors(
        new THREE.Color(0x0077ff),
        new THREE.Color(0xff4500),
        factor
      );
      bottom = new THREE.Color().lerpColors(
        new THREE.Color(0xd6eaff),
        new THREE.Color(0xff8c69),
        factor
      );
      sun = new THREE.Color(0xff7733);
    } else if (t < 0.77) {
      // Dusk (0.73 - 0.77)
      const factor = (t - 0.73) / 0.04;
      top = new THREE.Color().lerpColors(
        new THREE.Color(0xff4500),
        new THREE.Color(0x000033),
        factor
      );
      bottom = new THREE.Color().lerpColors(
        new THREE.Color(0xff8c69),
        new THREE.Color(0x000011),
        factor
      );
      sun = new THREE.Color(0xff5544);
    } else {
      // Night (0.77 - 1.0)
      top = new THREE.Color(0x000033);
      bottom = new THREE.Color(0x000011);
      sun = new THREE.Color(0xffffcc);
    }

    return { top, bottom, sun };
  }

  private updateSunPosition(time: number): void {
    const t = time % 1.0;

    // Sun moves in an arc across the sky
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const distance = 800;

    this.sunMesh.position.set(
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      0
    );

    // Moon is opposite to the sun
    this.moonMesh.position.set(
      -Math.cos(angle) * distance,
      -Math.sin(angle) * distance,
      0
    );

    // Update sun light position
    this.sunLight.position.copy(this.sunMesh.position);
  }

  public getLightIntensity(time: number): number {
    const t = time % 1.0;

    if (t < 0.25 || t > 0.75) {
      // Night
      return 0.2;
    } else if (t < 0.3) {
      // Dawn
      return 0.2 + ((t - 0.25) / 0.05) * 0.6;
    } else if (t < 0.7) {
      // Day
      return 0.8;
    } else {
      // Dusk
      return 0.8 - ((t - 0.7) / 0.05) * 0.6;
    }
  }

  public getFogColor(time: number): THREE.Color {
    const colors = this.getSkyColors(time);
    return colors.bottom;
  }

  public update(deltaTime: number): void {
    // Progress time
    this.timeOfDay += this.timeSpeed * deltaTime;
    this.timeOfDay = this.timeOfDay % 1.0;

    // Update sky colors
    const colors = this.getSkyColors(this.timeOfDay);
    this.skyMaterial.uniforms.topColor.value = colors.top;
    this.skyMaterial.uniforms.bottomColor.value = colors.bottom;
    (this.sunMesh.material as THREE.MeshBasicMaterial).color = colors.sun;

    // Update sun/moon position
    this.updateSunPosition(this.timeOfDay);

    // Update sun/moon visibility
    const t = this.timeOfDay % 1.0;
    this.sunMesh.visible = t > 0.2 && t < 0.8;
    this.moonMesh.visible = t < 0.25 || t > 0.75;

    // Update light intensity
    const intensity = this.getLightIntensity(this.timeOfDay);
    this.sunLight.intensity = intensity;
  }

  public setTimeSpeed(speed: number): void {
    this.timeSpeed = speed;
  }

  public setTime(time: number): void {
    this.timeOfDay = time % 1.0;
  }
}
