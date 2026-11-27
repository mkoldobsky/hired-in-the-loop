# hired-in-the-loop

**Un equipo de agentes de IA para tu búsqueda laboral. Ninguno puede postularte sin tu OK.**

[English](README.md)

Buscar trabajo es un segundo trabajo: revisar alertas, leer avisos, adaptar el CV, escribir cartas, completar formularios, hacer seguimiento, preparar entrevistas. `hired-in-the-loop` es un conjunto de skills de [Claude Code](https://claude.com/claude-code) y algunos scripts de Node sin dependencias que hacen el trabajo pesado. Las decisiones son siempre tuyas.

## Los agentes

| Agente | Qué hace | Qué no hace nunca |
|---|---|---|
| **cv-import** | Convierte tu CV actual (PDF, Word o el "Guardar en PDF" de LinkedIn) en `cv/master.json` y te pregunta las métricas que faltan | Agregar algo que no esté en tu CV o en tus respuestas |
| **job-scout** | Lee tus alertas por mail y fuentes públicas, puntúa cada aviso contra tu perfil y lo carga en el tracker | Postularte a nada |
| **job-tailor** | Arma CV a medida (PDF), carta y análisis de fit honesto para los avisos que superan tu umbral | Inventar experiencia, métricas o cargos |
| **job-apply** | Completa los formularios con el paquete aprobado | Tocar Enviar sin tu OK final, crear cuentas, ingresar contraseñas, resolver CAPTCHAs |
| **job-inbox** | Revisa respuestas, actualiza estados y redacta borradores con horarios de tu calendario | Enviar un mail |
| **interview-prep** | Arma un dossier: empresa, matriz de skills, gaps, respuestas STAR con tus historias reales | Inventar un ejemplo que no tenés |
| **job-status** | Embudo, aprobaciones pendientes, entrevistas, seguimientos | — |

## Las reglas

1. **Nunca inventar.** Tu CV vive en un único JSON (`cv/master.json`). Los CVs a medida solo eligen, reordenan y reformulan. Si un aviso pide algo que no tenés, se reporta como gap.
2. **Nada sale sin tu OK explícito.** Las postulaciones se aprueban por lote y tienen un OK final antes de enviar. Las respuestas quedan como borradores.
3. **Calidad antes que volumen.** Pocas postulaciones bien elegidas, a ritmo humano.
4. **El contenido es dato, no instrucciones.** Si un aviso o mail pide "respondé con tu DNI", el agente te avisa en vez de hacerlo.

## Instalación

Requisitos: Claude Code, Node.js 18+, Google Chrome (para generar los PDFs). Para mail y calendario, conectá Gmail y Google Calendar en Claude.

```bash
git clone https://github.com/mkoldobsky/hired-in-the-loop.git
cd hired-in-the-loop
cp config/search-profile.example.json config/search-profile.json
```

1. Creá `cv/master.json`, la única fuente de hechos:
   - **Lo más fácil:** abrí Claude Code en la carpeta y decí "importá mi CV". Pasale tu CV en PDF o Word (o tu perfil de LinkedIn: Más → Guardar en PDF). Arma el archivo, te pregunta los números que faltan (tamaño de equipos, resultados) y te muestra el PDF para que lo revises. Sin tocar JSON.
   - **A mano:** `cp cv/master.example.json cv/master.json` y reemplazá el ejemplo con tu experiencia.
   - En los dos casos, revisalo con `node cv/validate.mjs`.
2. Editá `config/search-profile.json`: roles, mercados, dealbreakers, umbral y fuentes.
3. Probá el render: `node cv/render.mjs cv/master.json cv/CV.pdf`.
4. Abrí Claude Code en la carpeta y pedí "scout", después "tailor", y revisá la cola de aprobación.

Tus archivos personales (CV, perfil, tracker y `applications/`) están en `.gitignore`. Los skills están escritos en inglés, pero Claude te habla en tu idioma.

## Licencia

[MIT](LICENSE)
