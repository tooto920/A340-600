import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Atmospheric cloud volume.
 *
 * Built from layered, soft-edged billboard sprites scattered in a slab
 * around the aircraft. Each sprite is an additive-ish soft disc rendered
 * with a procedurally generated radial-gradient texture, so the result reads
 * as volumetric haze without a costly volumetric pass.
 */

interface CloudLayerProps {
  count: number
  /** Radius of the scattered volume. */
  radius: number
  /** Vertical spread. */
  height: number
  /** Base opacity per sprite. */
  opacity: number
  /** Sprite radius in world units. */
  size: number
  /** Warm sunset tint. */
  warm?: boolean
  /** Slow drift speed. */
  speed?: number
  seed?: number
}

/** Deterministic pseudo-random so the sky is identical on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Builds a soft radial-gradient sprite texture. */
function makeSoftTexture(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.32)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function CloudLayer({
  count,
  radius,
  height,
  opacity,
  size,
  warm = false,
  speed = 1,
  seed = 7,
}: CloudLayerProps) {
  const group = useRef<THREE.Group>(null)
  const texture = useMemo(() => makeSoftTexture(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const sprites = useMemo(() => {
    const rand = mulberry32(seed)
    const list: {
      position: [number, number, number]
      scale: number
      rotation: number
      opacity: number
    }[] = []
    for (let i = 0; i < count; i++) {
      // Cluster the clouds along a band so the aircraft appears to emerge
      // from a horizontal cloud deck rather than a uniform fog.
      const band = (rand() - 0.5) * height
      const angle = rand() * Math.PI * 2
      const r = radius * (0.25 + Math.pow(rand(), 0.6) * 0.75)
      list.push({
        position: [Math.cos(angle) * r, band, Math.sin(angle) * r],
        scale: size * (0.6 + rand() * 0.9),
        rotation: rand() * Math.PI,
        opacity: opacity * (0.5 + rand() * 0.5),
      })
    }
    return list
  }, [count, radius, height, opacity, size, seed])

  // Per-instance colour carries the per-sprite opacity, so the whole cloud
  // deck is a single instanced draw call.
  const colors = useMemo(() => {
    const base = new THREE.Color(warm ? '#ffb887' : '#c9d6e8')
    const arr = new Float32Array(sprites.length * 3)
    sprites.forEach((s, i) => {
      const k = s.opacity / Math.max(opacity, 0.0001)
      arr[i * 3] = base.r * k
      arr[i * 3 + 1] = base.g * k
      arr[i * 3 + 2] = base.b * k
    })
    return arr
  }, [sprites, opacity, warm])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    group.current.position.x = Math.sin(t * 0.012 * speed) * radius * 0.05
    group.current.position.y = Math.cos(t * 0.009 * speed) * 2
  })

  return (
    <group ref={group}>
      <instancedMesh
        ref={(el) => {
          if (!el) return
          sprites.forEach((s, i) => {
            dummy.position.set(s.position[0], s.position[1], s.position[2])
            dummy.rotation.set(0, 0, s.rotation)
            dummy.scale.set(s.scale, s.scale * 0.62, 1)
            dummy.updateMatrix()
            el.setMatrixAt(i, dummy.matrix)
          })
          el.instanceMatrix.needsUpdate = true
          el.computeBoundingSphere()
        }}
        args={[undefined, undefined, sprites.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
        <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
      </instancedMesh>
    </group>
  )
}

/**
 * Fine airborne particles that catch the light. Gives the air itself a
 */
export function ParticleField({
  count = 900,
  radius = 120,
  size = 0.28,
  color = '#bcd8f5',
  speed = 1,
}: {
  count?: number
  radius?: number
  size?: number
  color?: string
  speed?: number
}) {
  const points = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const rand = mulberry32(1337)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2
      const r = radius * Math.pow(rand(), 0.5)
      positions[i * 3] = Math.cos(angle) * r
      positions[i * 3 + 1] = (rand() - 0.5) * radius * 0.7
      positions[i * 3 + 2] = Math.sin(angle) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count, radius])

  useFrame((state) => {
    if (!points.current) return
    const t = state.clock.elapsedTime
    points.current.rotation.y = t * 0.006 * speed
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

/**
 * A large gradient dome that acts as the sky. The colours are driven by the
 * chapter so the scene can shift from cold blue to a warm sunset.
 */
export function SkyDome({
  top = '#050912',
  middle = '#0a1c3d',
  bottom = '#132a4f',
}: {
  top?: string
  middle?: string
  bottom?: string
}) {
  const uniforms = useMemo(
    () => ({
      topColor: { value: new THREE.Color(top) },
      middleColor: { value: new THREE.Color(middle) },
      bottomColor: { value: new THREE.Color(bottom) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    uniforms.topColor.value.set(top)
    uniforms.middleColor.value.set(middle)
    uniforms.bottomColor.value.set(bottom)
  }, [top, middle, bottom, uniforms])

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[600, 32, 24]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 topColor;
          uniform vec3 middleColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            vec3 color = h > 0.0
              ? mix(middleColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55))
              : mix(middleColor, bottomColor, pow(clamp(-h, 0.0, 1.0), 0.45));
            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  )
}

