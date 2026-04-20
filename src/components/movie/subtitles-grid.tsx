import { saveAs } from "file-saver";
import { useEffect, useRef, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { Upload, Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import { Subtitle } from "@/services/types/subtitles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import getAPI from "@/services/api";

interface DownloadRef {
  infoHash: string;
  name: string;
}

interface LocalSubtitle {
  filename: string;
  url: string;
}

interface Props {
  subtitles: Subtitle[] | undefined;
  downloads?: DownloadRef[];
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(subtitle)}
          >
            <FaDownload className="mr-1.5" />
            Baixar
          </Button>
          {subtitle.attributes.url && (
            <Button size="sm" variant="ghost" asChild>
              <a href={subtitle.attributes.url} target="_blank" rel="noopener noreferrer">
                OpenSubtitles ↗
              </a>
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function LocalSubtitlesSection({ downloads }: { downloads: DownloadRef[] }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHash, setSelectedHash] = useState<string>(
    downloads[0]?.infoHash ?? "",
  );
  const [localSubs, setLocalSubs] = useState<LocalSubtitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (downloads.length > 0 && !selectedHash) {
      setSelectedHash(downloads[0].infoHash);
    }
  }, [downloads, selectedHash]);

  useEffect(() => {
    if (!selectedHash) return;
    const token = localStorage.getItem("token") ?? "";
    setLoading(true);
    fetch(`/api/local-subtitles/${selectedHash}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? (r.json() as Promise<LocalSubtitle[]>) : []))
      .then((data) => setLocalSubs(data))
      .catch(() => setLocalSubs([]))
      .finally(() => setLoading(false));
  }, [selectedHash]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedHash) return;
    e.target.value = "";

    const token = localStorage.getItem("token") ?? "";
    const formData = new FormData();
    formData.append("subtitle", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/subtitle-upload/${selectedHash}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error();
      const added = (await res.json()) as LocalSubtitle;
      setLocalSubs((prev) => {
        if (prev.find((s) => s.filename === added.filename)) return prev;
        return [...prev, added];
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível fazer o upload da legenda.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Minhas Legendas</h2>

        {downloads.length > 0 && (
          <div className="flex items-center gap-3">
            {downloads.length > 1 && (
              <select
                value={selectedHash}
                onChange={(e) => setSelectedHash(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-56"
              >
                {downloads.map((d) => (
                  <option key={d.infoHash} value={d.infoHash}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={uploading || !selectedHash}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              Upload .srt
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".srt"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        )}
      </div>

      {downloads.length === 0 && (
        <Alert>
          <AlertTitle>Nenhum download encontrado</AlertTitle>
          <AlertDescription>
            Inicie um download para poder adicionar legendas locais.
          </AlertDescription>
        </Alert>
      )}

      {downloads.length > 0 && loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando...
        </div>
      )}

      {downloads.length > 0 && !loading && localSubs.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          Nenhuma legenda local encontrada. Faça upload de um arquivo .srt.
        </p>
      )}

      {downloads.length > 0 && !loading && localSubs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 text-xs text-muted-foreground uppercase tracking-wide">
                  Arquivo
                </th>
                <th className="pb-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {localSubs.map((sub) => (
                <tr
                  key={sub.filename}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 pr-4 text-sm">{sub.filename}</td>
                  <td className="py-3">
                    <Button size="sm" variant="outline" asChild>
                      <a href={sub.url} download={sub.filename}>
                        <FaDownload className="mr-1.5" />
                        Baixar
                      </a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SubtitlesGrid({ subtitles, downloads = [] }: Props) {
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
    <section className="mb-8 flex flex-col gap-8">
      {/* Remote subtitles from OpenSubtitles */}
      <div>
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
      </div>

      {/* Local / uploaded subtitles */}
      <LocalSubtitlesSection downloads={downloads} />
    </section>
  );
}
