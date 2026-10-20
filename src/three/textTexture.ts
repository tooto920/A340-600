import * as THREE from 'three'

/**
 * Creates a canvas-backed texture used for the tail registration.
 * The text is rendered once and cached, so no per-frame texture work happens.
 */
export function createTextTexture(
  text: string,
  options: {
    width?: number
    height?: number
    color?: string
    font?: string
    letterSpacing?: number
  } = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const {
    width = 1024,
    height = 192,
    color = '#dfe6ee',
    font = '600 104px "Inter", "Segoe UI", Arial, sans-serif',
    letterSpacing = 14,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = color
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if ('letterSpacing' in ctx) {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing}px`
    }
    ctx.fillText(text, width / 2, height / 2 + 6)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.needsUpdate = true
  return { texture, aspect: width / height }
}
