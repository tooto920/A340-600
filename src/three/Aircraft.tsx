import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  buildFuselage,
  buildHorizontalSurface,
  buildLathe,
  buildCockpitGlass,
  buildDoorBand,
  buildWindowBand,
  buildTyre,
  buildVerticalSurface,
  buildFanDisc,
  buildPylon,
  FUSELAGE_STATIONS,
  type HorizontalStation,
  type LiveryBands,
  type VerticalStation,
} from './aircraftGeometry'
import {
  AIRCRAFT,
  CABIN,
  ENGINES,
  GEAR,
  LIVERY,
  nacelleYAt,
  TAIL,
  WING,
} from './aircraftDimensions'
import { createTextTexture } from './textTexture'

export interface AircraftProps {
  /** Show the landing gear. */
  gearDown?: boolean
  /** Master switch for the engine fan rotation. */
  enginesRunning?: boolean
  /** Rotation speed multiplier for the fans. */
  fanSpeed?: number
  /** Cabin windows glow at night. */
  nightMode?: boolean
  /** Registration painted on the fin. */
  registration?: string
  /** Uniform scale applied to the group (the model is authored in metres). */
  scale?: number
  /** Enable shadow casting. */
  castShadows?: boolean
}

/* ------------------------------------------------------------------ *
 * Surface definitions
 * ------------------------------------------------------------------ */

/**
 * Wing planform. The A340 wing has a straight inboard leading edge, a
 * trailing-edge kink at the inboard engine, then a straight outboard panel
 * and a swept winglet. The leading edge is swept 32.5 deg at quarter
 * chord, which the planform reproduces directly.
 */
function wingStations(): HorizontalStation[] {
  const s = WING.semiSpan
  const kink = WING.kinkAt
  const sweepRad = (AIRCRAFT.wingSweep * Math.PI) / 180
  const dihedralRad = (WING.dihedral * Math.PI) / 180

  // Leading edge: straight inboard, then swept outboard.
  const leAt = (span: number) =>
    WING.rootLeadingEdge + span * Math.tan(sweepRad)

  // Trailing edge: a kink at the inboard engine pylon, then a taper.
  const teAt = (span: number) => {
    const kinkTE = WING.rootLeadingEdge + WING.rootChord
    if (span <= kink) {
      // Trailing edge sweeps aft slightly inboard of the kink.
      return kinkTE + span * 0.06
    }
    const kinkLE = leAt(kink)
    const tipTE = leAt(s) + WING.tipChord
    const t = (span - kink) / (s - kink)
    return kinkLE + WING.rootChord * 0.86 + (tipTE - (kinkLE + WING.rootChord * 0.86)) * t
  }

  const spans = [0, 2.2, 4.6, 7.2, 9.6, kink, 15.6, 19.6, 23.4, 26.8, 29.4, s]
  return spans.map((span) => {
    const le = leAt(span)
    const te = teAt(span)
    const k = span / s
    return {
      s: span,
      le,
      chord: Math.max(0.6, te - le),
      dy: WING.rootY + span * Math.tan(dihedralRad),
      // Nose-up incidence inboard, washed out at the tip.
      twist: THREE.MathUtils.degToRad(THREE.MathUtils.lerp(4.5, -2.0, k)),
      thickness: THREE.MathUtils.lerp(0.13, 0.098, k),
    }
  })
}

/** Winglet: a canted extension of the outer wing panel. */
function wingletStations(): VerticalStation[] {
  const tip = wingStations().at(-1)!
  const cantRad = (WING.wingletCant * Math.PI) / 180
  const out: VerticalStation[] = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    out.push({
      y: tip.dy + t * WING.wingletHeight * Math.cos(cantRad),
      z: tip.s + t * WING.wingletHeight * Math.sin(cantRad),
      le: tip.le + t * WING.wingletHeight * Math.tan(cantRad) * 0.85,
      chord: THREE.MathUtils.lerp(WING.wingletChord, 1.3, t),
      twist: THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-2.0, -3.0, t)),
      thickness: THREE.MathUtils.lerp(0.098, 0.085, t),
    })
  }
  return out
}

function tailplaneStations(): HorizontalStation[] {
  const half = AIRCRAFT.tailplaneSpan / 2
  const dihRad = (TAIL.tailplaneDihedral * Math.PI) / 180
  const sweepRad = (TAIL.tailplaneSweep * Math.PI) / 180
  const spans = [0, 1.4, 3.0, 4.8, 6.6, 8.2, half]
  return spans.map((span) => {
    const k = span / half
    return {
      s: span,
      le: TAIL.tailplaneLeadingEdge + span * Math.tan(sweepRad),
      chord: THREE.MathUtils.lerp(TAIL.tailplaneRootChord, TAIL.tailplaneTipChord, k),
      dy: TAIL.tailplaneY + span * Math.tan(dihRad),
      twist: 0,
      thickness: THREE.MathUtils.lerp(0.11, 0.09, k),
    }
  })
}

function finStations(): VerticalStation[] {
  const sweepRad = (TAIL.finSweep * Math.PI) / 180
  const steps = [0, 1.6, 3.4, 5.2, 7.0, 8.4, TAIL.finHeight]
  return steps.map((h) => {
    const k = h / TAIL.finHeight
    return {
      y: TAIL.finBaseY + h,
      z: 0,
      le: TAIL.finRootLeadingEdge + h * Math.tan(sweepRad),
      chord: THREE.MathUtils.lerp(TAIL.finRootChord, TAIL.finTipChord, k),
      twist: 0,
      thickness: THREE.MathUtils.lerp(0.14, 0.1, k),
    }
  })
}

/* ------------------------------------------------------------------ *
 * Nacelle profiles
 * ------------------------------------------------------------------ */

/** Nacelle outer cowl, local X running aft from the inlet lip. */
function nacelleProfile(): { x: number; r: number }[] {
  return [
    { x: 0.0, r: 1.55 },
    { x: 0.1, r: 1.66 },
    { x: 0.35, r: 1.72 },
    { x: 1.3, r: 1.71 },
    { x: 2.3, r: 1.68 },
    { x: 3.2, r: 1.6 },
    { x: 4.1, r: 1.46 },
    { x: 4.8, r: 1.26 },
    { x: 5.1, r: 1.06 },
  ]
}

/** Core cowl and exhaust plug behind the fan cowl. */
function exhaustProfile(): { x: number; r: number }[] {
  return [
    { x: 4.9, r: 1.0 },
    { x: 5.4, r: 0.88 },
    { x: 6.3, r: 0.76 },
    { x: 7.4, r: 0.64 },
    { x: 8.1, r: 0.48 },
  ]
}

/** Inlet lip: a short inward-turning lip that hides the fan cowl edge. */
function inletLipProfile(): { x: number; r: number }[] {
  return [
    { x: 0.0, r: 1.55 },
    { x: -0.12, r: 1.5 },
    { x: -0.2, r: 1.42 },
    { x: -0.24, r: 1.34 },
  ]
}

/* ------------------------------------------------------------------ *
 * Fuselage helpers
 * ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function Aircraft({
  gearDown = false,
  enginesRunning = true,
  fanSpeed = 1,
  nightMode = false,
  registration = 'F-WWCA',
  scale = 1,
  castShadows = true,
}: AircraftProps) {
  const fanGroups = useRef<(THREE.Group | null)[]>([])

  const bands: LiveryBands = useMemo(
    () => ({
      upper: new THREE.Color(LIVERY.upper),
      belly: new THREE.Color(LIVERY.belly),
      cheat: new THREE.Color(LIVERY.cheat),
    }),
    [],
  )

  const geo = useMemo(() => {
    const spinner = buildLathe(
      [
        { x: -0.95, r: 0.02 },
        { x: -0.66, r: 0.24 },
        { x: -0.32, r: 0.36 },
        { x: 0.05, r: 0.4 },
        { x: 0.34, r: 0.34 },
        { x: 0.44, r: 0.2 },
        { x: 0.48, r: 0.04 },
      ],
      32,
    )
    return {
      fuselage: buildFuselage(FUSELAGE_STATIONS, bands, 64),
      wing: buildHorizontalSurface(wingStations(), 22),
      winglet: buildVerticalSurface(wingletStations(), 16),
      tailplane: buildHorizontalSurface(tailplaneStations(), 18),
      fin: buildVerticalSurface(finStations(), 18),
      windowGeo: buildWindowBand(
        FUSELAGE_STATIONS,
        CABIN.windowStart,
        CABIN.windowEnd,
        CABIN.windowPitch,
        CABIN.windowHalfLength,
        CABIN.windowTheta,
        CABIN.windowHalfTheta,
      ),
      doorGeo: buildDoorBand(
        FUSELAGE_STATIONS,
        CABIN.doors,
        CABIN.doorHalfLength,
        CABIN.doorTheta,
        CABIN.doorHalfTheta,
      ),
      cockpitGeo: buildCockpitGlass(FUSELAGE_STATIONS),
      nacelle: buildLathe(nacelleProfile(), 44),
      exhaust: buildLathe(exhaustProfile(), 32),
      lip: buildLathe(inletLipProfile(), 44, true),
      spinner,
      fanDisc: buildFanDisc(ENGINES.blades),
      pylon: buildPylon(3.2, ENGINES.dropBelowWing + 1.0, 0),
      tyre: buildTyre(GEAR.wingWheelRadius, GEAR.wingWheelWidth),
      noseTyre: buildTyre(GEAR.noseWheelRadius, GEAR.noseWheelWidth),
      bodyTyre: buildTyre(GEAR.bodyWheelRadius, GEAR.bodyWheelWidth),
    }
  }, [bands])


  const reg = useMemo(() => createTextTexture(registration, { letterSpacing: 18 }), [registration])
  useEffect(() => () => reg.texture.dispose(), [reg])

  const enginePositions = useMemo(
    () => [
      { x: WING.inboardX, z: WING.inboardZ },
      { x: WING.outboardX, z: WING.outboardZ },
      { x: WING.inboardX, z: -WING.inboardZ },
      { x: WING.outboardX, z: -WING.outboardZ },
    ],
    [],
  )

  useFrame((_, delta) => {
    if (!enginesRunning) return
    const d = Math.min(delta, 0.05)
    for (const g of fanGroups.current) {
      if (g) g.rotation.x -= d * 7.5 * fanSpeed
    }
  })

  const glassColor = nightMode ? '#3f78b4' : LIVERY.glass

  return (
    <group scale={scale}>
      {/* ---------------- Fuselage ---------------- */}
      <mesh geometry={geo.fuselage} castShadow={castShadows} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.34} metalness={0.14} envMapIntensity={1.1} />
      </mesh>

      {/* Cockpit glazing */}
      <mesh geometry={geo.cockpitGeo}>
        <meshPhysicalMaterial
          color={glassColor}
          roughness={0.16}
          metalness={0.25}
          transparent
          opacity={0.94}
          clearcoat={0.45}
          clearcoatRoughness={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Cabin windows */}
      <mesh geometry={geo.windowGeo}>
        <meshPhysicalMaterial
          color={glassColor}
          roughness={0.1}
          metalness={0.2}
          emissive={nightMode ? '#ffc266' : '#000000'}
          emissiveIntensity={nightMode ? 1.1 : 0}
          transparent
          opacity={0.95}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Passenger doors */}
      <mesh geometry={geo.doorGeo}>
        <meshStandardMaterial
          color={LIVERY.belly}
          roughness={0.4}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* ---------------- Wings + winglets ---------------- */}
      {[1, -1].map((sign) => (
        <group key={`wing${sign}`}>
          <mesh geometry={geo.wing} scale={[1, 1, sign]} castShadow={castShadows} receiveShadow>
            <meshStandardMaterial color={LIVERY.wing} roughness={0.36} metalness={0.25} envMapIntensity={1.2} />
          </mesh>
          <mesh geometry={geo.winglet} scale={[1, 1, sign]} castShadow={castShadows}>
            <meshStandardMaterial color={LIVERY.cheat} roughness={0.34} metalness={0.22} />
          </mesh>
        </group>
      ))}

      {/* ---------------- Tail ---------------- */}
      {[1, -1].map((sign) => (
        <mesh
          key={`tp${sign}`}
          geometry={geo.tailplane}
          scale={[1, 1, sign]}
          position={[0, 0, sign * TAIL.tailplaneZ]}
          castShadow={castShadows}
        >
          <meshStandardMaterial color={LIVERY.wing} roughness={0.36} metalness={0.25} />
        </mesh>
      ))}
      <mesh geometry={geo.fin} castShadow={castShadows}>
        <meshStandardMaterial color={LIVERY.fin} roughness={0.3} metalness={0.32} envMapIntensity={1.3} />
      </mesh>

      {/* Registration on the fin */}
      <mesh position={[65.6, 9.4, 0.22]}>
        <planeGeometry args={[4.4, 0.82]} />
        <meshBasicMaterial map={reg.texture} transparent opacity={0.92} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* ---------------- Engines ---------------- */}
      {enginePositions.map((pos, i) => (
        <group key={i} position={[pos.x, nacelleYAt(pos.z), pos.z]}>
          <mesh geometry={geo.nacelle} castShadow={castShadows} receiveShadow>
            <meshStandardMaterial color={LIVERY.nacelle} roughness={0.26} metalness={0.45} envMapIntensity={1.4} />
          </mesh>
          <mesh geometry={geo.lip}>
            <meshStandardMaterial color={LIVERY.nacelleLip} roughness={0.28} metalness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={geo.exhaust}>
            <meshStandardMaterial color={LIVERY.darkMetal} roughness={0.4} metalness={0.85} />
          </mesh>
          {/* Pylon joining the nacelle to the wing */}
          <mesh geometry={geo.pylon} position={[0, ENGINES.dropBelowWing - 1.0, 0]}>
            <meshStandardMaterial color={LIVERY.wing} roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Fan disc */}
          <group ref={(el) => { fanGroups.current[i] = el }} position={[-0.45, 0, 0]}>
            <mesh geometry={geo.spinner}>
              <meshStandardMaterial color="#c9d0d8" roughness={0.28} metalness={0.85} />
            </mesh>
            <mesh geometry={geo.fanDisc}>
              <meshStandardMaterial color="#e2e8ef" roughness={0.24} metalness={0.85} side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ---------------- Landing gear ---------------- */}
      {gearDown && (
        <group>
          {/* Nose gear */}
          <group position={[GEAR.noseX, -2.3, 0]}>
            <mesh position={[0, -1.15, 0]} castShadow={castShadows}>
              <cylinderGeometry args={[0.15, 0.18, 2.3, 12]} />
              <meshStandardMaterial color={LIVERY.metal} roughness={0.4} metalness={0.85} />
            </mesh>
            <mesh position={[0, -2.32, 0]}>
              <boxGeometry args={[1.5, 0.16, 0.3]} />
              <meshStandardMaterial color={LIVERY.darkMetal} roughness={0.5} metalness={0.8} />
            </mesh>
            {[-0.62, 0.62].map((z) => (
              <mesh key={z} geometry={geo.noseTyre} position={[0, -2.74, z]} castShadow={castShadows}>
                <meshStandardMaterial color={LIVERY.tyre} roughness={0.92} metalness={0.05} />
              </mesh>
            ))}
          </group>

          {/* Wing gear */}
          {[1, -1].map((sign) => (
            <group key={`wg${sign}`} position={[GEAR.wingX, -1.5, sign * GEAR.wingZ]}>
              <mesh position={[0, -1.1, 0]} rotation={[sign * 0.07, 0, 0]} castShadow={castShadows}>
                <cylinderGeometry args={[0.2, 0.24, 2.2, 14]} />
                <meshStandardMaterial color={LIVERY.metal} roughness={0.4} metalness={0.85} />
              </mesh>
              <mesh position={[0, -2.2, 0]}>
                <boxGeometry args={[1.9, 0.24, 0.44]} />
                <meshStandardMaterial color={LIVERY.darkMetal} roughness={0.5} metalness={0.8} />
              </mesh>
              {[-0.68, -0.22, 0.22, 0.68].map((x) => (
                <mesh key={x} geometry={geo.tyre} position={[x, -2.56, 0]} castShadow={castShadows}>
                  <meshStandardMaterial color={LIVERY.tyre} roughness={0.92} metalness={0.05} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Centre-body gear */}
          <group position={[GEAR.bodyX, -2.1, 0]}>
            <mesh position={[0, -0.9, 0]} castShadow={castShadows}>
              <cylinderGeometry args={[0.19, 0.22, 1.8, 14]} />
              <meshStandardMaterial color={LIVERY.metal} roughness={0.4} metalness={0.85} />
            </mesh>
            <mesh position={[0, -1.85, 0]}>
              <boxGeometry args={[1.7, 0.22, 0.42]} />
              <meshStandardMaterial color={LIVERY.darkMetal} roughness={0.5} metalness={0.8} />
            </mesh>
            {[-0.62, -0.2, 0.2, 0.62].map((x) => (
              <mesh key={x} geometry={geo.bodyTyre} position={[x, -2.19, 0]} castShadow={castShadows}>
                <meshStandardMaterial color={LIVERY.tyre} roughness={0.92} metalness={0.05} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  )
}


