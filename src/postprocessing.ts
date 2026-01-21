import * as THREE from 'three';
import { EffectComposer } from 'three-stdlib';
import { RenderPass } from 'three-stdlib';
import { UnrealBloomPass } from 'three-stdlib';
import { ShaderPass } from 'three-stdlib';
import { FXAAShader } from 'three-stdlib';

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private fxaaPass: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    // Create composer
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);

    // Add render pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Add bloom pass for glowing effects
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,  // strength
      0.4,  // radius
      0.85  // threshold
    );
    this.composer.addPass(this.bloomPass);

    // Add FXAA anti-aliasing pass
    this.fxaaPass = new ShaderPass(FXAAShader);
    const pixelRatio = renderer.getPixelRatio();
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (window.innerWidth * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (window.innerHeight * pixelRatio);
    this.composer.addPass(this.fxaaPass);
  }

  public render(): void {
    this.composer.render();
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    this.composer.setSize(width, height);
    this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
    this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
  }

  public setBloomStrength(strength: number): void {
    this.bloomPass.strength = strength;
  }
}
