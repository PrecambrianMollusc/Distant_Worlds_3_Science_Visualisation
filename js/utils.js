import * as THREE from './three.module.js';

export function focusCameraOnObject(camera, controls, object, padding = 1.5) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);

  controls.target.copy(center);
  controls.update();

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  cameraZ *= padding;
  camera.position.set(center.x, center.y, center.z + cameraZ);
  camera.lookAt(center);
}

export function setPointSize(group, size) {
  group.traverse(obj => {
    if (obj.isPoints) {
      obj.material.size = size;
      obj.material.needsUpdate = true;
    }
  });
}

export function applyPointMaterialSettings(group, sprite) {
  group.traverse((obj) => {
    if (obj.isPoints) {
      obj.material.map = sprite;
      obj.material.size = 5.0;
      obj.material.opacity = 0.5;
      obj.material.transparent = true;
      obj.material.depthWrite = false;
      obj.material.blending = THREE.AdditiveBlending;
      obj.material.emissiveIntensity = 0.5;
      obj.material.needsUpdate = true;
    }
  });
}

export function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.font = 'Bold 48px Arial';
  context.fillStyle = 'rgba(255,255,255,0.8)';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(150, 50, 1);
  return sprite;
}

export function createStarCloudMaterial(camera, options = {}) {
  const {
    sizeNear = 6.0,
    sizeFar = 0.05,
    opacityNear = 0.7,
    opacityFar = 0.02,
    biasPower = 1.5
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uSizeNear: { value: sizeNear },
      uSizeFar: { value: sizeFar },
      uOpacityNear: { value: opacityNear },
      uOpacityFar: { value: opacityFar },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uBiasPower: { value: biasPower }
    },
    vertexShader: `
      uniform float uSizeNear;
      uniform float uSizeFar;
      uniform float uNear;
      uniform float uFar;
      uniform float uBiasPower;
      varying float vBiasT;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float dist = -mvPosition.z;
        float logNear = log(uNear + 1.0);
        float logFar  = log(uFar + 1.0);
        float logDist = log(dist + 1.0);
        float t = clamp((logDist - logNear) / (logFar - logNear), 0.0, 1.0);
        float biasedT = 1.0 - pow(1.0 - t, uBiasPower);
        vBiasT = biasedT;
        float size = mix(uSizeFar, uSizeNear, 1.0 - biasedT);
        gl_PointSize = clamp(size, 1.0, 20.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacityNear;
      uniform float uOpacityFar;
      varying float vBiasT;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        if (dot(cxy, cxy) > 1.0) discard;
        float alpha = mix(uOpacityFar, uOpacityNear, 1.0 - vBiasT);
        gl_FragColor = vec4(1.0, 0.65, 0.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}
