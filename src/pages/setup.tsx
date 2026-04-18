import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import getAPI from '@/services/api'
import { Button } from '@/components/ui/button'

export default function SetupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await getAPI().setup(username, password)
      navigate('/')
    } catch {
      setError('Falha ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 bg-slate-900 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Configuração inicial</h1>
        <p className="text-slate-400 text-sm mb-6">Crie a conta de administrador para começar.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="text"
            placeholder="Nome de usuário"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            className="px-3 py-2 rounded bg-slate-800 text-white border border-slate-700 focus:outline-none focus:border-slate-500"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </div>
  )
}
