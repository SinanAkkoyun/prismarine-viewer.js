/* global THREE */

global.THREE = require('three')
const TWEEN = require('@tweenjs/tween.js')
require('three/examples/js/controls/OrbitControls')

const { ViewportGizmo } = require('three-viewport-gizmo')

const { Viewer, Entity } = require('../viewer')

const io = require('socket.io-client')
const socket = io()

// Assume Minecraft font is available under public/fonts/
const minecraftFont = new FontFace('Minecraft', 'url(fonts/Minecraft-Regular.otf)');
minecraftFont.load().then(function(loadedFont) {
  document.fonts.add(loadedFont);
  console.log('Minecraft font loaded and added to document.');

  // Now that the font is loaded, start the main part of the application
  initializeApp();
}).catch(function(error) {
  console.error('Failed to load Minecraft font:', error);
})


let firstPositionUpdate = true

const renderer = new THREE.WebGLRenderer()
renderer.setPixelRatio(window.devicePixelRatio || 1)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const viewer = new Viewer(renderer)

const container = document.body
const viewportGizmo = new ViewportGizmo(viewer.camera, renderer, {container})

// Blender controls
let controls = new THREE.OrbitControls(viewer.camera, renderer.domElement)
controls.mouseButtons = {
  LEFT: null, // THREE.MOUSE.RIGHT, // Swapped as an example if needed
  MIDDLE: THREE.MOUSE.ROTATE,
  RIGHT: null // THREE.MOUSE.PAN
};
function updateControlBindings() {
  if (controls && controls.domElement) {
    controls.domElement.addEventListener('mousedown', function(event) {
      if (event.button === 1) {
        if (event.shiftKey) {
          controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
        } else {
          controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
        }
      }
    })

    controls.domElement.addEventListener('mouseup', function(event) {
      controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
    })
  }
}
updateControlBindings()

viewportGizmo.addEventListener("start", () => (controls.enabled = false));
viewportGizmo.addEventListener("end", () => (controls.enabled = true));

controls.addEventListener("change", () => {
  viewportGizmo.target = controls.target
  viewportGizmo.update();
})



function animate () {

  window.requestAnimationFrame(animate)
  if (controls) controls.update()
  viewer.update()
  renderer.render(viewer.scene, viewer.camera)

  viewportGizmo.render()
}
animate()

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  viewer.camera.aspect = window.innerWidth / window.innerHeight
  viewer.camera.updateProjectionMatrix()
})

socket.on('version', (version) => {
  if (!viewer.setVersion(version)) {
    return false
  }

  firstPositionUpdate = true
  viewer.listen(socket)

  let botMesh
  socket.on('position', ({ pos, addMesh, yaw, pitch, focus, entity }) => {
    if (yaw !== undefined && pitch !== undefined) {
      if (controls) {
        controls.dispose()
        controls = null
      }
      viewer.setFirstPersonCamera(pos, yaw, pitch)
      return
    }
    if (pos.y > 0 && firstPositionUpdate) {
      controls.target.set(pos.x, pos.y, pos.z)
      viewer.camera.position.set(pos.x, pos.y + 20, pos.z + 20)
      controls.update()
      firstPositionUpdate = false
    }
    if (addMesh) {
      if (!botMesh) {
        viewer.entities.update(entity)

        botMesh = viewer.entities.entities[entity.id]// new Entity('1.16.4', 'player', viewer.scene).mesh
        viewer.scene.add(botMesh)
      }
      new TWEEN.Tween(botMesh.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()

      const da = (yaw - botMesh.rotation.y) % (Math.PI * 2)
      const dy = 2 * da % (Math.PI * 2) - da
      new TWEEN.Tween(botMesh.rotation).to({ y: botMesh.rotation.y + dy }, 50).start()
    }
  })

  socket.on('focusPoint', (pos) => {
    viewer.focusOnPosition(pos, controls)
  })
})
