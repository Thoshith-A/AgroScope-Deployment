import express from 'express'

const router = express.Router()

function getMockAnalysis(lat, lon) {
  const seed = Math.abs(
    Math.sin(lat * 127.1) * Math.cos(lon * 311.7)
  )
  const ndvi = parseFloat((0.25 + seed * 0.70).toFixed(2))
  const healthScore = Math.min(97, Math.round(ndvi * 100))

  return {
    status: 'success',
    health_score: healthScore,
    ndvi: ndvi,
    yield_potential: `${healthScore}%`,
    condition: healthScore > 60
      ? 'Healthy'
      : healthScore > 30
        ? 'Moderate'
        : 'Stressed',
    source: 'mock'
  }
}

router.post('/analyze', (req, res) => {
  try {
    const lat = parseFloat(req.body?.lat ?? 20)
    const lon = parseFloat(req.body?.lon ?? 78)
    res.json(getMockAnalysis(lat, lon))
  } catch (err) {
    // Always return 200 — never crash demo
    res.json(getMockAnalysis(20, 78))
  }
})

export default router

