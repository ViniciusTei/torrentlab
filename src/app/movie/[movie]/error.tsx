'use client'

import ErrorCard from "src/components/ErrorCard"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="w-full h-[100dvh] flex items-center justify-center">
      <ErrorCard error={error} reset={reset} />
    </div>
  )
}
