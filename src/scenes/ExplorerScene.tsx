import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { Aircraft } from '../three/Aircraft'
import { EXPLORER_FACTS } from '../data/aircraftData'

export type ExplorerView =
  | 'reset'
  | 'front'
  | 'rear'
  | 'side'
  | 'top'
  | 'engine'
  | 'cockpit'

export interface ExplorerSceneProps {
  view: ExplorerView
  gearDown: boolean
  enginesRunning: boolean
  nightMode: boolean
  reducedMotion: boolean
}

const MODEL_SCALE = 0.1

/**
 * Camera keyframes in aircraft-space metres.
 *
 * The model group is offset by MODEL_ORIGIN, so the aircraft centre sits at
 * x = 0 in scene space. Every keyframe below is therefore expressed
 * relative to the aircraft centre: x = 0 is the midpoint of the fuselage.
 */
const CENTRE = 37.68 // half of the 75.36 m length

const VIEWS: Record<ExplorerView, { position: [number, number, number]; target: [number, number, number] }> = {
  // A three-quarter hero framing of the whole aircraft.
  reset: { position: [-4.6, 2.2, 9.6], target: [0, -0.2, 0] },
  // Looking aft at the nose, from ahead of the flight deck.
  front: { position: [-6.4, 0.6, 2.0], target: [-3.2, -0.15, 0] },
  // Looking forward at the tail.
  rear: { position: [6.4, 0.7, 2.2], target: [3.0, -0.1, 0] },
  // Full profile, the "flying pencil" silhouette.
  side: { position: [0, 0.4, 10.4], target: [0, -0.2, 0] },
  // Plan view, showing the full span.
  top: { position: [0, 10.6, 0.01], target: [0, 0, 0] },
  // Close on the outboard engine, at scene (0.13, -0.24, 2.15).
  engine: { position: [-0.75, 0.1, 3.5], target: [0.13, -0.24, 2.15] },
  // Close on the flight deck, at scene x = -3.45.
  cockpit: { position: [-5.0, 0.2, 1.5], target: [-3.45, -0.2, 0] },
}
/**
 * Smoothly flies the camera to the requested view using damped
 * interpolation. The user can still orbit freely at any time.
 */
function CameraDirector({
  view,
  controlsRef,
  reducedMotion,
}: {
  view: ExplorerView
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  reducedMotion: boolean
}) {
  const { camera } = useThree()
  const desired = useMemo(() => new THREE.Vector3(), [])
  const desiredTarget = useMemo(() => new THREE.Vector3(), [])
  const current = useMemo(() => new THREE.Vector3(), [])
  const currentTarget = useMemo(() => new THREE.Vector3(), [])
  const flying = useRef(true)
  const first = useRef(true)

  useEffect(() => {
    const v = VIEWS[view]
    desired.set(v.position[0], v.position[1], v.position[2])
    desiredTarget.set(v.target[0], v.target[1], v.target[2])
    flying.current = true
  }, [view, desired, desiredTarget])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (first.current) {
      camera.position.copy(desired)
      controls.target.copy(desiredTarget)
      controls.update()
      first.current = false
      flying.current = false
      return
    }

    if (!flying.current) return

    const damping = reducedMotion ? 1 : 1 - Math.pow(0.0009, Math.min(delta, 0.05))
    camera.position.lerp(desired, damping)
    current.lerp(desired, damping)
    currentTarget.lerp(desiredTarget, damping)
    controls.target.copy(currentTarget)
    controls.update()

    if (camera.position.distanceTo(desired) < 0.04) flying.current = false
  })

  return null
}

/** Studio environment: three-point lighting, ground and a subtle backdrop. */
function ExplorerEnvironment({ nightMode }: { nightMode: boolean }) {
  const key = useRef<THREE.DirectionalLight>(null)
  const rim = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.HemisphereLight>(null)

  useFrame(() => {
    if (!key.current || !rim.current || !fill.current) return
    if (nightMode) {
      key.current.color.set('#89b4ef')
      key.current.intensity = 1.0
      rim.current.color.set('#5f86c4')
      rim.current.intensity = 1.5
      fill.current.intensity = 0.4
    } else {
      key.current.color.set('#ffffff')
      key.current.intensity = 3.2
      rim.current.color.set('#cfe0f5')
      rim.current.intensity = 0.9
      fill.current.intensity = 0.85
    }
  })

  return (
    <>
      <hemisphereLight
        ref={fill}
        args={[nightMode ? '#1b2c4d' : '#d6e6ff', nightMode ? '#04060c' : '#2c3644', 0.85]}
      />
      <ambientLight intensity={nightMode ? 0.14 : 0.3} color={nightMode ? '#33507f' : '#ffffff'} />
      <directionalLight
        ref={key}
        position={[-30, 45, 35]}
        intensity={3.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0006}
      />
      <directionalLight ref={rim} position={[40, 16, -38]} intensity={nightMode ? 1.5 : 0.9} color={nightMode ? '#5f86c4' : '#cfe0f5'} />
      <directionalLight position={[10, -28, 12]} intensity={0.45} color="#c9d6e8" />

      {/* Ground plane. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.53, 0]} receiveShadow>
        <circleGeometry args={[70, 72]} />
        <meshStandardMaterial
          color={nightMode ? '#070b14' : '#0b101a'}
          roughness={0.58}
          metalness={0.3}
        />
      </mesh>
      <gridHelper
        args={[140, 28, nightMode ? '#1b2a45' : '#25344d', nightMode ? '#0d1522' : '#121a27']}
        position={[0, -0.525, 0]}
      />
    </>
  )
}

export function ExplorerScene({
  view,
  gearDown,
  enginesRunning,
  nightMode,
  reducedMotion,
}: ExplorerSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const [dpr, setDpr] = useState<[number, number]>([1, 1.6])

  useEffect(() => {
    const max = window.devicePixelRatio > 1.5 ? 1.6 : 1.4
    setDpr([1, max])
  }, [])

  return (
    <Canvas
      className="absolute inset-0"
      dpr={dpr}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: nightMode ? 0.9 : 1.12,
      }}
      camera={{ fov: 36, near: 0.1, far: 900, position: [-4.6, 2.2, 9.6] }}
    >
      <color attach="background" args={[nightMode ? '#04060c' : '#0a0e16']} />
      <fog attach="fog" args={[nightMode ? '#04060c' : '#080b12', 30, 120]} />

      <ExplorerEnvironment nightMode={nightMode} />

      {/* The model is authored with the nose at x = 0; shift it so the
          aircraft is centred on the origin in scene space. */}
      <group position={[-CENTRE * MODEL_SCALE, 0, 0]}>
        <Aircraft
          scale={MODEL_SCALE}
          gearDown={gearDown}
          enginesRunning={enginesRunning}
          nightMode={nightMode}
          castShadows
        />
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.85}
        zoomSpeed={0.9}
        panSpeed={0.7}
        minDistance={0.9}
        maxDistance={40}
        maxPolarAngle={Math.PI * 0.94}
        target={[0, 0, 0]}
      />

      <CameraDirector view={view} controlsRef={controlsRef} reducedMotion={reducedMotion} />
    </Canvas>
  )
}

export { VIEWS as EXPLORER_VIEWS, EXPLORER_FACTS }







