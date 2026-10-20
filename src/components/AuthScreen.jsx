import { useState } from 'react'
import { C } from '../constants/colors'
import { FONT } from '../constants/tokens'
import Button from './ui/Button'

/* Supabase responde en inglés ("Invalid login credentials"…). A la usuaria
   nunca le llega ese texto: se traduce por el código del error y, si no
   trae código, por el mensaje conocido (bienvenida-10). */
const MENSAJES_AUTH = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Primero confirma tu correo: abre el enlace que te enviamos (revisa también la carpeta de spam).',
  user_already_exists: 'Ese correo ya tiene una cuenta. Inicia sesión.',
  email_exists: 'Ese correo ya tiene una cuenta. Inicia sesión.',
  weak_password: 'Esa contraseña es muy fácil de adivinar. Prueba con una más larga, con letras y números.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  email_address_invalid: 'Revisa tu email: parece que no está bien escrito.',
  validation_failed: 'Revisa tu email: parece que no está bien escrito.',
  over_email_send_rate_limit: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  signup_disabled: 'El registro no está disponible en este momento.',
  email_provider_disabled: 'El registro no está disponible en este momento.',
  session_not_found: 'El enlace ya no sirve. Pide uno nuevo desde "¿Olvidaste tu contraseña?".',
  session_expired: 'El enlace ya no sirve. Pide uno nuevo desde "¿Olvidaste tu contraseña?".',
}
const SIN_CONEXION = 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_POR_DEFECTO = {
  login: 'No pudimos iniciar sesión. Revisa tu email y tu contraseña.',
  signup: 'No pudimos crear tu cuenta. Inténtalo de nuevo.',
  reset: 'No pudimos enviar el correo. Inténtalo de nuevo.',
  nueva: 'No pudimos guardar tu contraseña. Inténtalo de nuevo.',
}

function mensajeAuth(error, mode) {
  const code = typeof error === 'object' ? error?.code : undefined
  if (code && MENSAJES_AUTH[code]) return MENSAJES_AUTH[code]
  if (code?.startsWith('over_') || error?.status === 429) return MENSAJES_AUTH.over_request_rate_limit
  const msg = String((typeof error === 'object' ? error?.message : error) || '')
  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0 || error instanceof TypeError ||
    /failed to fetch|load failed|networkerror/i.test(msg)) return SIN_CONEXION
  if (/invalid login credentials/i.test(msg)) return MENSAJES_AUTH.invalid_credentials
  if (/email not confirmed/i.test(msg)) return MENSAJES_AUTH.email_not_confirmed
  if (/already (been )?registered/i.test(msg)) return MENSAJES_AUTH.user_already_exists
  if (/rate limit/i.test(msg)) return MENSAJES_AUTH.over_request_rate_limit
  return MENSAJE_POR_DEFECTO[mode] || MENSAJE_POR_DEFECTO.login
}

/* Modos: 'login', 'signup', 'reset' (pedir el enlace para recuperar la
   contraseña) y 'nueva' (crear la contraseña nueva al volver desde ese
   enlace; lo abre App con modoInicial="nueva"). */
export default function AuthScreen({
  onSignInEmail, onSignUp, onResetPassword, onUpdatePassword, onPasswordUpdated, onCancel,
  modoInicial = 'login',
}) {
  const [mode, setMode] = useState(modoInicial)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  // Aviso que no es error: "te enviamos un correo…" (bienvenida-11).
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const cambiarModo = (m) => { setMode(m); setError(''); setNotice('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'nueva' && password !== password2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Ingresa tu nombre'); setLoading(false); return }
        const result = await onSignUp(email, password, name)
        if (result.error) setError(mensajeAuth(result.error, 'signup'))
        else if (!result.data?.session) {
          // Sin sesión: Supabase pide confirmar el correo. Si identities
          // viene vacío, ese correo ya tenía cuenta (no se envió nada).
          setPassword('')
          setMode('login')
          if (result.data?.user?.identities?.length === 0) setError('Ese correo ya tiene una cuenta. Inicia sesión.')
          else setNotice(`Te enviamos un correo a ${email}. Abre el enlace para activar tu cuenta y luego inicia sesión aquí.`)
        }
      } else if (mode === 'reset') {
        const result = await onResetPassword(email)
        if (result.error) setError(mensajeAuth(result.error, 'reset'))
        else {
          setPassword('')
          setMode('login')
          setNotice(`Listo. Si ${email} tiene una cuenta en Ronda, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.`)
        }
      } else if (mode === 'nueva') {
        const result = await onUpdatePassword(password)
        if (result.error) setError(mensajeAuth(result.error, 'nueva'))
        else { onPasswordUpdated?.(); return }
      } else {
        const result = await onSignInEmail(email, password)
        if (result.error) setError(mensajeAuth(result.error, 'login'))
      }
    } catch (err) {
      setError(mensajeAuth(err, mode))
    }
    setLoading(false)
  }

  const TITULOS = {
    login: ['Bienvenida de vuelta', 'Tu compañera en cada etapa'],
    signup: ['Únete a Ronda', 'Crea tu cuenta y empieza tu camino'],
    reset: ['Recupera tu contraseña', 'Escribe tu email y te enviamos un enlace para crear una nueva.'],
    nueva: ['Crea tu contraseña nueva', 'Con ella vas a entrar de ahora en adelante.'],
  }
  const BOTON = { login: 'Entrar', signup: 'Crear cuenta', reset: 'Enviar enlace', nueva: 'Guardar contraseña' }

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1.5px solid ${C.border}`, fontSize: 16, fontFamily: 'inherit',
    outline: 'none', color: C.text, background: C.card, boxSizing: 'border-box',
    marginBottom: 12,
  }

  return (
    <div style={{
      maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
      fontFamily: FONT,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, position: 'relative', overflow: 'hidden',
    }}>
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
          fontFamily: FONT,
        }}>Ronda</span>
      </div>

      <div style={{
        fontSize: 16, color: C.teal, fontWeight: 600, fontStyle: 'italic',
        fontFamily: FONT, marginBottom: 40,
      }}>
        Creces tú, crecemos todas
      </div>

      {/* Card */}
      <div style={{
        background: C.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380,
        boxShadow: '0 4px 20px rgba(20,24,51,0.08)', position: 'relative',
      }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: C.text, textAlign: 'center', marginBottom: 6,
          fontFamily: FONT,
        }}>
          {TITULOS[mode][0]}
        </div>
        <div style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
          {TITULOS[mode][1]}
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Tu nombre" aria-label="Tu nombre"
              id="auth-nombre" name="name" autoComplete="name"
              style={inputStyle}
            />
          )}
          {mode !== 'nueva' && (
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" aria-label="Email"
              id="auth-email" name="email" autoComplete="email" inputMode="email"
              style={inputStyle} required
            />
          )}
          {mode !== 'reset' && mode !== 'nueva' && (
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña" aria-label="Contraseña"
              id="auth-contrasena" name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              style={inputStyle} required minLength={6}
            />
          )}
          {mode === 'nueva' && <>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña nueva" aria-label="Contraseña nueva" autoComplete="new-password"
              style={inputStyle} required minLength={6}
            />
            <input
              type="password" value={password2} onChange={e => setPassword2(e.target.value)}
              placeholder="Repite la contraseña" aria-label="Repite la contraseña" autoComplete="new-password"
              style={inputStyle} required minLength={6}
            />
          </>}

          {error && (
            <div style={{
              fontSize: 14, color: C.coral, background: C.roseLight, padding: '10px 14px',
              borderRadius: 10, marginBottom: 12, fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {notice && (
            <div role="status" style={{
              fontSize: 14, color: C.olivaOscura, background: C.sageClara, padding: '10px 14px',
              borderRadius: 10, marginBottom: 12, fontWeight: 600, lineHeight: 1.5,
            }}>
              {notice}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading}
            style={{ width: '100%', marginBottom: 16 }}>
            {BOTON[mode]}
          </Button>
        </form>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {mode === 'login' && onResetPassword && (
            <Button variant="ghost" size="sm" onClick={() => cambiarModo('reset')}>
              ¿Olvidaste tu contraseña?
            </Button>
          )}
          {(mode === 'login' || mode === 'signup') && (
            <Button variant="ghost" size="sm"
              onClick={() => cambiarModo(mode === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
          )}
          {mode === 'reset' && (
            <Button variant="ghost" size="sm" onClick={() => cambiarModo('login')}>
              Volver a iniciar sesión
            </Button>
          )}
          {mode === 'nueva' && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Ahora no
            </Button>
          )}
        </div>
      </div>

      <div style={{ fontSize: 13, color: C.subtle, marginTop: 32, textAlign: 'center', lineHeight: 1.5, position: 'relative' }}>
        Tu compañera en cada etapa — en ronda, crecemos juntas.
      </div>
    </div>
  )
}
