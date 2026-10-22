# Registro de Prompts y Prompt Engineering con GitHub Copilot

## Historial de Prompts Principales

| Fecha | Fase / Componente | Prompt Resumido | Resultado Obtenido | Ajustes Realizados |
|---|---|---|---|---|
| 2026-10-17 | Constitution | `/speckit.constitution` definiendo arquitectura Node/Angular, TDD, GitHub Flow. | Borrador con los 8 principios fundamentales. | Ajuste de políticas de secretos e inclusión explícita de `conventional commits`. |
| 2026-10-17 | Specify | `/speckit.specify` detallando historias de usuario, reglas de reservas y fuera de alcance. | Especificación estructurada con requisitos RF-001 a RF-016. | Eliminación de comodines y marcado explícito de prioridades P1, P2 y P3. |
| 2026-10-18 | Plan | `/speckit.plan` para arquitectura de backend Express con Mongoose y frontend Angular. | Plan técnico detallando modelos y estructura de archivos. | Ajuste del motor de pruebas a Jest para el backend. |
| 2026-10-19 | Implement (Backend) | "Crea el middleware de autenticación JWT y los tests de integración correspondientes usando Supertest." | Código del controlador y archivo de prueba. | Corrección de códigos de estado HTTP para casos de error 401 y 403. |
| 2026-10-21 | Pipeline CI/CD | "Genera un workflow de GitHub Actions para Node 22 que ejecute npm test en backend y frontend." | Archivo `.github/workflows/ci.yml`. | Ajuste de paths para trabajar con subcarpetas `backend/` y `frontend/`. |

## Lecciones de Prompt Engineering
* **Delimitación de Alcance:** Generar código paso a paso por módulos o archivos evita alucinaciones o código truncado.
* **Inclusión de Contexto:** Adjuntar los modelos e interfaces de Mongoose/TypeScript en el contexto del prompt mejora significativamente la precisión de las funciones.
* **Enfoque TDD:** Solicitar primero la suite de pruebas forzó a Copilot a escribir contratos de API más limpios y robustos.