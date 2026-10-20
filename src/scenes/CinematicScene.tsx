import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Aircraft } from '../three/Aircraft'
import { CloudLayer, ParticleField, SkyDome } from '../three/Atmosphere'

export interface CinematicSceneProps {
  /** Scroll progress across the whole story, 0..1. */
  progress: number
  /** Mouse position in normalised device coords, for parallax. */
  pointer: { x: number; y: number }
  /** Enable the engine fans. */
  enginesRunning?: boolean
  /** Reduced-motion mode snaps the camera instead of flying. */
  reducedMotion?: boolean
}

/** Model scale: the aircraft is authored in metres, the scene works in units. */
const MODEL_SCALE = 0.1
/** Half the fuselage length, so the aircraft is centred on the origin. */
const CENTRE = 37.68

/**
 * Camera keyframes for the six chapters, in scene units.
 *
 * The aircraft is centred on the origin, so these are offsets from the
 * centre of the airframe rather than from the nose.
 */
const CAMERA_PATH: { position: THREE.Vector3; target: THREE.Vector3 }[] = [
  // I Ă˘â‚¬â€ť The Legend: a wide three-quarter establishing shot.
  { position: new THREE.Vector3(-14, 2, 17), target: new THREE.Vector3(0, 2.2, 0) },
  // II Ă˘â‚¬â€ť The Flying Pencil: a low, close pass along the fuselage.
  { position: new THREE.Vector3(-26, 0.5, 9), target: new THREE.Vector3(6, 1.6, 0) },
  // III Ă˘â‚¬â€ť Power of Four: in on the wing and the engines.
  { position: new THREE.Vector3(6, -1, 15), target: new THREE.Vector3(6, -1.2, 8) },
  // IV Ă˘â‚¬â€ť Engineering Masterpiece: the flight deck and the nose.
  { position: new THREE.Vector3(-27, 1.5, 6.5), target: new THREE.Vector3(-31, 0.4, 0) },
  // V Ă˘â‚¬â€ť Long Haul Excellence: a high three-quarter that shows the whole span.
  { position: new THREE.Vector3(-13, 12, 27), target: new THREE.Vector3(0, 2, 0) },
  // VI Ă˘â‚¬â€ť The Final Horizon: the aircraft departs into the distance.
  { position: new THREE.Vector3(-17, 7, 30), target: new THREE.Vector3(9, 2.5, 0) },
]

function CameraRig({
  progress,
  pointer,
  reducedMotion,
}: {
  progress: number
  pointer: { x: number; y: number }
  reducedMotion: boolean
}) {
  const { camera } = useThree()
  const smoothed = useMemo(() => new THREE.Vector3(), [])
  const smoothedTarget = useMemo(() => new THREE.Vector3(), [])
  const lookAt = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])
  const initialised = useRef(false)

  useFrame((_, delta) => {
    const n = CAMERA_PATH.length - 1
    const t = THREE.MathUtils.clamp(progress, 0, 1) * n
    const i = Math.min(Math.floor(t), n - 1)
    const f = t - i

    const a = CAMERA_PATH[i]
    const b = CAMERA_PATH[i + 1]
    // Smoothstep between keyframes so the flight path has no hard corners.
    const s = f * f * (3 - 2 * f)
    desired.copy(a.position).lerp(b.position, s)
    desiredTarget.copy(a.target).lerp(b.target, s)

    if (!initialised.current) {
      smoothed.copy(desired)
      smoothedTarget.copy(desiredTarget)
      initialised.current = true
    }

    // Mouse parallax, damped so it never feels twitchy.
    const parallax = reducedMotion ? 0 : 1
    desired.x += pointer.x * 2.4 * parallax
    desired.y += pointer.y * 1.5 * parallax

    const damping = 1 - Math.pow(0.0015, Math.min(delta, 0.05))
    smoothed.lerp(desired, damping)
    smoothedTarget.lerp(desiredTarget, damping)

    camera.position.copy(smoothed)
    lookAt.copy(smoothedTarget)
    camera.lookAt(lookAt)
  })

  return null
}

/**
 * The aircraft, with a slow idle drift and a subtle bank so it reads as
 * airborne rather than parked in a void.
 */
function FlyingAircraft({ enginesRunning, reducedMotion }: { enginesRunning: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!group.current || !inner.current) return
    const t = state.clock.elapsedTime
    const d = Math.min(delta, 0.05)
    // Gentle float and roll, as if riding in the upper troposphere.
    inner.current.position.y = Math.sin(t * 0.35) * 0.1
    inner.current.rotation.z = THREE.MathUtils.degToRad(2.4) + Math.sin(t * 0.28) * 0.018
    inner.current.rotation.x = Math.sin(t * 0.21) * 0.01
    if (!reducedMotion) {
      group.current.position.x += d * 0.4
      // Keep the aircraft centred in the world without fighting the camera.
      if (group.current.position.x > 70) group.current.position.x -= 140
    }
  })

  return (
    <group ref={group}>
      <group ref={inner} position={[-CENTRE * MODEL_SCALE, -1.6, 0]}>
        <Aircraft scale={MODEL_SCALE} enginesRunning={enginesRunning} gearDown={false} castShadows />
      </group>
    </group>
  )
}

/**
 * Chapter-driven lighting. The atmosphere shifts from cold blue night to a
 * warm sunset across the story.
 */
function ChapterLighting({ progress }: { progress: number }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    const warm = THREE.MathUtils.clamp((progress - 0.66) / 0.34, 0, 1)

    if (key.current) {
      key.current.color.setRGB(
        THREE.MathUtils.lerp(0.86, 1.0, warm),
        THREE.MathUtils.lerp(0.93, 0.8, warm),
        THREE.MathUtils.lerp(1.0, 0.62, warm),
      )
      key.current.intensity = THREE.MathUtils.lerp(3.1, 4.2, warm)
      key.current.position.set(-50 + warm * 90, 70, 45 - warm * 20)
    }
    if (rim.current) {
      rim.current.color.setRGB(1, THREE.MathUtils.lerp(0.78, 0.58, warm), THREE.MathUtils.lerp(0.58, 0.36, warm))
      rim.current.intensity = THREE.MathUtils.lerp(2.0, 3.2, warm)
    }
    if (fill.current) {
      fill.current.intensity = THREE.MathUtils.lerp(0.7, 0.95, warm)
    }
  })

  return (
    <>
      <hemisphereLight ref={fill} args={['#a8ccf5', '#070b14', 0.75]} />
      <directionalLight
        ref={key}
        position={[-50, 70, 45]}
        intensity={3.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />
      <directionalLight ref={rim} position={[70, 14, -55]} intensity={2.0} color="#ffb46a" />
      <ambientLight intensity={0.18} color="#5b7fb8" />
    </>
  )
}

/**
 * Publishes live render statistics on `window.__a340Stats` so the performance
 * of the scene can be measured from a browser rather than guessed.
 */
function RenderStats() {
  const { gl } = useThree()
  useFrame(() => {
    const info = gl.info
    ;(window as unknown as { __a340Stats?: unknown }).__a340Stats = {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      pixelRatio: gl.getPixelRatio(),
    }
  })
  return null
}

export function CinematicScene({
  progress,
  pointer,
  enginesRunning = true,
  reducedMotion = false,
}: CinematicSceneProps) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.75])

  useEffect(() => {
    // Cap the pixel ratio: high-DPI displays do not need 3x for this scene.
    const max = window.devicePixelRatio > 1.5 ? 1.75 : 1.5
    setDpr([1, max])
  }, [])

  const warm = progress > 0.7

  return (
    <Canvas
      className="absolute inset-0"
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      camera={{ fov: 34, near: 0.1, far: 1200, position: [-1.4, 0.2, 1.7] }}
      shadows
    >
      <color attach="background" args={['#05070c']} />

      <SkyDome
        top={warm ? '#1d1526' : '#050912'}
        middle={warm ? '#31253c' : '#0c1f42'}
        bottom={warm ? '#9a5230' : '#16325c'}
      />

      <ChapterLighting progress={progress} />
      <FlyingAircraft enginesRunning={enginesRunning} reducedMotion={reducedMotion} />

      <CloudLayer count={70} radius={95} height={50} opacity={0.15} size={32} warm={warm} seed={11} />
      <CloudLayer count={40} radius={58} height={28} opacity={0.2} size={21} warm={warm} seed={29} speed={1.4} />
      <CloudLayer count={26} radius={160} height={74} opacity={0.09} size={50} warm={warm} seed={47} speed={0.6} />

      <ParticleField count={800} radius={115} size={0.22} speed={1} />

      <CameraRig progress={progress} pointer={pointer} reducedMotion={reducedMotion} />
      <RenderStats />
    </Canvas>
  )
}

export { MODEL_SCALE, CENTRE }






