import { inflateSync } from 'node:zlib'

/**
 * Minimal PNG decoder for Playwright screenshots.
 *
 * Handles the subset Chromium produces: 8-bit, non-interlaced, colour type
 * 2 (RGB) or 6 (RGBA). Used to measure what is actually on screen instead
 * of trusting a blank WebGL readback.
 */
export interface PngImage {
  width: number
  height: number
  data: Uint8Array
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePng(buffer: Buffer): PngImage {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) throw new Error('not a PNG buffer')
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat: Buffer[] = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const data = buffer.subarray(dataStart, dataStart + length)

    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data.readUInt8(8)
      colorType = data.readUInt8(9)
      if (data.readUInt8(12) !== 0) throw new Error('interlaced PNG not supported')
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') {
      break
    }

    offset = dataStart + length + 4 // skip the CRC
  }

  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`)
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`)

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const out = new Uint8Array(stride * height)

  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride

    const cur = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const rawByte = line[x]
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0

      let value: number
      switch (filter) {
        case 0: value = rawByte; break
        case 1: value = rawByte + a; break
        case 2: value = rawByte + b; break
        case 3: value = rawByte + ((a + b) >> 1); break
        case 4: value = rawByte + paethPredictor(a, b, c); break
        default: throw new Error(`unknown PNG filter ${filter}`)
      }
      cur[x] = value & 0xff
    }
  }

  return { width, height, data: out }
}

export interface FrameStats {
  /** Number of distinct quantised colours. */
  uniqueColors: number
  /** Pixels that are significantly brighter than the near-black background. */
  brightPixels: number
  /** Pixels that carry a visible blue/cyan tint. */
  accentPixels: number
  /** Standard deviation of luminance. A flat or blank frame scores ~0. */
  lumaStdDev: number
  total: number
}

/** Measures what is actually visible in a decoded frame. */
export function analyseFrame(img: PngImage): FrameStats {
  const colors = new Set<number>()
  let bright = 0
  let accent = 0
  let lumaSum = 0
  let lumaSqSum = 0
  let lumaCount = 0
  const channels = img.data.length / (img.width * img.height)

  for (let i = 0; i < img.data.length; i += channels) {
    const r = img.data[i]
    const g = img.data[i + 1]
    const b = img.data[i + 2]
    colors.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3))
    if (r + g + b > 190) bright++
    // Electric blue accent: blue clearly above red, and not black.
    if (b > r + 26 && b > 70) accent++
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    lumaSum += luma
    lumaSqSum += luma * luma
    lumaCount++
  }

  const mean = lumaSum / lumaCount
  const variance = Math.max(0, lumaSqSum / lumaCount - mean * mean)

  return {
    uniqueColors: colors.size,
    brightPixels: bright,
    accentPixels: accent,
    lumaStdDev: Math.sqrt(variance),
    total: img.width * img.height,
  }
}
