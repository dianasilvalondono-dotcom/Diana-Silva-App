import { useEffect, useRef, useState } from 'react'
import { C } from '../constants/colors'
import { FONT } from '../constants/tokens'
import Button from './ui/Button'
import LineaCrisis from './ui/LineaCrisis'
import { BOTON_AYUDA } from '../utils/crisis'
import { Casilla, EnlacePolitica, PROMESA } from './Autorizaciones'
import { autorizacionesParaRegistro, URL_AVISO } from '../lib/autorizaciones'

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
  email_address_invalid: 'Revisa tu email: parece que tiene un error de escritura.',
  validation_failed: 'Revisa tu email: parece que tiene un error de escritura.',
  over_email_send_rate_limit: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Hiciste muchos intentos seguidos. Espera unos minutos y vuelve a intentarlo.',
  signup_disabled: 'El registro está en pausa en este momento. Inténtalo más tarde.',
  email_provider_disabled: 'El registro está en pausa en este momento. Inténtalo más tarde.',
  session_not_found: 'Ese enlace ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».',
  session_expired: 'Ese enlace ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».',
}
const SIN_CONEXION = 'Parece que se cayó la conexión. Revisa tu internet e inténtalo de nuevo.'
const MENSAJE_POR_DEFECTO = {
  login: 'Revisa tu email y tu contraseña e inténtalo de nuevo.',
  signup: 'Algo falló al crear tu cuenta. Inténtalo de nuevo.',
  reset: 'Algo falló al enviar el correo. Inténtalo de nuevo.',
  nueva: 'Algo falló al guardar tu contraseña. Inténtalo de nuevo.',
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
   enlace; lo abre App con modoInicial="nueva").
   Como en el resto de la app, arriba va Ayuda (onAyuda) y abajo las líneas
   de crisis: aquí llega también quien rechaza el aviso y cierra sesión, y
   quien ve un error en una casilla. Mientras la Ayuda está abierta, la
   pantalla queda inerte (inerte). */
export default function AuthScreen({
  onSignInEmail, onSignUp, onResetPassword, onUpdatePassword, onPasswordUpdated, onCancel,
  modoInicial = 'login', onAyuda, inerte,
}) {
  const [mode, setMode] = useState(modoInicial)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [name, setName] = useState('')
  // Al crear la cuenta: las dos casillas obligatorias, sin marcar
  // (textos-autorizacion-v1, a). Lo íntimo (la IA) se pregunta aparte,
  // después, en «Lo íntimo es tuyo».
  const [mayorDeEdad, setMayorDeEdad] = useState(false)
  const [autorizaCuenta, setAutorizaCuenta] = useState(false)
  const [error, setError] = useState('')
  // Qué campo causó el error ('nombre', 'edad', 'cuenta'), para marcar solo
  // ese como inválido y llevarle el foco. null si el error no es de un campo.
  const [campoInvalido, setCampoInvalido] = useState(null)
  const errorRef = useRef(null)
  // Aviso que no es error: "te enviamos un correo…" (bienvenida-11).
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  // Al volver a "Crear cuenta", las casillas empiezan sin marcar.
  const cambiarModo = (m) => { setMode(m); setError(''); setCampoInvalido(null); setNotice(''); setMayorDeEdad(false); setAutorizaCuenta(false) }

  // Un error siempre queda a la vista: en el celular, con Enter (o «Ir» del
  // teclado) desde la contraseña, salía debajo del borde de la pantalla. Si
  // es de un campo, el foco va a ese campo (en una casilla, el teclado del
  // teléfono se cierra) y, si caben juntos, el campo y el mensaje quedan los
  // dos a la vista: el mensaje dice «marca la casilla…» y la casilla queda
  // arriba de él, no por encima del borde. Si no caben, el mensaje centrado.
  const mostrarError = (campo) => requestAnimationFrame(() => {
    const id = { nombre: 'auth-nombre', edad: 'auth-edad', cuenta: 'auth-autorizo' }[campo]
    const el = id ? document.getElementById(id) : null
    el?.focus({ preventScroll: true })
    const err = errorRef.current
    if (!err) return
    const alto = window.visualViewport?.height ?? window.innerHeight
    const c = el?.getBoundingClientRect()
    const e = err.getBoundingClientRect()
    if (c && c.top >= 0 && e.bottom <= alto) return
    if (c && e.bottom - c.top + 32 <= alto) window.scrollBy({ top: c.top - 16 })
    else err.scrollIntoView({ block: 'center' })
  })
  // Los errores que llegan del servidor (después de esperar). Los de un
  // campo ya los acomodó errorDeCampo: centrar aquí el mensaje dejaría la
  // casilla por encima del borde.
  useEffect(() => { if (error && !campoInvalido) mostrarError(null) }, [error, campoInvalido])
  // Los de un campo, también si es el mismo mensaje otra vez (Enter de nuevo).
  const errorDeCampo = (campo, texto) => { setCampoInvalido(campo); setError(texto); setLoading(false); mostrarError(campo) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCampoInvalido(null)
    setNotice('')
    if (mode === 'nueva' && password !== password2) { setError('Las dos contraseñas tienen que ser iguales.'); return }
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!name.trim()) { errorDeCampo('nombre', 'Ingresa tu nombre'); return }
        if (!mayorDeEdad) { errorDeCampo('edad', 'Ronda es solo para mayores de 18 años. Si tienes 18 o más, marca la casilla «Tengo 18 años o más».'); return }
        if (!autorizaCuenta) { errorDeCampo('cuenta', 'Para crear tu cuenta necesitamos que autorices el tratamiento de tus datos de cuenta: marca la segunda casilla.'); return }
        const result = await onSignUp(email, password, name, autorizacionesParaRegistro())
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
    <div inert={inerte || undefined} style={{
      maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.cream,
      fontFamily: FONT,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, position: 'relative', overflow: 'hidden',
    }}>
      {/* id: al cerrar la Ayuda, el foco vuelve aquí (useDialog en App). */}
      {onAyuda && (
        <button id="boton-ayuda" type="button" onClick={onAyuda} style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 10px)', right: 12,
          background: 'none', border: 'none', cursor: 'pointer', padding: '12px 10px', minHeight: 44,
          color: C.morado, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'inherit',
        }}>{BOTON_AYUDA}</button>
      )}
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
              aria-invalid={campoInvalido === 'nombre' || undefined}
              aria-describedby={campoInvalido === 'nombre' ? 'auth-error' : undefined}
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
          {mode === 'signup' && (
            <div style={{ margin: '4px 0 12px' }}>
              <Casilla id="auth-edad" marcada={mayorDeEdad} invalida={campoInvalido === 'edad'}
                describedBy={campoInvalido === 'edad' ? 'auth-error' : undefined}
                onCambiar={v => { setMayorDeEdad(v); setError(''); setCampoInvalido(null) }}>
                <strong>Tengo 18 años o más.</strong>
              </Casilla>
              <Casilla id="auth-autorizo" marcada={autorizaCuenta} invalida={campoInvalido === 'cuenta'}
                describedBy={campoInvalido === 'cuenta' ? 'auth-error' : undefined}
                onCambiar={v => { setAutorizaCuenta(v); setError(''); setCampoInvalido(null) }}>
                <strong>Autorizo a Ronda el tratamiento de mis datos de cuenta y de uso</strong> (nombre, correo, perfil, hábitos, mis gustos para los planes, los planes en los que aparto cupo y cómo uso la app) para crear mi cuenta, darme el servicio, recomendarme planes y mejorar Ronda, como explica la <EnlacePolitica />.
              </Casilla>
              <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.55, marginTop: 6 }}>
                <em>{PROMESA} Lo íntimo te lo preguntamos aparte y es opcional.</em>{' '}
                <EnlacePolitica href={URL_AVISO}>Aviso de privacidad</EnlacePolitica>
              </div>
            </div>
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
            <div id="auth-error" ref={errorRef} role="alert" style={{
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

          {/* Al crear la cuenta, el botón se ve activo solo con las dos
              casillas marcadas. No se apaga del todo: si lo toca (o envía con
              Enter) sin ellas, el mensaje dice qué falta. */}
          <Button type="submit" variant="primary" size="lg" loading={loading}
            aria-disabled={(mode === 'signup' && !(mayorDeEdad && autorizaCuenta)) || undefined}
            style={{
              width: '100%', marginBottom: 16,
              ...(mode === 'signup' && !(mayorDeEdad && autorizaCuenta) ? { background: C.border, color: C.muted, boxShadow: 'none' } : {}),
            }}>
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
              {mode === 'login' ? '¿Eres nueva? Crea tu cuenta' : '¿Ya tienes cuenta? Inicia sesión'}
            </Button>
          )}
          {mode === 'reset' && (
            <Button variant="ghost" size="sm" onClick={() => cambiarModo('login')}>
              Volver a iniciar sesión
            </Button>
          )}
          {mode === 'nueva' && onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Más tarde
            </Button>
          )}
        </div>
      </div>

      <p style={{ margin: '24px auto 0', maxWidth: 380, fontSize: 14, color: C.subtle, lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
        Si estás en crisis, llama a la <LineaCrisis numero="106">Línea 106</LineaCrisis>, o al <LineaCrisis numero="123">123</LineaCrisis> si estás en peligro inmediato.
      </p>

      <div style={{ fontSize: 13, color: C.subtle, marginTop: 32, textAlign: 'center', lineHeight: 1.5, position: 'relative' }}>
        Tu compañera en cada etapa — en ronda, crecemos juntas.
      </div>
    </div>
  )
}
