'use client'

import { useEffect, useState } from 'react'
import { Progress } from 'src/ui/progress'

export default function Loading() {
  const [progress, setProgress] = useState(13)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(prev => prev + 13), 300)
    return () => clearTimeout(timer)
  }, [])

  return <Progress className="fixed top-0 left-0 h-1 w-full z-50" value={progress} />
}
