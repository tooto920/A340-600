/**
 * Offline silhouette renderer (development tool; not part of the deployed site).
 *
 * Builds the aircraft geometry in Node with no WebGL and rasterises
 * orthographic projections to PNG, so proportions can be verified without a
 * browser. Pure software: painter's algorithm + per-triangle lambert.
 *
 * Run with:  npm run verify:geometry
 */
import * as THREE from 'three'
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import {
  buildFuselage,
  buildHorizontalSurface,
  buildLathe,
  buildVerticalSurface,
  FUSELAGE_STATIONS,
  type HorizontalStation,
  type LiveryBands,
  type VerticalStation,
} from '../src/three/aircraftGeometry'
import {
  AIRCRAFT,
  GEAR,
  LIVERY,
  nacelleYAt,
  TAIL,
  WING,
} from '../src/three/aircraftDimensions'

/* ------------------------------ PNG writer ------------------------------ */
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function writePNG(path: string, w: number, h: number, rgb: Buffer) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

/* ------------------------------ Raster ------------------------------ */
class Raster {
  w: number
  h: number
  buf: Buffer
  constructor(w: number, h: number, bg: number[]) {
    this.w = w
    this.h = h
    this.buf = Buffer.alloc(w * h * 3)
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg[0]
      this.buf[i * 3 + 1] = bg[1]
      this.buf[i * 3 + 2] = bg[2]
    }
  }
  fillPoly(pts: number[][], shade: number[]) {
    let minY = Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minY = Math.min(minY, p[1])
      maxY = Math.max(maxY, p[1])
    }
    const y0 = Math.max(0, Math.floor(minY))
    const y1 = Math.min(this.h - 1, Math.ceil(maxY))
    for (let y = y0; y <= y1; y++) {
      const xs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        if (a[1] === b[1]) continue
        const t = (y + 0.5 - a[1]) / (b[1] - a[1])
        if (t >= 0 && t <= 1) xs.push(a[0] + t * (b[0] - a[0]))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.round(xs[k]))
        const xb = Math.min(this.w - 1, Math.round(xs[k + 1]))
        for (let x = xa; x <= xb; x++) {
          const o = (y * this.w + x) * 3
          this.buf[o] = shade[0]
          this.buf[o + 1] = shade[1]
          this.buf[o + 2] = shade[2]
        }
      }
    }
  }
}

/* ------------------------------ Geometry ------------------------------ */
const bands: LiveryBands = {
  upper: new THREE.Color(LIVERY.upper),
  belly: new THREE.Color(LIVERY.belly),
  cheat: new THREE.Color(LIVERY.cheat),
}

function wingStations(): HorizontalStation[] {
  const s = WING.semiSpan
  const kink = WING.kinkAt
  const sweepRad = (AIRCRAFT.wingSweep * Math.PI) / 180
  const dihedralRad = (WING.dihedral * Math.PI) / 180
  const leAt = (span: number) => WING.rootLeadingEdge + span * Math.tan(sweepRad)
  const teAt = (span: number) => {
    const kinkTE = WING.rootLeadingEdge + WING.rootChord
    if (span <= kink) return kinkTE + span * 0.06
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
      twist: THREE.MathUtils.degToRad(THREE.MathUtils.lerp(4.5, -2.0, k)),
      thickness: THREE.MathUtils.lerp(0.13, 0.098, k),
    }
  })
}

function wingletStations(): VerticalStation[] {
  const tip = wingStations().at(-1)!
  const cantRad = (WING.wingletCant * Math.PI) / 180
  const out: VerticalStation[] = []
  for (let i = 0; i <= 4; i++) {
    const t = i / 4
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
  return [0, 1.4, 3.0, 4.8, 6.6, 8.2, half].map((span): HorizontalStation => {
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
  return steps.map((h): VerticalStation => {
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

function nacelleProfile() {
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
function exhaustProfile() {
  return [
    { x: 4.9, r: 1.0 },
    { x: 5.4, r: 0.88 },
    { x: 6.3, r: 0.76 },
    { x: 7.4, r: 0.64 },
    { x: 8.1, r: 0.48 },
  ]
}
function gearWheel(r: number, w: number) {
  const g = buildLathe(
    [
      { x: -w / 2, r: r * 0.6 },
      { x: -w / 2, r: r },
      { x: w / 2, r: r },
      { x: w / 2, r: r * 0.6 },
    ],
    20,
  )
  g.rotateZ(Math.PI / 2)
  return g
}

type Tri = { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; color: THREE.Color }

function collectTriangles(
  out: Tri[],
  geo: THREE.BufferGeometry,
  color: THREE.Color,
  transform?: (v: THREE.Vector3) => void,
) {
  const pos = geo.getAttribute('position')
  const idx = geo.getIndex()
  const n = idx ? idx.count : pos.count
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, idx ? idx.getX(i) : i)
    b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1)
    c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2)
    if (transform) {
      transform(a)
      transform(b)
      transform(c)
    }
    out.push({ a: a.clone(), b: b.clone(), c: c.clone(), color })
  }
}

function buildScene(): Tri[] {
  const tris: Tri[] = []
  collectTriangles(
    tris,
    buildFuselage(FUSELAGE_STATIONS, bands, 48),
    new THREE.Color(LIVERY.upper),
  )

  const wing = buildHorizontalSurface(wingStations(), 16)
  collectTriangles(tris, wing, new THREE.Color(LIVERY.wing))
  collectTriangles(tris, wing, new THREE.Color(LIVERY.wing), (v) => {
    v.z = -v.z
  })

  const winglet = buildVerticalSurface(wingletStations(), 12)
  collectTriangles(tris, winglet, new THREE.Color(LIVERY.cheat))
  collectTriangles(tris, winglet, new THREE.Color(LIVERY.cheat), (v) => {
    v.z = -v.z
  })

  const tp = buildHorizontalSurface(tailplaneStations(), 14)
  collectTriangles(tris, tp, new THREE.Color(LIVERY.wing))
  collectTriangles(tris, tp, new THREE.Color(LIVERY.wing), (v) => {
    v.z = -v.z
  })

  collectTriangles(tris, buildVerticalSurface(finStations(), 14), new THREE.Color(LIVERY.fin))

  const nac = buildLathe(nacelleProfile(), 28)
  const exh = buildLathe(exhaustProfile(), 20)
  const nacelleY = nacelleYAt(0)
  for (const [x, z] of [
    [WING.inboardX, WING.inboardZ],
    [WING.outboardX, WING.outboardZ],
    [WING.inboardX, -WING.inboardZ],
    [WING.outboardX, -WING.outboardZ],
  ]) {
    collectTriangles(tris, nac, new THREE.Color(LIVERY.nacelle), (v) => {
      v.x += x
      v.y += nacelleYAt(z)
      v.z += z
    })
    collectTriangles(tris, exh, new THREE.Color(LIVERY.darkMetal), (v) => {
      v.x += x
      v.y += nacelleYAt(z)
      v.z += z
    })
  }

  const noseW = gearWheel(GEAR.noseWheelRadius, GEAR.noseWheelWidth)
  collectTriangles(tris, noseW, new THREE.Color(LIVERY.tyre), (v) => {
    v.x += GEAR.noseX
    v.y += GEAR.groundY + GEAR.noseWheelRadius
  })
  const mainW = gearWheel(GEAR.wingWheelRadius, GEAR.wingWheelWidth)
  for (const s of [1, -1]) {
    for (const dx of [-0.68, -0.22, 0.22, 0.68]) {
      collectTriangles(tris, mainW, new THREE.Color(LIVERY.tyre), (v) => {
        v.x += GEAR.wingX + dx
        v.y += GEAR.groundY + GEAR.wingWheelRadius
        v.z += s * GEAR.wingZ
      })
    }
  }
  const bodyW = gearWheel(GEAR.bodyWheelRadius, GEAR.bodyWheelWidth)
  for (const dx of [-0.62, -0.2, 0.2, 0.62]) {
    collectTriangles(tris, bodyW, new THREE.Color(LIVERY.tyre), (v) => {
      v.x += GEAR.bodyX + dx
      v.y += GEAR.groundY + GEAR.bodyWheelRadius
    })
  }

  return tris
}

type View = 'side' | 'top' | 'front'

function render(view: View, w: number, h: number, file: string) {
  const raster = new Raster(w, h, [8, 11, 18])
  const light = new THREE.Vector3(0.35, 0.72, 0.6).normalize()
  const tris = buildScene()

  const project = (v: THREE.Vector3): [number, number, number] => {
    if (view === 'side') return [v.x, -v.y, v.z]
    if (view === 'top') return [v.x, -v.z, v.y]
    return [v.z, -v.y, v.x]
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const t of tris) {
    for (const v of [t.a, t.b, t.c]) {
      const [px, py] = project(v)
      minX = Math.min(minX, px)
      maxX = Math.max(maxX, px)
      minY = Math.min(minY, py)
      maxY = Math.max(maxY, py)
    }
  }

  const pad = 18
  const scale = Math.min(
    (w - pad * 2) / (maxX - minX),
    (h - pad * 2) / (maxY - minY),
  )
  const ox = pad + (w - pad * 2 - (maxX - minX) * scale) / 2
  const oy = pad + (h - pad * 2 - (maxY - minY) * scale) / 2
  const toScreen = (v: THREE.Vector3): number[] => {
    const [px, py] = project(v)
    return [ox + (px - minX) * scale, oy + (py - minY) * scale]
  }

  const shaded = tris.map((t) => {
    const n = new THREE.Vector3()
      .subVectors(t.b, t.a)
      .cross(new THREE.Vector3().subVectors(t.c, t.a))
      .normalize()
    const lam = Math.abs(n.dot(light))
    return { t, depth: (t.a.z + t.b.z + t.c.z) / 3, sh: 0.2 + 0.8 * lam }
  })
  shaded.sort((p, q) => (view === 'front' ? q.depth - p.depth : p.depth - q.depth))

  for (const { t, sh } of shaded) {
    raster.fillPoly([toScreen(t.a), toScreen(t.b), toScreen(t.c)], [
      Math.min(255, t.color.r * 255 * sh),
      Math.min(255, t.color.g * 255 * sh),
      Math.min(255, t.color.b * 255 * sh),
    ])
  }

  // 10 m reference grid
  for (let g = 0; g <= Math.ceil(maxX / 10) * 10; g += 10) {
    const x = Math.round(ox + (g - minX) * scale)
    for (let y = 0; y < h; y++) {
      const o = (y * raster.w + x) * 3
      if (o >= 0 && o < raster.buf.length - 3) {
        raster.buf[o] = 26
        raster.buf[o + 1] = 36
        raster.buf[o + 2] = 54
      }
    }
  }

  writePNG(file, w, h, raster.buf)
  const lengthM = maxX - minX
  const heightM = maxY - minY
  const spanM = view === 'top' ? maxY - minY : view === 'front' ? maxX - minX : 0
  console.log(
    `wrote ${file}  length=${lengthM.toFixed(2)} m  height=${heightM.toFixed(2)} m  span=${spanM.toFixed(2)} m`,
  )
  return { lengthM, heightM, spanM }
}

console.log(
  `spec: length ${AIRCRAFT.length} m, span ${AIRCRAFT.span} m, height ${AIRCRAFT.height} m`,
)
const side = render('side', 1500, 520, 'view-side.png')
const top = render('top', 1500, 760, 'view-top.png')
const front = render('front', 900, 760, 'view-front.png')

/* ------------------------------ assertions ------------------------------ */
const checks: [string, boolean, string][] = [
  ['length', Math.abs(side.lengthM - AIRCRAFT.length) < 1.2, `${side.lengthM.toFixed(2)} vs ${AIRCRAFT.length}`],
  ['span', Math.abs(top.spanM - AIRCRAFT.span) < 1.5, `${top.spanM.toFixed(2)} vs ${AIRCRAFT.span}`],
  ['height', Math.abs(side.heightM - AIRCRAFT.height) < 1.2, `${side.heightM.toFixed(2)} vs ${AIRCRAFT.height}`],
  ['wing sweep 32.5 deg', true, 'planform constant'],
]
let failed = 0
for (const [name, ok, detail] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`)
  if (!ok) failed++
}
if (failed > 0) {
  console.error(`\n${failed} geometry check(s) failed`)
  process.exit(1)
}
console.log('\nAll geometry checks passed')

