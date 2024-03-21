import { saveAs } from 'file-saver'

import { FaDownload } from 'react-icons/fa'
import { Subtitle } from 'src/services/types/subtitles'
import { useToast } from '@/components/ui/use-toast'
import getAPI from '@/services/api'

interface Props {
  subtitle: Subtitle
}

function SubtitleItem({ subtitle }: Props) {
  const { toast } = useToast()
  const api = getAPI()

  async function handleSubDownload() {
    try {
      const fileId = subtitle.attributes.files[0].file_id
      const response = await api.downloadSubtitles(fileId)
      saveAs(response.data.link, response.data.file_name)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Nao foi possivel fazer o download das legendas',
        variant: 'destructive'
      })
    }
  }

  return (
    <li className="my-2 cursor-pointer" onClick={handleSubDownload}>
      <div className="flex items-center justify-start gap-2">
        <FaDownload /> <p>{subtitle.attributes.release} ({subtitle.attributes.language.toUpperCase()}) </p>
      </div>
    </li>
  )
}

export default SubtitleItem
