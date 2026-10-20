import * as THREE from 'three'

/**
 * All geometry is authored in real-world metres in "aircraft space":
 *   +X  aft along the fuselage (nose at x = 0, tail at x = 75.36)
 *   +Y  up
 *   +Z  starboard (right wing)
 * The origin sits on the fuselage reference line; the aircraft is placed in
 * the scene with a group transform.
 *
 * Dimensions follow the Airbus A340-600:
 *   length 75.36 m, span 63.45 m, height 17.80 m, fuselage diameter 5.64 m.
 */

export const FUSELAGE_LENGTH = 75.36
export const WING_SPAN = 63.45
export const FUSELAGE_RADIUS = 2.82

export interface Station {
  /** Distance from the nose, metres. */
  x: number
  /** Cross-section radius, metres. */
  r: number
  /** Vertical offset of the section centre, metres. */
  y: number
}

/** Fuselage stations: drooped nose, constant barrel, upswept tail cone. */
export const FUSELAGE_STATIONS: Station[] = [
  { x: 0.0, r: 0.04, y: -0.45 },
  { x: 0.5, r: 0.6, y: -0.66 },
  { x: 1.3, r: 1.02, y: -0.9 },
  { x: 2.4, r: 1.46, y: -1.12 },
  { x: 3.8, r: 1.86, y: -1.26 },
  { x: 5.4, r: 2.2, y: -1.32 },
  { x: 7.4, r: 2.5, y: -1.32 },
  { x: 10.0, r: 2.68, y: -1.24 },
  { x: 13.5, r: 2.78, y: -1.06 },
  { x: 18.0, r: 2.82, y: -0.86 },
  { x: 24.0, r: 2.82, y: -0.66 },
  { x: 32.0, r: 2.82, y: -0.48 },
  { x: 42.0, r: 2.82, y: -0.32 },
  { x: 50.0, r: 2.82, y: -0.16 },
  { x: 57.0, r: 2.81, y: 0.04 },
  { x: 61.0, r: 2.76, y: 0.34 },
  { x: 64.0, r: 2.62, y: 0.72 },
  { x: 66.5, r: 2.42, y: 1.14 },
  { x: 68.5, r: 2.15, y: 1.58 },
  { x: 70.5, r: 1.8, y: 2.08 },
  { x: 72.0, r: 1.42, y: 2.58 },
  { x: 73.3, r: 1.0, y: 3.08 },
  { x: 74.4, r: 0.6, y: 3.52 },
  { x: 75.36, r: 0.06, y: 3.86 },
]

const TAU = Math.PI * 2

/** Angular convention: theta = 0 is the starboard side, -PI/2 is the belly. */
export const THETA_STARBOARD = 0
export const THETA_BELLY = -Math.PI / 2
/** Cabin window belt, ~0.83 m above the fuselage centre line. */
export const WINDOW_THETA = 0.3

export function fuselageAt(stations: Station[], x: number): { r: number; y: number } {
  if (x <= stations[0].x) return { r: stations[0].r, y: stations[0].y }
  const last = stations[stations.length - 1]
  if (x >= last.x) return { r: last.r, y: last.y }
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i]
    const b = stations[i + 1]
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x)
      const s = t * t * (3 - 2 * t)
      return { r: a.r + (b.r - a.r) * s, y: a.y + (b.y - a.y) * s }
    }
  }
  return { r: last.r, y: last.y }
}

/** Cross-section: near-circular, slightly wider up top, flattened belly. */
function sectionOffset(r: number, theta: number, out: THREE.Vector3): THREE.Vector3 {
  const v = Math.sin(theta)
  const c = Math.cos(theta)
  const y = v >= 0 ? r * v : r * v * 0.94
  const z = r * c * (1 + 0.03 * v)
  return out.set(0, y, z)
}

export function fuselagePoint(
  stations: Station[],
  x: number,
  theta: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const { r, y } = fuselageAt(stations, x)
  sectionOffset(r, theta, out)
  out.x = x
  out.y += y
  return out
}

/** Outward surface normal at a fuselage station, ignoring the vertical offset. */
function fuselageNormal(theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  const v = Math.sin(theta)
  return out.set(0, v >= 0 ? v : v * 0.94, Math.cos(theta) * (1 + 0.03 * v)).normalize()
}

export interface LiveryBands {
  belly: THREE.Color
  cheat: THREE.Color
  upper: THREE.Color
}

/** Weld the duplicated seam ring so normals stay continuous. */
function weldSeam(geo: THREE.BufferGeometry, rings: number, cols: number) {
  const nrm = geo.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < rings; i++) {
    const a = i * cols
    const b = i * cols + (cols - 1)
    const nx = (nrm.getX(a) + nrm.getX(b)) * 0.5
    const ny = (nrm.getY(a) + nrm.getY(b)) * 0.5
    const nz = (nrm.getZ(a) + nrm.getZ(b)) * 0.5
    const len = Math.hypot(nx, ny, nz) || 1
    nrm.setXYZ(a, nx / len, ny / len, nz / len)
    nrm.setXYZ(b, nx / len, ny / len, nz / len)
  }
  nrm.needsUpdate = true
}

/**
 * Main fuselage hull with the livery baked into vertex colours, so the whole
 * body is a single draw call.
 */
export function buildFuselage(
  stations: Station[],
  bands: LiveryBands,
  radialSegments = 64,
): THREE.BufferGeometry {
  const rings = stations.length
  const cols = radialSegments + 1
  const count = rings * cols
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []
  const tmp = new THREE.Vector3()
  const col = new THREE.Color()

  // Band boundaries expressed in ring indices (0 = belly seam).
  const bellyEnd = 13
  const cheatEnd = 15

  for (let i = 0; i < rings; i++) {
    const st = stations[i]
    for (let j = 0; j < cols; j++) {
      const theta = -Math.PI / 2 + (j / radialSegments) * TAU
      sectionOffset(st.r, theta, tmp)
      const idx = i * cols + j
      positions[idx * 3] = st.x
      positions[idx * 3 + 1] = tmp.y + st.y
      positions[idx * 3 + 2] = tmp.z
      uvs[idx * 2] = j / radialSegments
      uvs[idx * 2 + 1] = i / (rings - 1)

      if (j <= bellyEnd) col.copy(bands.belly)
      else if (j <= cheatEnd) col.copy(bands.cheat)
      else col.copy(bands.upper)
      colors[idx * 3] = col.r
      colors[idx * 3 + 1] = col.g
      colors[idx * 3 + 2] = col.b
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  weldSeam(geo, rings, cols)
  return geo
}

/* ------------------------------------------------------------------ *
 * Lifting surfaces
 *
 * Two distinct station types keep the axis mapping unambiguous:
 *   HorizontalStation - span along Z, chord along X, thickness along Y.
 *   VerticalStation   - span along Y, chord along X, thickness along Z.
 * ------------------------------------------------------------------ */

export interface HorizontalStation {
  /** Spanwise position (Z), metres. */
  s: number
  /** Leading-edge X position, metres. */
  le: number
  /** Chord, metres. */
  chord: number
  /** Vertical position of the section reference line, metres. */
  dy: number
  /** Twist, radians. Negative raises the leading edge (positive incidence). */
  twist: number
  /** Thickness ratio. */
  thickness: number
}

export interface VerticalStation {
  /** Vertical position of the section reference line, metres. */
  y: number
  /** Lateral position of the section reference line, metres. */
  z: number
  /** Leading-edge X position, metres. */
  le: number
  /** Chord, metres. */
  chord: number
  /** Twist, radians. */
  twist: number
  /** Thickness ratio. */
  thickness: number
}

/** NACA-style symmetric thickness distribution, normalised to 1.0. */
function thicknessProfile(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return (
    5 *
    (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x * x * x - 0.1015 * x * x * x * x)
  )
}

/**
 * Section outline in chord/normal space.
 * Returns the chordwise X and the offset normal to the chord line.
 */
function sectionPoint(
  le: number,
  chord: number,
  twist: number,
  thickness: number,
  t: number,
  side: 1 | -1,
  out: { x: number; n: number },
) {
  const half = thicknessProfile(t) * thickness * chord * 0.5
  const camber = 0.014 * chord * Math.sin(Math.PI * t)
  const ct = Math.cos(twist)
  const sn = Math.sin(twist)
  const cx = t * chord
  const ny = camber + side * half
  out.x = le + cx * ct - ny * sn
  out.n = cx * sn + ny * ct
  return out
}

export function buildSurface(
  stations: (HorizontalStation | VerticalStation)[],
  chordwise: number,
  vertical: boolean,
): THREE.BufferGeometry {
  const rings = stations.length
  const cols = chordwise + 1
  const count = rings * cols * 2
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []
  const p = { x: 0, n: 0 }

  for (let i = 0; i < rings; i++) {
    const st = stations[i]
    for (let j = 0; j < cols; j++) {
      const t = j / chordwise
      for (let side = 0; side < 2; side++) {
        sectionPoint(st.le, st.chord, st.twist, st.thickness, t, side === 0 ? 1 : -1, p)
        const idx = (i * cols + j) * 2 + side
        positions[idx * 3] = p.x
        if (vertical) {
          const vs = st as VerticalStation
          positions[idx * 3 + 1] = vs.y
          positions[idx * 3 + 2] = vs.z + p.n
        } else {
          const hs = st as HorizontalStation
          positions[idx * 3 + 1] = hs.dy + p.n
          positions[idx * 3 + 2] = hs.s
        }
        uvs[idx * 2] = t
        uvs[idx * 2 + 1] = i / (rings - 1)
      }
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < chordwise; j++) {
      const a = (i * cols + j) * 2
      const b = a + 2
      const c = a + cols * 2
      const d = c + 2
      indices.push(a, c, b, b, c, d)
      indices.push(a + 1, b + 1, c + 1, b + 1, d + 1, c + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Wing / tailplane: span along Z. */
export function buildHorizontalSurface(
  stations: HorizontalStation[],
  chordwise = 20,
): THREE.BufferGeometry {
  return buildSurface(stations, chordwise, false)
}

/** Fin / winglet: span along Y. */
export function buildVerticalSurface(
  stations: VerticalStation[],
  chordwise = 20,
): THREE.BufferGeometry {
  return buildSurface(stations, chordwise, true)
}

/**
 * A small patch that sits on the fuselage skin — used for cabin windows,
 * doors and the cockpit glazing.
 */
export function buildSkinPatch(
  stations: Station[],
  xCentre: number,
  halfLength: number,
  thetaCentre: number,
  halfTheta: number,
  offset = 0.02,
  nx = 4,
  nt = 4,
): THREE.BufferGeometry {
  const count = nx * nt
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let i = 0; i < nx; i++) {
    const fx = i / (nx - 1)
    const x = xCentre - halfLength + 2 * halfLength * fx
    const { r, y } = fuselageAt(stations, x)
    for (let j = 0; j < nt; j++) {
      const ft = j / (nt - 1)
      const theta = thetaCentre - halfTheta + 2 * halfTheta * ft
      sectionOffset(r, theta, p)
      p.x = x
      p.y += y
      fuselageNormal(theta, n)
      const idx = i * nt + j
      positions[idx * 3] = p.x + n.x * offset
      positions[idx * 3 + 1] = p.y + n.y * offset
      positions[idx * 3 + 2] = p.z + n.z * offset
      uvs[idx * 2] = fx
      uvs[idx * 2 + 1] = ft
    }
  }

  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < nt - 1; j++) {
      const a = i * nt + j
      const b = a + 1
      const c = a + nt
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Lofted ring of revolution used for engine nacelles, spinners and wheels.
 * `profile` entries are { x, r } pairs along the local X axis.
 */
export function buildLathe(
  profile: { x: number; r: number }[],
  radialSegments = 40,
  flip = false,
): THREE.BufferGeometry {
  const rings = profile.length
  const cols = radialSegments + 1
  const count = rings * cols
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []

  for (let i = 0; i < rings; i++) {
    const p = profile[i]
    for (let j = 0; j < cols; j++) {
      const theta = (j / radialSegments) * TAU
      const idx = i * cols + j
      positions[idx * 3] = p.x
      positions[idx * 3 + 1] = Math.sin(theta) * p.r
      positions[idx * 3 + 2] = Math.cos(theta) * p.r
      uvs[idx * 2] = j / radialSegments
      uvs[idx * 2 + 1] = i / (rings - 1)
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      if (flip) indices.push(a, b, c, b, d, c)
      else indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * A single wide-chord swept fan blade, authored in a local frame where the
 * hub axis is +X, the blade extends along +Y and the chord runs along Z.
 */
export function buildFanBlade(): THREE.BufferGeometry {
  const spanStations = 8
  const chordStations = 6
  const count = spanStations * chordStations * 2
  const positions = new Float32Array(count * 3)
  const uvs = new Float32Array(count * 2)
  const indices: number[] = []

  for (let i = 0; i < spanStations; i++) {
    const s = i / (spanStations - 1)
    const radius = 0.42 + s * 1.0
    const sweep = 0.12 + s * 0.42
    const chord = 0.62 - s * 0.18
    const twist = 0.62 - s * 0.42
    const thick = 0.035 - s * 0.012

    for (let j = 0; j < chordStations; j++) {
      const t = j / (chordStations - 1)
      const camber = 0.07 * Math.sin(Math.PI * t) * chord
      const half = thick * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.15)) * chord
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? 1 : -1
        const zc = (t - 0.35) * chord + sweep * (0.5 - t) * 0.6
        const x = zc * Math.cos(twist) - (camber + sign * half) * Math.sin(twist)
        const y = zc * Math.sin(twist) + (camber + sign * half) * Math.cos(twist)
        const idx = (i * chordStations + j) * 2 + side
        positions[idx * 3] = x
        positions[idx * 3 + 1] = radius
        positions[idx * 3 + 2] = y
        uvs[idx * 2] = t
        uvs[idx * 2 + 1] = s
      }
    }
  }

  for (let i = 0; i < spanStations - 1; i++) {
    for (let j = 0; j < chordStations - 1; j++) {
      const a = (i * chordStations + j) * 2
      const b = a + 2
      const c = a + chordStations * 2
      const d = c + 2
      indices.push(a, c, b, b, c, d)
      indices.push(a + 1, b + 1, c + 1, b + 1, d + 1, c + 1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** A tyre: a tread band with a hub recess, axis along X. */
export function buildTyre(radius: number, width: number): THREE.BufferGeometry {
  const profile: { x: number; r: number }[] = [
    { x: -width / 2, r: radius * 0.62 },
    { x: -width / 2, r: radius * 0.93 },
    { x: -width * 0.42, r: radius * 0.995 },
    { x: -width * 0.2, r: radius },
    { x: width * 0.2, r: radius },
    { x: width * 0.42, r: radius * 0.995 },
    { x: width / 2, r: radius * 0.93 },
    { x: width / 2, r: radius * 0.62 },
  ]
  const geo = buildLathe(profile, 28)
  geo.rotateZ(Math.PI / 2)
  return geo
}

/**
 * Engine pylon: a swept strut joining a nacelle to the wing surface.
 * Authored in the local frame of the nacelle, running from the nacelle
 * crown aft and up to the wing underside.
 */

/**
 * Engine pylon: the swept strut that carries a nacelle from the wing
 * underside. Authored in a local frame where:
 *   +X  aft along the aircraft
 *   +Y  up toward the wing
 *   +Z  outboard
 *
 * The nacelle axis sits at the origin; the pylon rises from the nacelle
 * crown to the wing lower surface and fairs aft.
 */
export function buildPylon(
  /** Chord of the pylon at the wing, m. */
  chord: number,
  /** Vertical distance from the nacelle axis to the wing lower surface, m. */
  height: number,
  /** Forward offset applied to the pylon leading edge, m. */
  forwardOffset: number,
): THREE.BufferGeometry {
  const stations: HorizontalStation[] = [
    // Root: buried in the nacelle crown, forward of the wing leading edge.
    { s: 0, le: -1.4 + forwardOffset, chord: chord * 0.9, dy: 0, twist: 0, thickness: 1.0 },
    // Rising through the fan cowl.
    { s: height * 0.45, le: -1.0 + forwardOffset, chord: chord * 0.78, dy: 0, twist: 0, thickness: 0.9 },
    // Meeting the wing lower surface.
    { s: height, le: -0.4 + forwardOffset, chord: chord * 0.62, dy: 0, twist: 0, thickness: 0.8 },
  ]
  return buildSurface(stations, 10, false)
}
/**
 * Builds a single quad conformed to the fuselage skin.
 *
 * The section convention is theta = 0 at the side and theta = PI/2 at the
 * top, so a patch is mirrored to port by negating Z — never by negating
 * theta, which would mirror it onto the belly.
 */
function skinQuad(
  stations: Station[],
  x0: number,
  x1: number,
  theta0: number,
  theta1: number,
  offset: number,
  mirrorZ = false,
  nx = 4,
  nt = 4,
): { positions: number[]; indices: number[] } | null {
  const positions: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let i = 0; i < nx; i++) {
    const fx = i / (nx - 1)
    const x = x0 + (x1 - x0) * fx
    const { r, y } = fuselageAt(stations, x)
    for (let j = 0; j < nt; j++) {
      const ft = j / (nt - 1)
      const theta = theta0 + (theta1 - theta0) * ft
      sectionOffset(r, theta, p)
      p.x = x
      p.y += y
      fuselageNormal(theta, n)
      const z = (p.z + n.z * offset) * (mirrorZ ? -1 : 1)
      positions.push(p.x + n.x * offset, p.y + n.y * offset, z)
    }
  }
  for (let i = 0; i < nx - 1; i++) {
    for (let j = 0; j < nt - 1; j++) {
      const a = i * nt + j
      const b = a + 1
      const c = a + nt
      const d = c + 1
      if (mirrorZ) indices.push(a, b, c, b, d, c)
      else indices.push(a, c, b, b, c, d)
    }
  }
  return { positions, indices }
}

/** Merges a list of quads into a single non-indexed geometry. */
function mergeQuads(
  quads: { positions: number[]; indices: number[] }[],
): THREE.BufferGeometry {
  const positions: number[] = []
  for (const q of quads) {
    for (const idx of q.indices) {
      positions.push(
        q.positions[idx * 3],
        q.positions[idx * 3 + 1],
        q.positions[idx * 3 + 2],
      )
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  return geo
}

/**
 * The cabin window belt: every pane is conformed to the fuselage skin at its
 * exact station, then merged into one geometry — one draw call, and each pane
 * sits precisely on the hull whatever the local radius is.
 */
export function buildWindowBand(
  stations: Station[],
  from: number,
  to: number,
  pitch: number,
  halfLength: number,
  theta: number,
  halfTheta: number,
  offset = 0.025,
): THREE.BufferGeometry {
  const quads: { positions: number[]; indices: number[] }[] = []
  for (let x = from; x <= to; x += pitch) {
    for (const mirror of [false, true]) {
      const q = skinQuad(
        stations,
        x - halfLength,
        x + halfLength,
        theta - halfTheta,
        theta + halfTheta,
        offset,
        mirror,
        3,
        2,
      )
      if (q) quads.push(q)
    }
  }
  return mergeQuads(quads)
}

/**
 * The passenger door outlines: a recessed rectangle on the skin, one per
 * published door station, both sides.
 */
export function buildDoorBand(
  stations: Station[],
  doors: readonly number[],
  halfLength: number,
  theta: number,
  halfTheta: number,
  offset = 0.03,
): THREE.BufferGeometry {
  const quads: { positions: number[]; indices: number[] }[] = []
  for (const x of doors) {
    for (const mirror of [false, true]) {
      const q = skinQuad(
        stations,
        x - halfLength,
        x + halfLength,
        theta - halfTheta,
        theta + halfTheta,
        offset,
        mirror,
        3,
        3,
      )
      if (q) quads.push(q)
    }
  }
  return mergeQuads(quads)
}

/**
 * The Airbus flight-deck glazing: three panes per side wrapping the upper
 * nose, matching the characteristic window group of the A340/A330 family.
 */
export function buildCockpitGlass(
  stations: Station[],
  offset = 0.03,
): THREE.BufferGeometry {
  // Each entry is [x0, x1, theta0, theta1]; theta is measured from the
  // section centre line, with PI/2 at the top of the fuselage.
  const panes: [number, number, number, number][] = [
    [2.60, 3.45, 0.42, 0.86], // windscreen
    [3.50, 4.30, 0.26, 0.66], // forward side window
    [4.35, 5.15, 0.06, 0.44], // aft side window
  ]
  const quads: { positions: number[]; indices: number[] }[] = []
  for (const [x0, x1, th0, th1] of panes) {
    for (const mirror of [false, true]) {
      const q = skinQuad(stations, x0, x1, th0, th1, offset, mirror, 4, 4)
      if (q) quads.push(q)
    }
  }
  return mergeQuads(quads)
}


/**
 * The complete fan disc: every blade rotated into position and merged into a
 * single geometry, so an engine's fan costs one draw call instead of 26.
 * The merged disc spins as one rigid body, exactly as a real fan does.
 */
export function buildFanDisc(bladeCount: number): THREE.BufferGeometry {
  const blade = buildFanBlade()
  const pos = blade.getAttribute('position')
  const idx = blade.getIndex()
  const n = idx ? idx.count : pos.count

  const positions = new Float32Array(n * 3 * bladeCount)
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const m = new THREE.Matrix4()
  const rot = new THREE.Matrix4()

  for (let k = 0; k < bladeCount; k++) {
    const angle = (k / bladeCount) * Math.PI * 2
    rot.makeRotationX(angle)
    const base = k * n * 3
    for (let i = 0; i < n; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i)
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1)
      c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2)
      a.applyMatrix4(rot)
      b.applyMatrix4(rot)
      c.applyMatrix4(rot)
      positions[base + i * 3] = a.x
      positions[base + i * 3 + 1] = a.y
      positions[base + i * 3 + 2] = a.z
      positions[base + (i + 1) * 3] = b.x
      positions[base + (i + 1) * 3 + 1] = b.y
      positions[base + (i + 1) * 3 + 2] = b.z
      positions[base + (i + 2) * 3] = c.x
      positions[base + (i + 2) * 3 + 1] = c.y
      positions[base + (i + 2) * 3 + 2] = c.z
    }
  }
  m.identity()

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.computeVertexNormals()
  blade.dispose()
  return geo
}
