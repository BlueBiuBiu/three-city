import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { City } from '../utils/city'
import { getAssetsFile } from '../utils/path'

/**
 * 加载场景
 * @param container DOM节点
 * @returns scene 场景 camera 相机
 */
export function initScene(container: Element) {
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000)
  camera.position.set(100, 1000, 1500)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  const renderer = new THREE.WebGLRenderer()
  renderer.setSize(window.innerWidth, window.innerHeight)
  container?.append(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true // 惯性
  controls.enablePan = true // 右键拖动
  controls.minDistance = 100
  controls.maxDistance = 2000

  const ambientLight = new THREE.AmbientLight(0xadadad)
  const directLight = new THREE.DirectionalLight(0xffffff)

  const city = new City(scene, camera, controls)

  scene.add(ambientLight)
  scene.add(directLight)

  const clock = new THREE.Clock();
  const animation = () => {
    controls.update()
    city.refresh(clock.getDelta())
    renderer.render(scene, camera)
    requestAnimationFrame(animation)
  }
  animation()

  window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  return { scene, camera }
}

/**
 * 加载模型
 * @param name 模型名字
 * @returns
 */
export function initModel(name: string) {
  const loader = new FBXLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      getAssetsFile(name),
      (object: any) => {
        resolve(object)
      },
      () => {},
      (error) => {
        reject(error)
      }
    )
  })
}

/**
 * 加载天空盒
 * @param imageUrl 球体半径，默认为1
 * @param radius 球体半径，默认为1
 * @param widthSegments 水平分段数，默认值为32
 * @param heightSegments 垂直分段数，默认值为16
 * @returns box 天空盒对象
 */
export function initSkyBox(imageUrl: string, radius = 1, widthSegments = 32, heightSegments = 16) {
  const boxGeometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  const boxMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: new THREE.TextureLoader().load(getAssetsFile(imageUrl))
  })
  const box = new THREE.Mesh(boxGeometry, boxMaterial)

  return box
}
