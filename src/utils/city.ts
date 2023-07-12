import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { initModel } from '@/hooks/initForThree'
import { color } from '@/config'

export class City {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private controls: any
  private tweenPosition: any
  private tweenRotation: any
  private group: THREE.Group
  private height: { value: number }
  private time: { value: number }

  constructor(scene: THREE.Scene, camera: THREE.Camera, controls: any) {
    this.scene = scene
    this.camera = camera
    this.controls = controls
    this.group = new THREE.Group()
    this.height = {
      value: 5
    }
    this.time = {
      value: 0
    }

    this.loadCityModel()
  }

  // 计算边界框，才能正确取值
  computeMesh(child: any) {
    child.geometry.computeBoundingBox() // 计算几何体的边界框（bounding box)
    const { max, min } = child.geometry.boundingBox
    return { max, min }
  }

  // 创建线框
  createLineMesh(child: any) {
    const { max, min } = this.computeMesh(child)

    const edges = new THREE.EdgesGeometry(child.geometry)

    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_line_color: {
          value: new THREE.Color(color.soundLine)
        },
        u_scan_color: {
          value: new THREE.Color(color.liveColor)
        },
        u_time: this.time,
        u_max_x: {
          value: max.x
        },
        u_min_x: {
          value: min.x
        }
      },

      vertexShader: `
        varying vec3 v_color;
        uniform vec3 u_line_color;
        uniform vec3 u_scan_color;
        uniform float u_max_x;
        uniform float u_min_x;
        uniform float u_time;

        void main() {
          float new_time = mod(u_time * 0.1, 1.0);
          float rangeX = mix(u_min_x, u_max_x, new_time);
          if (rangeX > position.x - 200.0 && rangeX < position.x) {
            float f_index = 1.0 - sin((position.x - rangeX) / 200.0 * 3.14);
            float r = mix(u_scan_color.r, u_line_color.r, f_index);
            float g = mix(u_scan_color.g, u_line_color.g, f_index);
            float b = mix(u_scan_color.b, u_line_color.b, f_index);
            
            v_color = vec3(r,g,b);
          } else {
            v_color = u_line_color;
          }

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 v_color;

        void main() {
          gl_FragColor = vec4(v_color,1.0);
        }
      `
    })
    const line = new THREE.LineSegments(edges, lineMaterial)

    line.position.copy(child.position)
    line.rotation.copy(child.rotation)
    line.scale.copy(child.scale)
    line.quaternion.copy(child.quaternion)

    this.scene.add(line)
  }

  // 创建雷达
  createRader() {
    const radius = 50.0
    const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, 1, 1)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_rader_color: {
          value: new THREE.Color(color.radarColor)
        },
        u_time: this.time,
        u_radius: {
          value: radius
        }
      },
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 v_position;

        void main() {
          v_position = vec2(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 v_position;
        uniform vec3 u_rader_color;
        uniform float u_time;
        uniform float u_radius;

        void main() {
          float angle = atan(v_position.x, v_position.y);
          float new_angle = mod(angle + u_time, 3.1414926 * 2.0);

          float dis = distance(vec2(0.0,0.0), v_position); // 计算距离
          float borderWidth = 2.0; // 外层圆环宽度
          float f_opacity = 0.0;

          // 在圆环上
          if(dis > u_radius - borderWidth) {
            f_opacity = 1.0;
          }

          // 雷达扫描的显示
          if(dis < u_radius - borderWidth) {
            f_opacity = 1.0 - new_angle;
          }

          // 圆环之外
          if(dis > u_radius) {
            f_opacity = 0.0;
          }

          gl_FragColor = vec4(u_rader_color,f_opacity);
        }
      `
    })
    const rader = new THREE.Mesh(geometry, material)
    rader.position.set(100,0,0)
    rader.rotateX(Math.PI / 2)
    this.scene.add(rader)
  }

  // 加载模型
  async loadCityModel() {
    const object: any = await initModel('../assets/models/beijing.fbx')
    object.traverse((child: any) => {
      if (child.isMesh) {
        const { max, min } = this.computeMesh(child)
        const height_difference = max.z - min.z // 获取模型的高度差
        this.createLineMesh(child) // 创建线框

        const material = new THREE.ShaderMaterial({
          uniforms: {
            u_city_color: {
              value: new THREE.Color(color.mesh)
            },
            u_head_color: {
              value: new THREE.Color(color.head)
            },
            f_size: {
              value: height_difference
            },
            u_rise_color: {
              value: new THREE.Color(color.risingColor)
            },
            u_current_height: this.height
          },
          vertexShader: `
            varying vec3 v_position;

            void main() {
              v_position = position;

              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec3 v_position;
            uniform vec3 u_city_color;
            uniform vec3 u_head_color;
            uniform float f_size;

            uniform vec3 u_rise_color;
            uniform float u_current_height;

            void main() {
              // 建筑整体随高度变化
              vec3 mix_color = mix(u_city_color,u_head_color,v_position.z / f_size);

              // 建筑环线上升高度的宽度
              if(u_current_height > v_position.z && u_current_height < v_position.z + 6.0) {
                float f_index = (u_current_height - v_position.z) / 3.0;
                mix_color = mix(u_rise_color, mix_color, abs(f_index - 1.0)); // 高度差值映射到 [0, 1] 的范围内
              }

              gl_FragColor = vec4(mix_color,1.0);
            }
          `
        })
        const mesh = new THREE.Mesh(child.geometry, material)

        mesh.position.copy(child.position)
        mesh.rotation.copy(child.rotation)
        mesh.scale.copy(child.scale)
        this.group.add(mesh)
      }
    })
    this.scene.add(this.group)
    this.jumpMoveOrClick()
    this.createRader()
  }

  // 区分拖动视角与点击物品
  jumpMoveOrClick() {
    let flag = true
    document.onmousedown = () => {
      flag = true
      document.onmousemove = () => {
        flag = false
      }
    }
    document.onmouseup = (e) => {
      if (flag) {
        this.clickEvent(e)
      }
    }
  }

  // 点击事件
  clickEvent = (e: MouseEvent) => {
    const mouse = new THREE.Vector2()
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObjects(this.group.children, true)

    const point3d = intersects[0]
    console.log(point3d)

    const proportion = 1.5 // 观看距离比例
    if (point3d) {
      this.tweenPosition = new TWEEN.Tween(this.camera.position)
        .to(
          {
            x: point3d.point.x * proportion,
            y: point3d.point.y * proportion * 1.5,
            z: point3d.point.z * proportion
          },
          1000
        )
        .start()
      // 对焦到目标位置
      this.camera.lookAt(point3d.point)
    }
  }

  // 实时刷新
  refresh(delta: number) {
    if (this.tweenPosition) {
      this.tweenPosition.update()
    }

    this.time.value += delta

    // 建筑环线上升高度变化
    this.height.value += 0.4
    if (this.height.value > 200) {
      this.height.value = 0
    }
  }
}
