import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, FolderOpen, LogOut } from 'lucide-react'
import getAPI from '@/services/api'
import { useToast } from '@/components/ui/use-toast'

type Settings = {
  tmdb_token: string
  omdb_api_key: string
  jackett_url: string
  jackett_api_key: string
  subtitles_username: string
  subtitles_email: string
  subtitles_pass: string
  subtitles_key: string
  downloads_path: string
  metadata_path: string
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1.5 h-6 bg-primary rounded-full" />
      <h2 className="text-xl font-bold font-headline text-on-surface">{title}</h2>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  type = 'text',
  placeholder,
  hint,
  onChange,
}: {
  label: string
  name: keyof Settings
  value: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  hint?: string
  onChange: (key: keyof Settings, val: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && visible ? 'text' : type

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold font-label uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>
      <div className="relative">
        <input
          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-body text-sm text-on-surface outline-none"
          type={inputType}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(name, e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface-variant transition-colors"
            tabIndex={-1}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && (
        <p className="text-xs font-body text-on-surface-variant/70 leading-relaxed">{hint}</p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    getAPI()
      .getSettings()
      .then(data => {
        setSettings(data as Partial<Settings>)
        setLoading(false)
      })
  }, [])

  function set(key: keyof Settings, val: string) {
    setSettings(prev => ({ ...prev, [key]: val }))
  }

  function get(key: keyof Settings) {
    return settings[key] ?? ''
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await getAPI().updateSettings(settings as Record<string, string>)
      toast({ title: 'Configurações salvas', variant: 'default' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    navigate(-1)
  }

  function handleLogout() {
    getAPI().logout()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-on-surface-variant font-body text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <div className="max-w-screen-xl mx-auto py-10 px-4 md:px-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar */}
        <aside className="md:col-span-3">
          <div className="sticky top-24 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-extrabold font-headline tracking-tight text-on-surface">
                Configurações
              </h1>
              <p className="text-sm text-on-surface-variant font-body mt-1">
                Gerencie suas integrações e credenciais
              </p>
            </div>
            <nav className="flex flex-col gap-1">
              <a
                href="#api-connections"
                className="text-sm font-body text-primary font-semibold px-3 py-2 rounded-lg bg-surface-container-low"
              >
                Conexões API
              </a>
              <a
                href="#data-folders"
                className="text-sm font-body text-on-surface-variant hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface-container-low"
              >
                Pastas de Dados
              </a>
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-body text-on-surface-variant hover:text-on-surface transition-colors px-3 py-2 rounded-lg hover:bg-surface-container-low w-fit"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="md:col-span-9 bg-surface-container-lowest rounded-2xl shadow-[0px_10px_30px_rgba(62,86,170,0.08)] overflow-hidden">
          <form onSubmit={handleSave}>
            <div className="p-8 space-y-10">
              {/* API Connections */}
              <section id="api-connections">
                <SectionHeading title="Provedores de Dados (TMDB & OMDB)" />
                <div className="space-y-6">
                  <Field
                    label="TheMovieDB Token"
                    name="tmdb_token"
                    value={get('tmdb_token')}
                    type="password"
                    placeholder="Insira seu token de acesso TMDB"
                    onChange={set}
                  />
                  <Field
                    label="OMDB API Key"
                    name="omdb_api_key"
                    value={get('omdb_api_key')}
                    placeholder="OMDB API Key"
                    onChange={set}
                  />
                </div>
              </section>

              {/* Jackett */}
              <section>
                <SectionHeading title="Indexador (Jackett)" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Jackett URL"
                    name="jackett_url"
                    value={get('jackett_url')}
                    placeholder="http://jackett:9117"
                    onChange={set}
                  />
                  <Field
                    label="Jackett API Key"
                    name="jackett_api_key"
                    value={get('jackett_api_key')}
                    type="password"
                    placeholder="API Key do seu Jackett"
                    onChange={set}
                  />
                </div>
              </section>

              {/* OpenSubtitles */}
              <section>
                <SectionHeading title="Legendas (OpenSubtitles)" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="OpenSubtitles Username"
                    name="subtitles_username"
                    value={get('subtitles_username')}
                    placeholder="Username"
                    onChange={set}
                  />
                  <Field
                    label="OpenSubtitles Email"
                    name="subtitles_email"
                    value={get('subtitles_email')}
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    onChange={set}
                  />
                  <Field
                    label="OpenSubtitles Password"
                    name="subtitles_pass"
                    value={get('subtitles_pass')}
                    type="password"
                    placeholder="Sua senha"
                    onChange={set}
                  />
                  <Field
                    label="OpenSubtitles API Key"
                    name="subtitles_key"
                    value={get('subtitles_key')}
                    type="password"
                    placeholder="API Key gerada no site"
                    onChange={set}
                  />
                </div>
              </section>

              {/* Data Folders */}
              <section id="data-folders">
                <SectionHeading title="Pastas de Dados" />
                <div className="space-y-6">
                  <div className="flex items-start gap-3 px-4 py-3 bg-surface-container-low rounded-xl">
                    <FolderOpen size={16} className="text-primary mt-0.5 shrink-0" />
                    <p className="text-xs font-body text-on-surface-variant leading-relaxed">
                      Caminhos relativos são resolvidos a partir do diretório do servidor.
                      As alterações aplicam-se aos novos downloads — os arquivos já existentes não são movidos.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field
                      label="Pasta de Downloads"
                      name="downloads_path"
                      value={get('downloads_path')}
                      placeholder="downloads"
                      hint="Onde os torrents são salvos. Ex: /data/torrents"
                      onChange={set}
                    />
                    <Field
                      label="Pasta de Metadados"
                      name="metadata_path"
                      value={get('metadata_path')}
                      placeholder="metadata"
                      hint="Onde os arquivos .torrent são armazenados. Ex: /data/metadata"
                      onChange={set}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="bg-surface-container-low px-8 py-6 flex justify-end items-center gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="text-on-surface-variant font-semibold font-body px-6 py-2.5 hover:underline transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-br from-primary to-primary-container text-white px-10 py-3 rounded-xl font-bold font-headline shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
