# 🚀 SantiPulse: Guía de Implementación y Crecimiento (ES)

Esta guía contiene las instrucciones exactas para Claude y la estrategia de crecimiento para Instagram.

---

## 🛠 INSTRUCCIONES PARA CLAUDE (COPIAR Y PEGAR)

> "Claude, necesito que implementes la nueva arquitectura de este ZIP en mi repositorio de forma limpia y perfecta. Sigue estas reglas:
> 
> 1. **Limpieza Total:** Borra las carpetas `api/demo/`, `api/automations/` y `api/dashboard/`. Son antiguas y ya no se usan.
> 2. **Instalación Admin:** Instala las nuevas rutas de `/admin/` y los controladores de API consolidados que están en el ZIP.
> 3. **Idioma:** Todo el Dashboard de Administración debe estar en **ESPAÑOL**.
>    - Paquete 1: Recepcionista IA y Hub de Leads.
>    - Paquete 2: Insights de Redes y Auto-Poster.
>    - Paquete 3: Gestor de Ads Automático.
> 4. **Portafolio:** Mantén la cuadrícula de 'Webs Reales' en `src/pages/demos.html`, pero elimina los formularios antiguos de Price Monitor y Lead Scraper.
> 5. **Videos:** Usa la guía `VIDEO_STRATEGY.md` para poner placeholders de video para los 3 nuevos paquetes en la página de demos.
> 6. **Vercel:** Asegúrate de que el conteo final de funciones sea menor a 12 (el ZIP usa 8).
> 7. Identidad: Haz el commit con mi usuario de GitHub (LOLsasaking) para que Vercel no bloquee el despliegue.

---

## 💎 EL "5% FINAL" (PASOS ADICIONALES)
8. **Onboarding:** He añadido `src/pages/bienvenida.html`. Asegúrate de que tras un pago exitoso, el usuario sea redirigido aquí.
9. **Legal:** He añadido `src/pages/privacidad.html`. Añade un link a esta página en el footer y una casilla de 'Acepto la política' en los formularios.
10. **Stripe:** He creado `api/_lib/stripe-plans.js`. Vincula los botones de compra del dashboard a estas configuraciones."

---

## 📸 ESTRATEGIA DE CRECIMIENTO INSTAGRAM (@pulsesanti)

### 1. Optimización del Perfil
- **Bio:** "Construyo sistemas que venden mientras duermes. 🤖 Recepcionistas IA | 📈 Escalamiento de Ads | 🔗 Mira tu nuevo sistema aquí: [santipulse.com]"

### 2. Los 3 Pilares de Contenido (Reels)
- **Pilar 1 (La Recepcionista):** Video de una llamada real donde la IA reserva una cita. Texto: "Deja de perder clientes por no contestar el teléfono."
- **Pilar 2 (Social Insights):** Grabación de pantalla del Dashboard analizando tendencias. Texto: "No adivines qué publicar. Usa datos."
- **Pilar 3 (Ads):** Gráfico de ventas subiendo. Texto: "Escala tus beneficios, no tu carga de trabajo."

### 3. El "Call to Action" Mágico
En cada post, añade: *"Escribe 'SISTEMA' en los comentarios y te envío una demo privada de este panel de control."*

---

## 📂 ARCHIVOS ADJUNTOS EN EL ZIP
- `api/admin/`: El motor de tu nueva agencia.
- `src/app/admin.html`: Tu nuevo centro de mando.
- `VIDEO_STRATEGY.md`: Guía visual para las demos.
- `ESTRATEGIA_FINAL_ES.md`: Esta guía.
