import { saveAs } from "file-saver";
import { FaDownload } from "react-icons/fa";

import { useToast } from "@/components/ui/use-toast";
import { Subtitle } from "@/services/types/subtitles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import getAPI from "@/services/api";

interface Props {
  subtitles: Subtitle[] | undefined;
}

function SubtitleRow({
  subtitle,
  onDownload,
}: {
  subtitle: Subtitle;
  onDownload: (s: Subtitle) => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4 text-sm font-semibold uppercase">
        {subtitle.attributes.language}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground truncate max-w-[300px]">
        {subtitle.attributes.release || "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {subtitle.attributes.uploader.name}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground whitespace-nowrap">
        {subtitle.attributes.download_count.toLocaleString()} downloads
      </td>
      <td className="py-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(subtitle)}
        >
          <FaDownload className="mr-1.5" />
          Baixar
        </Button>
      </td>
    </tr>
  );
}

export default function SubtitlesGrid({ subtitles }: Props) {
  const { toast } = useToast();
  const api = getAPI();

  async function handleDownload(subtitle: Subtitle) {
    try {
      const fileId = subtitle.attributes.files[0].file_id;
      const response = await api.downloadSubtitles(fileId);
      saveAs(response.link, response.file_name);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível baixar a legenda",
        variant: "destructive",
      });
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Legendas</h2>

      {(!subtitles || subtitles.length === 0) && (
        <Alert variant="destructive">
          <AlertTitle>Sem legendas</AlertTitle>
          <AlertDescription>
            Nenhuma legenda disponível para essa mídia.
          </AlertDescription>
        </Alert>
      )}

      {subtitles && subtitles.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Idioma
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Release
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Enviado por
                </th>
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Downloads
                </th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {subtitles.map((subtitle) => (
                <SubtitleRow
                  key={subtitle.id}
                  subtitle={subtitle}
                  onDownload={handleDownload}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
