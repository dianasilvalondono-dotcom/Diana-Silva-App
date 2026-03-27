import { useState } from 'react'
import { C } from '../constants/colors'

export default function AuthScreen({ onSignInGoogle, onSignInEmail, onSignUp }) {
  const [mode, setMode] = useState('login')
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

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'inherit',
    outline: 'none', color: C.text, background: C.card, boxSizing: 'border-box',
    marginBottom: 12,
  }

  return (
    <div style={{
      maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative Ronda circles */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: '50%', background: `${C.mint}20` }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: `${C.lavanda}15` }} />
      <div style={{ position: 'absolute', top: '30%', left: -20, width: 80, height: 80, borderRadius: '50%', background: `${C.coral}10` }} />
      <div style={{ position: 'absolute', bottom: '20%', right: -15, width: 60, height: 60, borderRadius: '50%', background: `${C.gold}15` }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%', border: `3px solid ${C.teal}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.teal }} />
        </div>
        <span style={{
          fontSize: 36, fontWeight: 400, color: C.text, letterSpacing: '0.15em',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>Ronda</span>
      </div>

      <div style={{
        fontSize: 16, color: C.teal, fontWeight: 600, fontStyle: 'italic',
        fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 40,
      }}>
        Creces tú, crecemos todas
      </div>

      {/* Card */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 4px 20px rgba(27,138,122,0.08)', position: 'relative',
      }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 6,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {mode === 'login' ? 'Bienvenida de vuelta' : 'Únete a Ronda'}
        </div>
        <div style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>
          {mode === 'login' ? 'Tu refugio para crecer, sanar y volar' : 'Crea tu cuenta y empieza tu camino'}
        </div>

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
              fontSize: 14, color: C.coral, background: C.roseLight, padding: '10px 14px',
              borderRadius: 10, marginBottom: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 14, borderRadius: 12, border: 'none',
            background: loading ? C.border : `linear-gradient(135deg, ${C.gold}, ${C.rose})`,
            color: 'white', fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
            fontFamily: 'inherit', marginBottom: 16,
            boxShadow: loading ? 'none' : '0 4px 12px rgba(201,169,110,0.3)',
          }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{
            background: 'none', border: 'none', fontSize: 14, color: C.teal,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.subtle, marginTop: 32, textAlign: 'center', lineHeight: 1.5, position: 'relative' }}>
        Tu refugio para crecer, sanar y volar — en ronda, nunca sola.
      </div>
    </div>
  )
}
