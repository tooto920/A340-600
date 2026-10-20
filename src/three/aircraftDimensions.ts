/**
 * A340-600 dimensional data.
 *
 * Sources:
 *  - Airbus "Aircraft Characteristics - Airport and Maintenance Planning",
 *    A340-500/-600 (Rev. 21, Aug 01/22) — dimensions, doors, gear, volumes.
 *  - Airbus Commercial Aircraft, A340-600 programme page.
 *  - FAA / EASA type certificate data sheet for the A340-600.
 *
 * Coordinates used throughout the 3D code ("aircraft space"):
 *   +X  aft, x = 0 at the nose, x = 75.36 at the tail tip
 *   +Y  up, y = 0 on the fuselage datum line
 *   +Z  starboard
 * The ground plane sits at GEAR.groundY, which places the vertical tail tip
 * at the published overall height of 17.80 m.
 *
 * NOTE ON THE WING PLANFORM: the published planform is reproduced to visual
 * accuracy (sweep, kink position, taper, winglet) rather than to the exact
 * published area of 437 m2. Published geometry is quoted in the site copy
 * with its source; the 3D model is a procedural approximation.
 */

export const AIRCRAFT = {
  /** Overall length, m. */
  length: 75.36,
  /** Overall wing span including the winglets, m. */
  span: 63.45,
  /** Overall height, ground to vertical tail tip, m. */
  height: 17.8,
  /** Fuselage external diameter, m. */
  diameter: 5.64,
  /** Wing area, m2 (published). */
  wingArea: 437,
  /** Wing aspect ratio (published). */
  wingAspectRatio: 9.2,
  /** Wing sweep at quarter chord, degrees (published). */
  wingSweep: 31.1,
  /** Horizontal stabiliser span, m. */
  tailplaneSpan: 17.4,
} as const

export const FUSELAGE = {
  nose: 0,
  tail: 75.36,
  radius: 2.82,
} as const

export const WING = {
  /** Leading-edge X at the centreline, m. */
  rootLeadingEdge: 30.0,
  /** Root chord, m. */
  rootChord: 15.0,
  /** Tip chord, m. */
  tipChord: 2.45,
  /**
   * Wing semi-span to the wingtip, m. The winglet is canted outboard, so the
   * published overall span (63.45 m) is larger than twice this value.
   */
  semiSpan: 30.7,
  /** Dihedral, degrees. */
  dihedral: 5.4,
  /** Spanwise station of the trailing-edge kink, m. */
  kinkAt: 11.1,
  /** Root vertical position relative to the fuselage datum line, m (low wing). */
  rootY: -2.6,
  /** Winglet height, m (published). */
  wingletHeight: 2.74,
  /** Winglet cant from vertical, degrees (leaning outboard). */
  wingletCant: 22,
  /** Winglet chord at its base, m. */
  wingletChord: 2.2,
  /** Inboard engine lateral offset, m. */
  inboardZ: 11.35,
  /** Outboard engine lateral offset, m. */
  outboardZ: 21.5,
  /** Inboard engine nacelle centre X, m. */
  inboardX: 33.5,
  /** Outboard engine nacelle centre X, m. */
  outboardX: 39.0,
} as const

export const ENGINES = {
  /** Trent 556-61, the standard A340-600 powerplant. */
  designation: 'Trent 556-61',
  /** Fan diameter, m. */
  fanDiameter: 2.95,
  /** Nacelle outer radius, m. */
  nacelleRadius: 1.72,
  /** Number of fan blades. */
  blades: 26,
  /** Vertical distance from the wing reference line down to the nacelle axis, m. */
  dropBelowWing: 1.85,
} as const

export const TAIL = {
  /** Fin root leading-edge X, m. */
  finRootLeadingEdge: 60.0,
  /** Fin root chord, m. */
  finRootChord: 11.0,
  /** Fin tip chord, m. */
  finTipChord: 3.6,
  /** Fin base height, m. */
  finBaseY: 3.1,
  /** Fin height above its base, m. */
  finHeight: 9.5,
  /** Fin sweep, degrees. */
  finSweep: 41,
  /** Tailplane root leading-edge X, m. */
  tailplaneLeadingEdge: 66.5,
  /** Tailplane root chord, m. */
  tailplaneRootChord: 7.4,
  /** Tailplane tip chord, m. */
  tailplaneTipChord: 2.9,
  /** Tailplane root height, m. */
  tailplaneY: 2.3,
  /** Tailplane lateral offset from the centre line, m. */
  tailplaneZ: 1.2,
  /** Tailplane dihedral, degrees. */
  tailplaneDihedral: 7,
  /** Tailplane sweep, degrees. */
  tailplaneSweep: 35,
} as const

export const GEAR = {
  /** Ground plane in aircraft space, m. */
  groundY: -5.2,
  /** Nose gear leg X position, m (published: 6.57 m from the nose). */
  noseX: 6.57,
  noseWheelRadius: 0.42,
  noseWheelWidth: 0.36,
  /** Main (wing) gear leg X position, m (published: 39.46 m from the nose). */
  wingX: 39.46,
  /** Main gear track, half of the published 10.684 m. */
  wingZ: 5.342,
  wingWheelRadius: 0.62,
  wingWheelWidth: 0.45,
  /** Centre-body gear leg X position, m (published: 40.21 m from the nose). */
  bodyX: 40.21,
  bodyWheelRadius: 0.6,
  bodyWheelWidth: 0.44,
} as const

export const CABIN = {
  /** First cabin window centre, m from the nose. */
  windowStart: 13.0,
  /** Last cabin window centre, m from the nose. */
  windowEnd: 66.0,
  /** Window pitch, m. */
  windowPitch: 0.53,
  /**
   * Passenger / crew door stations, m from the nose (published).
   * The A340-600 has five doors per side, D3 being the overwing exit.
   */
  doors: [5.85, 23.91, 34.09, 47.46, 61.58] as const,
  /** Window half-length along the fuselage, m. */
  windowHalfLength: 0.16,
  /** Window belt angle from the section centre line, radians. */
  windowTheta: 0.3,
  /** Window half-height, radians. */
  windowHalfTheta: 0.045,
  /** Door half-length, m. */
  doorHalfLength: 0.55,
  /** Door centre angle, radians. */
  doorTheta: 0.44,
  /** Door half-height, radians. */
  doorHalfTheta: 0.34,
  /** Index of the overwing emergency exit within `doors`. */
  overwingIndex: 2,
} as const

/** Livery palette, tuned to the project's black / white / electric-blue direction. */
export const LIVERY = {
  upper: '#eef2f6',
  belly: '#c6ccd4',
  cheat: '#0a1c3d',
  wing: '#d3d9e0',
  fin: '#0a1c3d',
  finMark: '#dfe6ee',
  nacelle: '#e9edf2',
  nacelleLip: '#9aa3ad',
  metal: '#b9c0c8',
  darkMetal: '#6f767e',
  glass: '#0a1420',
  tyre: '#131619',
  accent: '#3fa9ff',
} as const

/** Height of the wing reference line at a given lateral offset, m. */
export function wingYAt(z: number): number {
  return WING.rootY + Math.abs(z) * Math.tan((WING.dihedral * Math.PI) / 180)
}

/** Vertical position of an engine nacelle axis at a given lateral offset, m. */
export function nacelleYAt(z: number): number {
  return wingYAt(z) - ENGINES.dropBelowWing
}

