# Especificaciones del Sistema de Reservas de Laboratorios

## Resumen
Plataforma web para la gestión eficiente de reservas de laboratorios académicos en la UTMACH. Permite a los estudiantes y docentes solicitar horarios en laboratorios activos y a los administradores gestionar el catálogo de laboratorios.

## Documentos Generados con Spec Kit

| Documento | Ubicación | Contenido |
| :--- | :--- | :--- |
| **Constitution** | `.specify/memory/constitution.md` | 8 principios fundamentales de desarrollo |
| **Especificación** | `specs/001-reservas-laboratorios/spec.md` | Historias de usuario, requisitos RF-001 a RF-016 |
| **Plan Técnico** | `specs/001-reservas-laboratorios/plan.md` | Arquitectura, modelo de datos y diseño de componentes |
| **Tareas** | `specs/001-reservas-laboratorios/tasks.md` | Desglose por fases siguiendo TDD |

## Historias de Usuario

| Prioridad | Historia | Estado |
| :--- | :--- | :--- |
| **P1** | Consultar laboratorios disponibles y realizar reservas | Completado |
| **P2** | Consultar historial y cancelar reservas propias | Completado |
| **P3** | Administrar catálogo de laboratorios (Creación, Edición, Desactivación) | Completado |

## Reglas de Negocio Principales
1. **Sin Solapamiento:** No se permiten reservas con horarios superpuestos en el mismo laboratorio activo.
2. **Consistencia Temporal:** La fecha y hora de fin deben ser estrictamente posteriores a las de inicio.
3. **Bloqueo del Pasado:** No se permite crear ni modificar reservas en fechas o momentos pasados.
4. **Liberación de Cupo:** Una reserva cancelada libera inmediatamente el intervalo para nuevos usuarios.
5. **Preservación Histórica:** Desactivar un laboratorio bloquea nuevas reservas sin eliminar el registro histórico existente.
6. **Control de Acceso:** Solo usuarios con rol `administrador` pueden modificar el catálogo de laboratorios.

## Modelo de Datos (MongoDB / Mongoose)

* **`usuarios`**: `_id`, `nombre`, `correo`, `password` (hash), `rol` (`administrador`, `docente`, `estudiante`).
* **`laboratorios`**: `_id`, `nombre`, `ubicacion`, `capacidad`, `estado` (`activo`, `inactivo`).
* **`reservas`**: `_id`, `laboratorio` (Ref), `usuario` (Ref), `inicio`, `fin`, `estado` (`activa`, `cancelada`).

## Fuera de Alcance
* Pagos en línea.
* Envío automatizado de correos electrónicos.
* Reportes avanzados exportables en PDF/Excel.