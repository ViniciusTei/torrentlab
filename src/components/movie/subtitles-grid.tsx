import { saveAs } from 'file-saver'
import { FaDownload } from 'react-icons/fa'

import { useToast } from '@/components/ui/use-toast'
import { Subtitle } from '@/services/types/subtitles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import getAPI from '@/services/api'

interface Props {
  subtitles: Subtitle[] | undefined
}

export default function SubtitlesGrid({ subtitles }: Props) {
  const { toast } = useToast()
  const api = getAPI()

  async function handleDownload(subtitle: Subtitle) {
    try {
      const fileId = subtitle.attributes.files[0].file_id
      const response = await api.downloadSubtitles(fileId)
      saveAs(response.link, response.file_name)
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar a legenda',
        variant: 'destructive',
      })
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Legendas</h2>

      {(!subtitles || subtitles.length === 0) && (
        <Alert variant="destructive">
          <AlertTitle>Sem legendas</AlertTitle>
          <AlertDescription>Nenhuma legenda disponível para essa mídia.</AlertDescription>
        </Alert>
      )}

      {subtitles && subtitles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {subtitles.map(subtitle => (
            <button
              key={subtitle.id}
              onClick={() => handleDownload(subtitle)}
              className="flex items-center justify-between gap-2 rounded border p-3 text-left hover:bg-muted/50 transition-colors w-full"
            >
              <div className="overflow-hidden">
                <p className="text-sm font-semibold uppercase">{subtitle.attributes.language}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle.attributes.release}</p>
              </div>
              <FaDownload className="flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
