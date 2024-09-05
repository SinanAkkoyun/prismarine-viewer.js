const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')

const { loadTexture } = globalThis.isElectron ? require('./utils.electron.js') : require('./utils')

function getEntityMesh (entity, scene) {
  if (entity.name) {
    try {
        const e = new Entity('1.16.4', entity.name, scene);

        if (entity.username !== undefined) {
            createNametag(entity, e.mesh);
        }

        // Entity invisible or marker armor stand
        if ((entity.metadata[0] & 0x20) !== 0 || (entity.metadata[15] & 0x10) !== 0) { // armorstand index for version 1.8 is 10 apparently...
          e.mesh.traverse(child => {
              if (child instanceof THREE.Mesh) {
                  child.material.transparent = true;
                  child.material.opacity = 0.3;
              }
          });
        } else {
          // Add dynamic drop shadow
          addDynamicShadow(e.mesh, scene, '1.16.4');
        }

        return e.mesh;
    } catch (err) {
        console.log(err);
    }
  }
  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0x300030 })
  const cube = new THREE.Mesh(geometry, material)
  return cube
}


function createNametag(entity, mesh) {
  const fixedHeight = 0.25; // Fixed height of the sprite
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Disabling anti-aliasing
  ctx.imageSmoothingEnabled = false;

  // Determine the font size for high resolution
  const fontSize = 200; // High initial font size for better clarity
  ctx.font = `${fontSize}px 'Minecraft', Arial`;

  // Calculate text width with high-resolution font size
  let textWidth = ctx.measureText(entity.username).width;

  // Set canvas dimensions large enough for high-res rendering
  canvas.width = textWidth + 25; // Ensure there's padding to avoid cutting off text
  canvas.height = fontSize; // Height as the font size for 1:1 text block

  // Apply a semi-transparent black background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Slightly transparent black background
  ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas

  // Reapply the font settings as resizing canvas resets the context
  ctx.font = `${fontSize}px 'Minecraft', Arial`;
  ctx.fillStyle = '#FFFFFF'; // Text color set to white for contrast
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; // Vertical alignment

  // Draw the text centered
  ctx.fillText(entity.username, canvas.width / 2, canvas.height / 2);

  // Update texture for high resolution
  const tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);

  // Scale sprite to match fixed height and maintain text aspect ratio
  sprite.scale.set(textWidth / fontSize * fixedHeight, fixedHeight, 1);
  sprite.position.y += entity.height + 0.5;

  mesh.add(sprite);
}


function addDynamicShadow(mesh, scene, version) {
  const shadowGeo = new THREE.PlaneBufferGeometry(1, 1);
  const shadowMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    opacity: 0.3
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.01;

  loadTexture(`textures/${version}/misc/shadow.png`, (texture) => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.flipY = false;
    shadowMat.map = texture;
    shadowMat.needsUpdate = true;
  });

  mesh.add(shadowMesh);

  shadowMesh.position.y = mesh.position.y + 0.01;
  /*
  // Delay raycasting to ensure all terrain is loaded
  setTimeout(() => {
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    raycaster.set(new THREE.Vector3(mesh.position.x, mesh.position.y + 1, mesh.position.z), down);
    
    shadowMesh.position.y = mesh.position.y + 1;

    const intersects = raycaster.intersectObjects(scene.children, true);
    const validIntersects = intersects.filter(intersect => intersect.object !== mesh && intersect.object !== shadowMesh);
    if (validIntersects.length > 0) {
      const closest = validIntersects[0];
      shadowMesh.position.y = closest.point.y + 0.1;
    } else {
      // No valid intersection found, adjust as necessary
       // Example fallback position
    }
  }, 60); // Adjust delay as necessary based on your scene's load time
  */
}

class Entities {
  constructor (scene) {
    this.scene = scene
    this.entities = {}
  }

  clear () {
    for (const mesh of Object.values(this.entities)) {
      this.scene.remove(mesh)
      dispose3(mesh)
    }
    this.entities = {}
  }

  update (entity) {
    if (!this.entities[entity.id]) {
      const mesh = getEntityMesh(entity, this.scene)
      if (!mesh) return
      this.entities[entity.id] = mesh
      this.scene.add(mesh)
    }

    const e = this.entities[entity.id]

    if (entity.delete) {
      this.scene.remove(e)
      dispose3(e)
      delete this.entities[entity.id]
    }

    if (entity.pos) {
      new TWEEN.Tween(e.position).to({ x: entity.pos.x, y: entity.pos.y, z: entity.pos.z }, 50).start()
    }
    if (entity.yaw) {
      const da = (entity.yaw - e.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(e.rotation).to({ y: e.rotation.y + dy }, 50).start()
    }
  }
}

module.exports = { Entities }
