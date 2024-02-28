'use client'

import ErrorCard from "src/components/ErrorCard";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="w-[100dvw] h-[100dvh]">
        <ErrorCard error={error} reset={reset} />
      </body>
    </html>
  )
}
