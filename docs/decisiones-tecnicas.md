# Decisiones Técnicas, Limitaciones e Incidentes

## Registro de Decisiones de Arquitectura

| # | Decisión | Alternativas | Motivo / Justificación | Consecuencia |
|---|---|---|---|---|
| 1 | MongoDB Atlas + Mongoose | PostgreSQL | Se priorizó un esquema documental flexible para agilizar el modelado inicial. | Las reglas de integridad complejas (evitar reservas solapadas) se gestionan a nivel del código de la aplicación. |
| 2 | GitHub Flow | Git Flow | Flujo liviano y directo adaptado para un equipo de 2 personas. | Requiere disciplina en la revisión de Pull Requests y protecciones de rama estrictas. |
| 3 | Mantenimiento de Spec Kit | Traducir plantillas | Conservar los comandos de Spec Kit en inglés para asegurar compatibilidad con la extensión. | Documentación técnica en español con comandos y palabras clave estándar en inglés. |
| 4 | Base de datos aislada en CI (`mongodb-memory-server`) | Conexión directa a Atlas | Prevenir exposición de secreto/credenciales y evitar contaminación de bases de datos reales. | Entorno de CI/CD 100% aislado, rápido y reproducible. |

## Limitaciones Conocidas
1. **Condición de Carrera en Reservas Concurrientes:** Sin índices únicos compuestos a nivel de bloque de hora en MongoDB, peticiones simultáneas milimétricas dependen de las transacciones o la validación del controlador.
2. **Despliegue en la Nube:** La aplicación no cuenta con URL pública de producción activa; su ejecución está diseñada para entornos locales demostrativos.

## Registro de Incidentes y Aprendizajes

| Incidente | Causa Raíz | Solución Aplicada | Aprendizaje Principal |
|---|---|---|---|
| `git push` rechazado por *non-fast-forward* | Uso de `git commit --amend` para ajustar autoría en la rama local. | Uso del comando seguro `git push --force-with-lease`. | `git commit --amend` reescribe el hash del commit; en ramas de trabajo personales se requiere push forzado controlado. |
| Error `NG0201` en aplicación Angular | Omisión de `provideHttpClient()` en la configuración de la app. | Inclusión de `provideHttpClient()` en `app.config.ts`. | Las pruebas de backend pueden pasar mientras el cliente web falla; siempre hay que probar la integración E2E. |
| Fallo inicial en pipeline de GitHub Actions (Error 500) | `MONGODB_URI` no apuntaba a una instancia activa en el contenedor de CI. | Configuración de base de datos en memoria para el runner de Node.js. | El pipeline de CI corre en un entorno limpio y requiere la inyección de sus propias variables de entorno de prueba. |