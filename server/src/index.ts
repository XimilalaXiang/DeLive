import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { createVolcProxyServer } from './volcProxy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 23456

// 创建 HTTP 服务器
const server = createServer(app)

// 创建 WebSocket 服务器用于火山引擎代理
const wss = new WebSocketServer({ 
  server,
  path: '/ws/volc'
})

// 初始化火山引擎代理
createVolcProxyServer(wss)

// 中间件
app.use(cors())
app.use(express.json())

// API路由：生成临时API密钥
app.post('/api/temporary-api-key', async (req, res) => {
  const { apiKey } = req.body

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' })
  }

  try {
    const response = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 300, // 5分钟有效期
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return res.status(response.status).json({ 
        error: 'Failed to generate temporary API key',
        details: errorData 
      })
    }

    const data = await response.json()
    res.json(data)
  } catch (error) {
    console.error('Error generating temporary API key:', error)
    res.status(500).json({ 
      error: 'Server error while generating temporary API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 生产环境下提供静态文件
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(frontendPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'))
  })
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`🔌 WebSocket proxy for Volcengine available at ws://localhost:${PORT}/ws/volc`)
})
