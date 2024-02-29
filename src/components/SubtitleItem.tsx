'use client'

import React from 'react'
import axios from 'axios'
import { saveAs } from 'file-saver'

import { FaDownload } from 'react-icons/fa'
import { Subtitle, SubtitleDownloadResponse } from 'src/services/types/subtitles'
import { useToast } from 'src/ui/use-toast'

interface Props {
  subtitle: Subtitle
}

function SubtitleItem({ subtitle }: Props) {
  const { toast } = useToast()

  async function handleSubDownload() {
    try {
      const fileId = subtitle.attributes.files[0].file_id
      const response = await axios.get<SubtitleDownloadResponse>(`/subtitles/${fileId}`)
      saveAs(response.data.link, response.data.file_name)
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data.error ?? '',
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
