import React from 'react'

import { TbFaceIdError } from "react-icons/tb";
import { Button } from "src/ui/button"
import { Card, CardContent, CardHeader } from "src/ui/card"

function ErrorCard({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card className="max-w-sm bg-black border-slate-100">
      <CardHeader className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center">
          <TbFaceIdError className="w-8 h-8 text-slate-200 fill-current dark:text-gray-200" />
        </div>
        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold text-slate-300">Algo de errado não está certo!</h2>
          <p className="mt-2 text-sm text-slate-400 dark:text-gray-400">
            {error && (error.message)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex w-full justify-center p-6">
        <Button onClick={() => reset()} className="w-full max-w-sm bg-black text-white hover:bg-foreground hover:text-white" variant="outline">
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  )
}

export default ErrorCard
