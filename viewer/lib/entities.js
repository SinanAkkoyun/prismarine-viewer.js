const THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')

const Entity = require('./entity/Entity')
const { dispose3 } = require('./dispose')

function getEntityMesh (entity, scene) {
  if (entity.name) {
    try {
        const e = new Entity('1.16.4', entity.name, scene);

        if (entity.username !== undefined) {
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
            const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);

            // Scale sprite to match fixed height and maintain text aspect ratio
            sprite.scale.set(textWidth / fontSize * fixedHeight, fixedHeight, 1);
            sprite.position.y += entity.height + 0.5;

            e.mesh.add(sprite);
        }
        return e.mesh;
    } catch (err) {
        console.log(err);
    }
}








  const geometry = new THREE.BoxGeometry(entity.width, entity.height, entity.width)
  geometry.translate(0, entity.height / 2, 0)
  const material = new THREE.MeshBasicMaterial({ color: 0xff00ff })
  const cube = new THREE.Mesh(geometry, material)
  return cube
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
