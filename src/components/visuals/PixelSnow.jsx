import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import './PixelSnow.css'

const vertexShader = `
  attribute float aSize;
  attribute float aDepth;
  varying float vDepth;
  void main() {
    vDepth = aDepth;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize;
  }
`

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uBrightness;
  uniform float uDepthFade;
  uniform float uVariant;
  varying float vDepth;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float distanceFromCenter = length(point);
    if (uVariant > 0.5 && distanceFromCenter > 0.5) discard;
    float alpha = clamp(1.0 - (vDepth / uDepthFade), 0.12, 1.0) * uBrightness;
    gl_FragColor = vec4(uColor, alpha);
  }
`

export default function PixelSnow({
  color = '#ffffff',
  flakeSize = 0.01,
  minFlakeSize = 1.25,
  pixelResolution = 200,
  speed = 1.25,
  depthFade = 8,
  farPlane = 20,
  brightness = 1,
  gamma = 0.4545,
  density = 0.3,
  variant = 'square',
  direction = 125,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null)
  const colorValue = useMemo(() => new THREE.Color(color), [color])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    camera.position.z = 10
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const geometry = new THREE.BufferGeometry()
    const count = Math.max(40, Math.floor(900 * density))
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const depths = new Float32Array(count)
    const angle = (direction * Math.PI) / 180
    const velocity = new Float32Array(count * 2)

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3
      const depth = Math.random() * farPlane
      depths[index] = depth
      positions[offset] = (Math.random() - 0.5) * 2.2
      positions[offset + 1] = (Math.random() - 0.5) * 2.2
      positions[offset + 2] = depth / farPlane * 8
      sizes[index] = Math.max(minFlakeSize, (1 - depth / farPlane) * flakeSize * pixelResolution)
      velocity[index * 2] = Math.cos(angle) * speed * (1.2 - depth / farPlane) * 0.0007
      velocity[index * 2 + 1] = Math.sin(angle) * speed * (1.2 - depth / farPlane) * 0.0007
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: colorValue.clone() }, uBrightness: { value: brightness }, uDepthFade: { value: depthFade }, uVariant: { value: variant === 'square' ? 0 : 1 }, uGamma: { value: gamma } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
    })
    const snow = new THREE.Points(geometry, material)
    scene.add(snow)

    const resize = () => {
      renderer.setSize(container.offsetWidth, container.offsetHeight)
      camera.left = -container.offsetWidth / container.offsetHeight
      camera.right = container.offsetWidth / container.offsetHeight
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    let animationFrame
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      const position = geometry.attributes.position.array
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3
        position[offset] += velocity[index * 2]
        position[offset + 1] += velocity[index * 2 + 1]
        if (position[offset] > 1.2 || position[offset] < -1.2 || position[offset + 1] > 1.2 || position[offset + 1] < -1.2) {
          position[offset] = (Math.random() - 0.5) * 2.2
          position[offset + 1] = (Math.random() - 0.5) * 2.2
        }
      }
      geometry.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [brightness, colorValue, density, depthFade, direction, farPlane, flakeSize, gamma, minFlakeSize, pixelResolution, speed, variant])

  return <div ref={containerRef} className={`pixel-snow-container ${className}`} style={style} aria-hidden="true" />
}
