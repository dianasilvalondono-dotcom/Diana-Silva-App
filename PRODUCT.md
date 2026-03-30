# RONDA — Qué construir

Este documento es la fuente de verdad del producto. Si algo no está aquí, no se construye.

---

## Ronda en una frase

Ronda es un toolkit de bienestar para mujeres basado en neurociencia y DBT.
Tres experiencias: herramientas que funcionan ahora, programas con estructura, comunidad que sostiene.

---

## Las 3 experiencias (esto es TODO lo que tiene la app)

### 1. AHORA
Lo que la usuaria necesita cuando abre la app hoy.

**SOS Button** — siempre visible, siempre accesible
- Respiración guiada 4-7-8
- Grounding 5-4-3-2-1
- Tolerancia al malestar (DBT)
- Aceptación radical (DBT)

**Mi Día** — la pantalla principal
- Hábitos en 4 dimensiones (emocional, física, mental, espiritual)
- Rutina editable
- Check-in emocional
- Intención del día con gratitud
- Racha mensual

### 2. CRECER
Programas con estructura. No contenido suelto.

- Programas de **7 días** (freemium): 10 programas. Cada día = un concepto + una práctica + una reflexión. Compromiso mínimo: 1 minuto/día.
- Programas de **21 días** (premium Ronda+): más profundos, cada día construye sobre el anterior.
- **AI Agent**: la usuaria escribe su meta → el agente genera un programa personalizado de 21 días con la misma estructura (concepto + práctica + reflexión). Usa el endpoint api/agent.js con Claude.

### 3. JUNTAS
Comunidad. Anónima para las usuarias, verificada para las profesionales.

- **Board 24/7**: la usuaria publica su pregunta de forma anónima. Solo profesionales verificadas responden.
- Categorías: ansiedad, relaciones, maternidad, autoestima, duelo, emprendimiento.

---

## Modelo de negocio (2 niveles, no más)

**Freemium** (siempre accesible):
- SOS Button completo
- 10 programas de 7 días
- Board: leer y publicar
- Hábitos 4D + rutina + diario básico

**Ronda+ ($9.99/mes)**:
- AI Agent personalizado
- Programas de 21 días
- 5 respuestas de profesionales verificadas al mes
- Analytics de progreso

**Regla**: el SOS y los programas de 7 días NUNCA se ponen detrás de un paywall.

---

## Lo que NO se construye ahora

No importa qué tan buena sea la idea. Si está en esta lista, no se toca hasta que haya tracción con lo de arriba.
Lo que ya existe como demo/placeholder se mantiene para mostrar, pero no se invierte más tiempo.

- Marketplace / directorio de profesionales (existe como demo)
- Tercer tier (Ronda Pro a $29.99)
- Círculos privados
- Videollamadas
- Integración con Oura Ring o Apple Health
- Georreferenciación
- Red social
- Programas de 60 días
- Respuesta Express ($4.99)
- Certificación profesional

---

## Antes de construir algo nuevo, responde esto:

1. ¿Mejora AHORA, CRECER, o JUNTAS?
2. ¿Tiene base en neurociencia, DBT, o psicología validada?
3. ¿Lo necesitan las usuarias actuales?
4. ¿Hace la app más simple o más compleja?

Si cualquier respuesta es NO → no se construye.

---

## Stack

- React + Vite (JSX), PWA, mobile-first (430px max)
- Supabase (PostgreSQL + Auth con RLS)
- Claude API (api/agent.js)
- Vercel (auto-deploy)
- OneSignal (push)
- Dominios: rondahub.com + rondahub.lat

---

## Voz en la app

- Siempre "tú", nunca "usted"
- Español colombiano, cálido, directo
- El malestar no es el enemigo: "Tu ansiedad es tu amígdala haciendo su trabajo"
- Cada práctica explica el POR QUÉ funciona (neurociencia en lenguaje humano)
- En contenido de crisis (SOS): frases cortas, presente, directivas. "Inhala. Sostén. Exhala."
- Los CTAs son invitaciones, no órdenes
- Nunca "gratis". Siempre "freemium"

---

## Competencia (para contexto, no para copiar)

- **Calm/Headspace**: meditaciones sin marco clínico, sin comunidad, sin crisis
- **BetterHelp**: marketplace de terapeutas sin herramientas diarias
- **Riseeing**: directorio holístico sin filtro de evidencia, sin producto propio
- **Instagram wellness**: contenido infinito, comparación, cero estructura

Ronda es la única que integra herramientas clínicas reales + programas con progresión + comunidad con profesionales verificadas.

---

*Tu refugio para crecer, sanar y volar — en ronda, nunca sola.*
