import { useState } from 'react'

const C = {
  rose: '#C4908A',
  roseDark: '#A6716B',
  roseLight: '#E8C4C0',
  gold: '#C9A96E',
  goldDark: '#A68B52',
  cream: '#FBF6F3',
  card: '#FFFFFF',
  border: '#E8DED4',
  text: '#4A3035',
  muted: '#7A6065',
  subtle: '#B5A099',
}

export default function AuthScreen({ onSignInGoogle, onSignInEmail, onSignUp }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }
        const result = await onSignUp(email, password, name)
        if (result.error) setError(result.error.message || 'Error al crear cuenta')
      } else {
        const result = await onSignInEmail(email, password)
        if (result.error) setError(result.error.message || 'Email o contraseña incorrectos')
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    const result = await onSignInGoogle()
    if (result.error) setError(result.error.message || 'Error con Google')
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: 15, fontFamily: 'inherit',
    outline: 'none', color: C.text, background: C.card, boxSizing: 'border-box',
    marginBottom: 12,
  }

  return (
    <div style={{
      maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', border: '3px solid #C9A96E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#C9A96E' }} />
        </div>
        <span style={{
          fontSize: 36, fontWeight: 400, color: C.text, letterSpacing: '0.15em',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>Ronda</span>
      </div>

      <div style={{
        fontSize: 16, color: C.gold, fontWeight: 600, fontStyle: 'italic',
        fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 40,
      }}>
        Creces tú, crecemos todas
      </div>

      {/* Card */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 4px 20px rgba(74,48,53,0.08)',
      }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 6,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {mode === 'login' ? 'Bienvenida de vuelta' : 'Únete a Ronda'}
        </div>
        <div style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>
          {mode === 'login' ? 'Tu espacio de crecimiento te espera' : 'Crea tu cuenta y empieza tu camino'}
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} style={{
          width: '100%', padding: 14, borderRadius: 12,
          border: `1.5px solid ${C.border}`, background: C.card,
          fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10, marginBottom: 20,
          transition: 'all 0.15s',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>o con email</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Tu nombre" style={inputStyle}
            />
          )}
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inputStyle} required
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Contraseña" style={inputStyle} required minLength={6}
          />

          {error && (
            <div style={{
              fontSize: 13, color: '#D32F2F', background: '#FFEBEE', padding: '10px 14px',
              borderRadius: 10, marginBottom: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 14, borderRadius: 12, border: 'none',
            background: loading ? C.border : `linear-gradient(135deg, ${C.rose}, ${C.gold})`,
            color: 'white', fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', marginBottom: 16,
            boxShadow: loading ? 'none' : '0 4px 12px rgba(196,144,138,0.3)',
          }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{
            background: 'none', border: 'none', fontSize: 14, color: C.rose,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 12, color: C.subtle, marginTop: 32, textAlign: 'center', lineHeight: 1.5 }}>
        Tu espacio seguro de crecimiento
      </div>
    </div>
  )
}
