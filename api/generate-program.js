export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { goal, context } = req.body
  if (!goal) return res.status(400).json({ error: 'Goal is required' })

  const apiKey = process.env.ANTHROPIC_API_KEY

  // If API key exists, use Claude AI
  if (apiKey) {
    const systemPrompt = `Eres Ronda, una asistente de bienestar femenino. Tu trabajo es crear programas personalizados paso a paso para mujeres.

REGLAS:
- Siempre en español, tono cálido y cercano como una amiga que te entiende
- Programas de 7 días
- Cada día tiene UN paso pequeño y alcanzable (máximo 5-10 minutos)
- NUNCA empujas. NUNCA presionas. Siempre pasito a pasito.
- Cada tarea debe ser específica y concreta, no abstracta
- Incluye la razón científica o emocional detrás de cada paso
- El programa debe ser progresivo: día 1 es lo más fácil, día 7 es el más retador
- El tono es: "tú puedes, y yo te acompaño"

FORMATO DE RESPUESTA (JSON estricto):
{
  "title": "Nombre del programa",
  "desc": "Descripción corta y motivadora (1 línea)",
  "duration": 7,
  "days": [
    { "day": 1, "title": "Título corto", "task": "Tarea concreta y específica con la razón detrás." }
  ]
}

IMPORTANTE: Responde SOLO con el JSON. Sin texto antes ni después. Sin emojis.`

    const userMessage = context
      ? `Mi meta: ${goal}\n\nContexto adicional: ${context}`
      : `Mi meta: ${goal}`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        return res.status(500).json({ error: 'AI API error', details: err })
      }

      const data = await response.json()
      const text = data.content[0].text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return res.status(500).json({ error: 'Invalid AI response' })
      const program = JSON.parse(jsonMatch[0])
      return res.status(200).json({ program })
    } catch (err) {
      return res.status(500).json({ error: 'Server error', details: err.message })
    }
  }

  // Fallback: smart template-based program generation (no API key needed)
  const g = goal.toLowerCase()
  const templates = {
    azucar: {
      title: 'Soltar el azúcar, paso a paso',
      desc: '7 días para cambiar tu relación con el azúcar — sin prohibiciones.',
      days: [
        { day: 1, title: 'Observa sin juzgar', task: 'Hoy solo observa cuántas veces comes algo dulce. No cambies nada — solo anota. La conciencia es el primer paso del cambio.' },
        { day: 2, title: 'Un vaso de agua primero', task: 'Antes de cada antojo dulce, toma un vaso de agua completo y espera 5 minutos. El 40% de los antojos son deshidratación disfrazada.' },
        { day: 3, title: 'Reemplaza uno', task: 'Elige UN momento dulce del día y reemplázalo con una fruta. Solo uno. El resto queda igual.' },
        { day: 4, title: 'Lee las etiquetas', task: 'Hoy revisa las etiquetas de 3 cosas que comes regularmente. El azúcar se esconde en salsas, panes, yogures. Solo lee — sin juzgar.' },
        { day: 5, title: 'Desayuno sin azúcar', task: 'Prepara un desayuno sin azúcar añadida. Huevos, fruta, avena con canela. Tu cuerpo mañanero agradece la estabilidad.' },
        { day: 6, title: 'Maneja un antojo', task: 'Cuando venga el antojo: respira 4-7-8, toma agua, camina 2 minutos. Si después de eso sigues queriendo, cómelo sin culpa.' },
        { day: 7, title: 'Tu nuevo hábito', task: 'Escribe: ¿qué aprendiste esta semana? ¿Cuál reemplazo te funcionó mejor? Ese es tu nuevo hábito. Ya empezaste.' },
      ],
    },
    meditar: {
      title: 'Empezar a meditar desde cero',
      desc: '7 días para descubrir que sí puedes meditar — 2 minutos bastan.',
      days: [
        { day: 1, title: 'Solo respira', task: 'Siéntate cómoda, cierra los ojos, y cuenta 10 respiraciones. Eso es todo. Si pierdes la cuenta, vuelve a empezar. Eso ES meditar.' },
        { day: 2, title: 'Escanea tu cuerpo', task: 'Acostada o sentada, recorre mentalmente tu cuerpo de pies a cabeza. ¿Dónde hay tensión? Solo nota. No arregles nada.' },
        { day: 3, title: '2 minutos con timer', task: 'Pon un timer de 2 minutos. Ojos cerrados. Respira. Cuando tu mente se vaya, tráela de vuelta. Cada vez que la traes es una repetición mental.' },
        { day: 4, title: 'Meditación guiada', task: 'Busca en YouTube "meditación guiada 5 minutos español". Déjate guiar. No tienes que hacer nada — solo escuchar.' },
        { day: 5, title: 'Camina y medita', task: 'Camina 5 minutos prestando atención a cada paso. El pie toca el suelo, sientes la textura. Meditación en movimiento.' },
        { day: 6, title: 'Gratitud silenciosa', task: 'Antes de dormir: 2 minutos con los ojos cerrados pensando en 3 cosas buenas del día. Tu cerebro las registra como importantes.' },
        { day: 7, title: 'Tu ritual', task: 'Elige tu momento y estilo favorito de la semana. 2 minutos diarios. Escríbelo y ponlo como hábito en Ronda.' },
      ],
    },
    dormir: {
      title: 'Dormir mejor en 7 días',
      desc: '7 días para recuperar tu descanso — tu cuerpo y tu mente lo necesitan.',
      days: [
        { day: 1, title: 'Sin pantallas 30 min antes', task: 'Hoy deja el celular 30 minutos antes de acostarte. La luz azul bloquea la melatonina. Lee, respira, o simplemente quédate en silencio.' },
        { day: 2, title: 'Ritual de cierre', task: 'Crea un mini ritual: lávate la cara, prepara lo de mañana, escribe una cosa buena del día. Tu cerebro aprende que es hora de apagar.' },
        { day: 3, title: 'Temperatura y oscuridad', task: 'Baja la luz de tu cuarto 1 hora antes. Si puedes, baja la temperatura. El cuerpo duerme mejor en fresco y oscuro.' },
        { day: 4, title: 'Respiración 4-7-8', task: 'En la cama: inhala 4 segundos, sostén 7, exhala 8. Repite 3 veces. Activa tu nervio vago y tu cuerpo se relaja.' },
        { day: 5, title: 'Corta la cafeína a las 2pm', task: 'Hoy no tomes café, té o chocolate después de las 2pm. La cafeína dura 8 horas en tu sistema.' },
        { day: 6, title: 'Escribe para soltar', task: 'Si tu mente no para: escribe TODO lo que te preocupa en un papel. Cierra el cuaderno. Dile a tu mente: ya está escrito, mañana lo resuelvo.' },
        { day: 7, title: 'Tu rutina de sueño', task: 'Escribe tu rutina ideal de noche: hora de dejar pantallas, ritual, respiración, hora de dormir. Ponla como rutina en Ronda.' },
      ],
    },
    procrastinar: {
      title: 'Dejar de procrastinar',
      desc: '7 días para romper el ciclo — con compasión, no con culpa.',
      days: [
        { day: 1, title: 'La regla de 2 minutos', task: 'Si algo toma menos de 2 minutos, hazlo AHORA. Un email, tender la cama, recoger algo. Solo cosas de 2 minutos.' },
        { day: 2, title: 'Una sola cosa', task: 'Escribe LA cosa más importante de hoy. Solo una. Hazla primero, antes de abrir redes o email. Todo lo demás puede esperar.' },
        { day: 3, title: 'Timer de 15 minutos', task: 'Pon un timer de 15 minutos y trabaja en ESA cosa sin parar. Cuando suene, puedes parar. Casi siempre vas a querer seguir.' },
        { day: 4, title: 'Identifica el miedo', task: 'Pregúntate: ¿qué estoy evitando realmente? ¿Fracasar? ¿No ser perfecta? Escríbelo. Nombrarlo le quita poder.' },
        { day: 5, title: 'Elimina distracciones', task: 'Pon el celular en otra habitación por 1 hora. Cierra todas las tabs que no necesitas. Tu mente agradece el silencio.' },
        { day: 6, title: 'Celebra lo hecho', task: 'Antes de dormir, escribe 3 cosas que SÍ hiciste hoy. No lo que faltó — lo que lograste. Reprogramar la narrativa es clave.' },
        { day: 7, title: 'Tu sistema anti-procrastinación', task: 'Escribe: 1 tarea importante mañana, hora del timer, y tu recompensa después. Sistema > motivación.' },
      ],
    },
    pareja: {
      title: 'Fortalecer tu relación de pareja',
      desc: '7 días para reconectar con intención — juntas crecen.',
      days: [
        { day: 1, title: 'Presencia total', task: 'Hoy durante la cena: celulares lejos. Mira a los ojos. Pregunta: ¿cómo estuvo tu día de verdad? Escucha sin interrumpir.' },
        { day: 2, title: 'Un detalle pequeño', task: 'Haz algo que tu pareja no espere: un mensaje bonito, su café favorito, un abrazo largo de 20 segundos. Los detalles construyen amor.' },
        { day: 3, title: 'Escucha su lenguaje de amor', task: 'Observa: ¿tu pareja necesita palabras, tiempo, actos, regalos o contacto? Hoy dale lo que necesita, no lo que tú darías.' },
        { day: 4, title: 'Habla desde el yo', task: 'Si algo te molesta, dilo así: "Yo siento ___ cuando ___. Necesito ___." Sin culpar. La vulnerabilidad conecta más que el reclamo.' },
        { day: 5, title: 'Recuerda por qué', task: 'Escribe 5 razones por las que elegiste a esta persona. Léelas. Recuérdate que el amor es una decisión diaria.' },
        { day: 6, title: 'Tiempo de calidad', task: 'Planea algo juntos que no sea rutina: cocinar algo nuevo, caminar, ver fotos viejas. No tiene que costar — tiene que conectar.' },
        { day: 7, title: 'Tu compromiso', task: 'Escríbele una carta corta: lo que admiras, lo que agradeces, lo que quieres construir. No la tienes que entregar — pero si quieres, hazlo.' },
      ],
    },
    decir_no: {
      title: 'Aprender a decir que no',
      desc: '7 días para poner límites con amor — porque tu tiempo vale.',
      days: [
        { day: 1, title: 'Nota dónde dices sí sin querer', task: 'Hoy solo observa: ¿en qué momentos dices sí cuando quieres decir no? Anota al menos 2. Sin juzgarte — solo observar.' },
        { day: 2, title: 'La pausa antes de responder', task: 'Cuando te pidan algo, no respondas inmediato. Di: "Déjame pensarlo y te contesto." Ese espacio es tu poder.' },
        { day: 3, title: 'Un no pequeño', task: 'Hoy di que no a UNA cosa pequeña. Un plan que no quieres, una tarea que puedes delegar. Empieza pequeño.' },
        { day: 4, title: 'No es una oración completa', task: 'Practica decir: "No puedo esta vez" sin dar explicaciones largas. No necesitas justificarte. Tu no es válido tal cual.' },
        { day: 5, title: 'Identifica la culpa', task: 'Cuando sientas culpa por decir no, escríbela. Luego pregúntate: ¿esta culpa me protege o me limita? Casi siempre te limita.' },
        { day: 6, title: 'Pon un límite con amor', task: 'Elige a alguien que necesita escuchar un límite tuyo. Díselo con amor pero con firmeza. Cada límite es un acto de amor propio.' },
        { day: 7, title: 'Tu política de límites', task: 'Escribe 3 cosas a las que SIEMPRE dirás no. Y 3 cosas que SIEMPRE priorizarás. Esa es tu brújula.' },
      ],
    },
  }

  // Match goal to template
  let matched = null
  if (g.includes('azúcar') || g.includes('azucar') || g.includes('dulce')) matched = templates.azucar
  else if (g.includes('meditar') || g.includes('meditación') || g.includes('mindful')) matched = templates.meditar
  else if (g.includes('dormir') || g.includes('sueño') || g.includes('insomnio')) matched = templates.dormir
  else if (g.includes('procrastin')) matched = templates.procrastinar
  else if (g.includes('pareja') || g.includes('relación') || g.includes('relacion')) matched = templates.pareja
  else if (g.includes('decir que no') || g.includes('límites') || g.includes('limites') || g.includes('decir no')) matched = templates.decir_no

  if (matched) {
    return res.status(200).json({ program: matched })
  }

  // Generic fallback
  return res.status(200).json({
    program: {
      title: `Tu programa: ${goal}`,
      desc: `7 días para avanzar hacia tu meta, paso a paso.`,
      duration: 7,
      days: [
        { day: 1, title: 'Define tu por qué', task: `Escribe en una frase: ¿por qué quieres "${goal}"? Esa es tu brújula. Ponla donde la veas cada mañana.` },
        { day: 2, title: 'Observa tu punto de partida', task: `Hoy solo observa: ¿dónde estás hoy con respecto a "${goal}"? Sin juzgar. Escribe lo que notas.` },
        { day: 3, title: 'Un paso pequeño', task: 'Elige UNA acción concreta que te acerque a tu meta y hazla hoy. Solo 5 minutos. Lo importante es empezar.' },
        { day: 4, title: 'Identifica qué te frena', task: '¿Qué te ha impedido lograr esto antes? Escríbelo. Nombrarlo es el primer paso para superarlo.' },
        { day: 5, title: 'Busca un modelo', task: '¿Conoces a alguien que ya logró lo que tú quieres? Lee sobre su proceso. No necesitas reinventar la rueda.' },
        { day: 6, title: 'Sube la intensidad', task: 'Hoy duplica el tiempo o esfuerzo del día 3. De 5 minutos a 10. Tu cerebro ya sabe que puedes.' },
        { day: 7, title: 'Tu plan a 21 días', task: 'Escribe tu plan: qué vas a hacer cada día las próximas 3 semanas. Ponlo como rutina en Ronda. Ya empezaste.' },
      ],
    },
  })
}
