import { useEffect, useRef, useCallback } from 'react'

interface WaveformVisualizerProps {
  getStream: () => MediaStream | null
  isActive: boolean
  barCount?: number
  height?: number
  className?: string
}

export function WaveformVisualizer({
  getStream,
  isActive,
  barCount = 40,
  height = 48,
  className = '',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (contextRef.current && contextRef.current.state !== 'closed') {
      void contextRef.current.close()
      contextRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => {
    if (!isActive) {
      cleanup()
      return
    }

    const stream = getStream()
    if (!stream) return

    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    analyser.smoothingTimeConstant = 0.7

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    contextRef.current = audioCtx
    analyserRef.current = analyser
    sourceRef.current = source

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas || !analyserRef.current) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)

      analyserRef.current.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, rect.width, rect.height)

      const totalBars = barCount
      const gap = 2
      const barWidth = (rect.width - (totalBars - 1) * gap) / totalBars
      const maxBarHeight = rect.height * 0.85
      const minBarHeight = 2

      const step = Math.max(1, Math.floor(dataArray.length / totalBars))

      for (let i = 0; i < totalBars; i++) {
        const dataIndex = Math.min(i * step, dataArray.length - 1)
        const value = dataArray[dataIndex] / 255
        const barHeight = Math.max(minBarHeight, value * maxBarHeight)

        const x = i * (barWidth + gap)
        const y = (rect.height - barHeight) / 2

        const hue = 210 + value * 40
        const lightness = 50 + value * 15
        ctx.fillStyle = `hsla(${hue}, 80%, ${lightness}%, ${0.6 + value * 0.4})`

        const radius = Math.min(barWidth / 2, barHeight / 2, 3)
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, radius)
        ctx.fill()
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return cleanup
  }, [isActive, getStream, barCount, cleanup])

  if (!isActive) return null

  return (
    <canvas
      ref={canvasRef}
      style={{ height }}
      className={`w-full ${className}`}
    />
  )
}
