import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import getAPI from "@/services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type Settings = {
  tmdb_token: string;
  omdb_api_key: string;
  jackett_url: string;
  jackett_api_key: string;
  subtitles_username: string;
  subtitles_email: string;
  subtitles_pass: string;
  subtitles_key: string;
};

const LABELS: Record<keyof Settings, string> = {
  tmdb_token: "TheMovieDB Token",
  omdb_api_key: "OMDB API Key",
  jackett_url: "Jackett URL",
  jackett_api_key: "Jackett API Key",
  subtitles_username: "OpenSubtitles Username",
  subtitles_email: "OpenSubtitles Email",
  subtitles_pass: "OpenSubtitles Password",
  subtitles_key: "OpenSubtitles API Key",
};

const PASSWORD_FIELDS: (keyof Settings)[] = [
  "subtitles_pass",
  "tmdb_token",
  "jackett_api_key",
  "subtitles_key",
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    getAPI()
      .getSettings()
      .then((data) => {
        setSettings(data as Partial<Settings>);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await getAPI().updateSettings(settings as Record<string, string>);
      toast({ title: "Configurações salvas", variant: "default" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    getAPI().logout();
    navigate("/login");
  }

  if (loading) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <button onClick={handleLogout} className="text-sm text-slate-400">
          Sair
        </button>
      </div>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {(Object.keys(LABELS) as (keyof Settings)[]).map((key) => (
          <div key={key}>
            <label className="block text-sm text-slate-400 mb-1">
              {LABELS[key]}
            </label>
            <input
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-slate-500"
              type={PASSWORD_FIELDS.includes(key) ? "password" : "text"}
              value={settings[key] || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, [key]: e.target.value }))
              }
            />
          </div>
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </div>
  );
}
