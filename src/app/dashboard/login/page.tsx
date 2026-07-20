'use client'

import { useState } from 'react'
import { Sparkles, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setIsLoggingIn(true)
    setErrorMsg('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setErrorMsg('No se ha podido iniciar sesión. Revisa los datos.')
      } else {
        // Redirigir al dashboard y forzar refresh para que middleware aplique
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setErrorMsg('No se ha podido iniciar sesión. Revisa los datos.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20">
      <div className="w-full max-w-sm bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-2xl border border-white/5 flex flex-col gap-6 items-center text-center">
        <div className="w-16 h-16 bg-primary-DEFAULT/15 rounded-full flex items-center justify-center mb-1 text-primary-DEFAULT">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-5 h-5 text-primary-DEFAULT animate-pulse" /> Acceso Restringido
          </h1>
          <p className="text-xs text-slate-400 mt-1">Lumina Admin</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 rounded-full bg-slate-800/80 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-center text-white placeholder-slate-500 transition-all font-mono mb-2"
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 rounded-full bg-slate-800/80 border border-white/5 focus:border-primary-DEFAULT/50 focus:outline-none text-sm text-center text-white placeholder-slate-500 transition-all font-mono"
              required
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-semibold px-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-full bg-primary-DEFAULT hover:bg-primary-dark text-slate-950 font-bold transition-all transform active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isLoggingIn ? 'Comprobando...' : 'Entrar al panel'}
          </button>
        </form>

        <Link 
          href="/" 
          className="mt-2 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Volver al feed público
        </Link>
      </div>
    </div>
  )
}
