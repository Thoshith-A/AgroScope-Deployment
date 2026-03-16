import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

interface CropDetectButtonProps {
  onDetected: (cropType: string) => void
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

function fallbackCropFromHints(filename: string, labels: string[] = []): string | null {
  const text = `${filename} ${labels.join(' ')}`.toLowerCase()
  if (text.includes('coco') || text.includes('coconut') || text.includes('nut shell') || (text.includes('shell') && text.includes('coco'))) return 'Coconut Shells'
  if (text.includes('paddy') || (text.includes('rice') && text.includes('husk'))) return 'Paddy Husk'
  if (text.includes('rice') && text.includes('straw')) return 'Rice Straw'
  if (text.includes('rice') && !text.includes('straw')) return 'Rice Husk'
  if (text.includes('wheat') || text.includes('straw') || text.includes('hay')) return 'Wheat Straw'
  if (text.includes('barley')) return 'Barley Straw'
  if (text.includes('oat')) return 'Oat Straw'
  if (text.includes('corn') || text.includes('maize') || text.includes('cob')) return text.includes('cob') ? 'Maize Cob' : 'Corn Stalks'
  if (text.includes('sugarcane') || text.includes('bagasse') || text.includes('sugar cane')) return 'Sugarcane Bagasse'
  if (text.includes('groundnut') || text.includes('peanut') || text.includes('peanut shell')) return 'Groundnut Shell'
  if (text.includes('cotton')) return 'Cotton Stalk'
  if (text.includes('mustard')) return 'Mustard Stalk'
  if (text.includes('soybean') || text.includes('soya')) return 'Soybean Stalk'
  if (text.includes('sunflower')) return 'Sunflower Stalk'
  if (text.includes('palm') && (text.includes('efb') || text.includes('fruit bunch'))) return 'Palm Empty Fruit Bunch'
  if (text.includes('coffee')) return 'Coffee Husk'
  if (text.includes('tea')) return 'Tea Waste'
  if (text.includes('banana')) return 'Banana Waste'
  if (text.includes('mango')) return 'Mango Waste'
  if (text.includes('vegetable') || text.includes('veg ')) return 'Vegetable Waste'
  if (text.includes('fruit')) return 'Fruit Waste'
  if (text.includes('jute')) return 'Jute Stalk'
  if (text.includes('castor')) return 'Castor Stalk'
  if (text.includes('sesame')) return 'Sesame Stalk'
  if (text.includes('potato') || text.includes('potato vine')) return 'Potato Vine'
  if (text.includes('tomato')) return 'Tomato Waste'
  if (text.includes('chickpea') || text.includes('gram ') || text.includes('chana')) return 'Gram / Chickpea Stalk'
  if (text.includes('pigeon pea') || text.includes('tur ') || text.includes('arhar')) return 'Tur / Pigeon Pea Stalk'
  if (text.includes('oilseed')) return 'Oilseed Waste'
  if (text.includes('brewery') || text.includes('spent grain')) return 'Brewery Spent Grains'
  if (text.includes('sorghum') || text.includes('jowar')) return 'Sorghum Stalk'
  if (text.includes('rye')) return 'Rye Straw'
  if (text.includes('millet') || text.includes('bajra')) return 'Millet Straw'
  if (text.includes('lentil') || text.includes('masoor')) return 'Lentil Stalk'
  if (text.includes('cowpea') || text.includes('black eyed') || text.includes('lobia')) return 'Cowpea / Black-Eyed Pea Stalk'
  if (text.includes('bean ') && !text.includes('soybean')) return 'Bean Stalk'
  if (text.includes('rapeseed') || text.includes('canola')) return 'Rapeseed / Canola Stalk'
  if (text.includes('olive')) return 'Olive Pomace'
  if (text.includes('cocoa') || text.includes('cacao')) return 'Cocoa Pod Husk'
  if (text.includes('tobacco')) return 'Tobacco Stalk'
  if (text.includes('hemp')) return 'Hemp Stalk'
  if (text.includes('cassava') || text.includes('tapioca')) return 'Cassava Peel / Residue'
  if (text.includes('citrus') || text.includes('orange') || text.includes('lemon') || text.includes('grapefruit')) return 'Citrus Waste'
  if (text.includes('grape') && text.includes('pomace')) return 'Grape Pomace'
  if (text.includes('grape')) return 'Grape Pomace'
  if (text.includes('almond')) return 'Almond Shell'
  if (text.includes('cashew')) return 'Cashew Shell'
  if (text.includes('pea ') && !text.includes('cowpea') && !text.includes('chickpea')) return 'Pea Stalk'
  if (text.includes('agricultural') || text.includes('crop residue') || text.includes('biomass')) return 'Other Agricultural Waste'
  return null
}

const API_BASE =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? ''

export default function CropDetectButton({ onDetected }: CropDetectButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [detected, setDetected] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const compressImage = (file: File, maxWidth: number, quality: number): Promise<Blob> => (
    new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1)
        const width = Math.max(1, Math.round(img.width * ratio))
        const height = Math.max(1, Math.round(img.height * ratio))
        canvas.width = width
        canvas.height = height
        if (!ctx) {
          reject(new Error('No canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
          'image/jpeg',
          quality,
        )
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = URL.createObjectURL(file)
    })
  )

  const toBase64 = (blob: Blob): Promise<string> => (
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        const base64 = result.split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(blob)
    })
  )

  const prepareImageForVision = async (file: File): Promise<string> => {
    // Keep request payload comfortably below backend limits.
    const attempts: Array<{ maxWidth: number; quality: number }> = [
      { maxWidth: 1400, quality: 0.82 },
      { maxWidth: 1200, quality: 0.72 },
      { maxWidth: 960, quality: 0.62 },
      { maxWidth: 800, quality: 0.55 },
    ]

    for (const attempt of attempts) {
      const compressed = await compressImage(file, attempt.maxWidth, attempt.quality)
      // ~4/3 expansion for base64; keep binary < 3MB so JSON remains small.
      if (compressed.size <= 3 * 1024 * 1024) {
        return toBase64(compressed)
      }
    }

    throw new Error('Image is too large. Please capture a closer/smaller photo and try again.')
  }

  const callVisionApi = async (file: File): Promise<string | null> => {
    const imageBase64 = await prepareImageForVision(file)

    const response = await fetch(`${API_BASE}/api/vision/detect-crop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, filenameHint: file.name }),
    })

    if (!response.ok) {
      let message = 'Vision API error'
      try {
        const errJson = await response.json() as { error?: string; message?: string }
        message = errJson.error || errJson.message || message
      } catch {
        message = response.statusText || message
      }
      throw new Error(message)
    }

    const data: { success: boolean; cropType: string | null; labels?: string[] } = await response.json()
    if (data.success && data.cropType) return data.cropType
    return fallbackCropFromHints(file.name, data.labels || [])
  }

  const processFile = (file: File) => {
    if (!isImageFile(file)) return
    setStatus('loading')
    setError('')
    setDetected('')
    ;(async () => {
      try {
        const cropType = await callVisionApi(file)
        if (cropType) {
          setDetected(cropType)
          setStatus('success')
          onDetected(cropType)
        } else {
          setStatus('error')
          setError('Could not confidently detect a supported crop type from this image.')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Vision detection failed'
        setStatus('error')
        setError(msg)
      }
    })()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && isImageFile(file)) processFile(file)
  }

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-lg border-2 border-dashed transition-colors ${isDragging ? 'border-green-500 bg-green-50' : 'border-transparent'}`}
      >
        <button
          type="button"
          onClick={() => {
            setStatus('idle')
            setError('')
            inputRef.current?.click()
          }}
          className="
            inline-flex items-center gap-1.5 
            px-3 py-1.5 w-fit
            text-xs font-medium rounded-md
            border border-green-300 bg-green-50 
            text-green-700 hover:bg-green-100 
            hover:border-green-500
            transition-colors duration-150
          "
        >
          <Camera size={13} />
          Detect Crop Type via Camera
        </button>
        <p className="text-xs text-muted-foreground mt-1 px-0.5">or drag & drop an image here</p>
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-600 font-medium">
          ✓ Detected: <span className="font-semibold">{detected}</span>
        </p>
      )}

      {status === 'loading' && (
        <p className="text-xs text-gray-500">
          Detecting crop type with Google Cloud Vision...
        </p>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-500">
          {error || 'Could not detect crop type from this image.'}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
