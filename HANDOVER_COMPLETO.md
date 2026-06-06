# Handover Completo: SantiPulse Unified Power Architecture

Este documento detalla la reestructuración completa de SantiPulse.com en la plataforma de automatización de IA de alta gama "The Pulse System".

## 1. Arquitectura Unificada (Unified Power Architecture)

Hemos consolidado el backend para maximizar la eficiencia en los límites de Vercel Hobby (12 funciones serverless):

- **Admin Shell (`src/app/admin.html`)**: Dashboard único modular con sidebar persistente, ticker de ROI en tiempo real y selector de paquetes.
- **API Consolidada**: Los 3 paquetes principales se manejan a través de handlers dinámicos:
  - `api/admin/receptionist/`: Recepcionista IA y gestión de Leads.
  - `api/admin/social/`: Radar de tendencias y Auto-poster.
  - `api/admin/ads/`: Optimización y escalado de anuncios.
  - `api/admin/vault/`: Gestión de documentos para entrenamiento de IA.
  - `api/admin/stripe/`: Integración completa de checkout y suscripciones.

## 2. Capa de Verdad (The Truth Layer)

El sistema incluye una verificación en tiempo real de las conexiones API:
- **Ruta**: `api/admin/verify.js`
- **Función**: Valida las claves de Vapi, Meta, TikTok y Stripe antes de permitir operaciones críticas, asegurando que el sistema sea auto-verificable.

## 3. Integraciones Críticas

### Stripe
- Página de precios actualizada (`src/pages/precios.html`) con flujo de checkout.
- Handler de Stripe para suscripciones recurrentes.
- Mapeo de planes: `package-1` (Recepcionista), `package-2` (Social), `package-3` (Ads).

### Knowledge Vault
- Interfaz de carga de documentos integrada en el dashboard.
- Handler preparado para conexión con Supabase Storage y procesamiento de embeddings.

## 4. Cumplimiento Legal (GDPR)

Se han añadido páginas completas de cumplimiento para el mercado español/europeo:
- `src/pages/gdpr.html`: Política de privacidad detallada y derechos del usuario.
- `src/pages/terms.html`: Términos de servicio y condiciones de uso.

## 5. Próximos Pasos para Producción

1. **Variables de Entorno**: Configurar las siguientes claves en Vercel:
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_RECEPTIONIST`, `STRIPE_PRICE_SOCIAL`, `STRIPE_PRICE_ADS`.
   - `VAPI_API_KEY`, `META_ACCESS_TOKEN`, `TIKTOK_API_KEY`.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Demos en Video**: Reemplazar los placeholders en el frontend con los videos reales grabados para cada paquete.
3. **Dominio**: Asegurar que `DOMAIN` en las variables de entorno apunte a `https://santipulse.com`.

## 6. Archivo de Legado
Todo el código antiguo ha sido movido a `/backend-archive` para referencia futura sin interferir con la nueva arquitectura.

---
**Desplegado con éxito bajo la identidad de LOLsasaking.**
