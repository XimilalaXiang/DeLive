function sanitizeFileNameSegment(value: string): string {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'mindmap'
}

function buildTimestamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

export function buildMindMapExportBaseName(title: string): string {
  return `${sanitizeFileNameSegment(title)}_${buildTimestamp()}`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getMindMapCssRules(): string {
  let cssText = ''
  const relevantSelectors = ['.markmap', 'text', 'path', 'line', 'circle', 'foreignObject']

  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(styleSheet.cssRules || [])
      for (const rule of rules) {
        const selectorText = 'selectorText' in rule
          ? String((rule as CSSStyleRule).selectorText || '')
          : ''
        if (relevantSelectors.some((selector) => selectorText.includes(selector))) {
          cssText += `${rule.cssText}\n`
        }
      }
    } catch (error) {
      console.warn('Failed to read CSS rules for mind map export:', error)
    }
  }

  return cssText
}

function createExportableSvg(svg: SVGSVGElement): {
  markup: string
  width: number
  height: number
} {
  const mainGroup = svg.querySelector('g')
  if (!mainGroup) {
    throw new Error('未找到思维导图 SVG 内容')
  }

  const bbox = mainGroup.getBBox()
  if (bbox.width === 0 || bbox.height === 0) {
    throw new Error('思维导图尺寸为空，无法导出')
  }

  const svgClone = svg.cloneNode(true) as SVGSVGElement
  svgClone.removeAttribute('style')
  svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  svgClone.setAttribute('width', String(bbox.width))
  svgClone.setAttribute('height', String(bbox.height))
  svgClone.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)

  const groupInClone = svgClone.querySelector('g')
  if (groupInClone) {
    groupInClone.removeAttribute('transform')
  }

  const style = document.createElement('style')
  style.textContent = getMindMapCssRules()
  svgClone.insertBefore(style, svgClone.firstChild)

  let serialized = new XMLSerializer().serializeToString(svgClone)
  serialized = serialized
    .replace(/(\w+)?:?xlink=/g, 'xmlns:xlink=')
    .replace(/NS\d+:href/g, 'xlink:href')

  return {
    markup: `<?xml version="1.0" encoding="UTF-8"?>${serialized}`,
    width: bbox.width,
    height: bbox.height,
  }
}

function dataUrlFromSvgMarkup(svgMarkup: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMarkup)))}`
}

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/png')
  })

  if (blob) {
    return blob
  }

  const dataUrl = canvas.toDataURL('image/png')
  const response = await fetch(dataUrl)
  return response.blob()
}

export function exportMindMapSvg(svg: SVGSVGElement, filenameBase: string): void {
  const { markup } = createExportableSvg(svg)
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, `${filenameBase}.svg`)
}

export async function exportMindMapPng(
  svg: SVGSVGElement,
  filenameBase: string,
): Promise<void> {
  const { markup, width, height } = createExportableSvg(svg)
  const url = dataUrlFromSvgMarkup(markup)

  try {
    const margin = 20
    const scale = 3
    const image = new Image()
    image.decoding = 'async'

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Failed to load SVG image'))
      image.src = url
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil((width + margin * 2) * scale)
    canvas.height = Math.ceil((height + margin * 2) * scale)
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Canvas context unavailable')
    }

    context.imageSmoothingEnabled = false
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    if ('decode' in image && typeof image.decode === 'function') {
      await image.decode()
    }

    context.drawImage(
      image,
      margin * scale,
      margin * scale,
      width * scale,
      height * scale,
    )

    const pngBlob = await blobFromCanvas(canvas)

    triggerDownload(pngBlob, `${filenameBase}.png`)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`PNG 导出失败：${message}`)
  }
}
