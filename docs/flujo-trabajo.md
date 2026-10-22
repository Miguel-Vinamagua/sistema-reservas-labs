# Flujo de Trabajo y Metodología

## Modelo de Ramas: GitHub Flow
Se adoptó **GitHub Flow** debido a su agilidad para equipos pequeños (2 desarrolladores) y entregas continuas a una rama de producción (`main`).

* `main` está protegida; no se permiten `push` directos ni fusiones sin aprobación.
* Toda nueva funcionalidad o corrección se desarrolla en ramas cortas (`feat/`, `fix/`, `ci/`, `docs/`).
* Todo cambio se integra mediante Pull Requests revisados, aprobados y respaldados por el pipeline de CI/CD.

### Por qué no Git Flow
Git Flow introduce ramas de larga duración (`develop`, `release`, `hotfix`) que agregan burocracia innecesaria e incrementan la complejidad de los *merge conflicts* en equipos reducidos de desarrollo.

## Nombres de Ramas

| Prefijo | Propósito | Ejemplo |
| :--- | :--- | :--- |
| `feat/` | Desarrollo de nuevas características | `feat/6-autenticacion-jwt` |
| `fix/` | Corrección de errores | `fix/provide-http-client` |
| `docs/` | Documentación o Spec Kit | `docs/35-documentacion` |
| `ci/` | Configuración e Integración Continua | `ci/9-pipeline-inicial` |

## Commits Convencionales
Se sigue el estándar *Conventional Commits*: `<tipo>(<alcance>): <descripción>`.  
Tipos utilizados: `feat`, `fix`, `docs`, `test`, `chore`, `ci`.

## Ciclo de Desarrollo de una Tarea
1. Seleccionar o crear el Issue correspondiente en el tablero de GitHub Projects.
2. Sincronizar `main` localmente y crear la rama corta orientada al issue.
3. Aplicar **TDD**: Escribir las pruebas primero, verificar que fallen (Red), implementar el código (Green) y refactorizar.
4. Ejecutar las suites de pruebas locales (`npm test`).
5. Realizar commit y `push` a la rama remota.
6. Abrir Pull Request vinculando el issue (`Closes #N`).
7. Esperar que los comprobadores automáticos de GitHub Actions queden en **verde** y recibir la aprobación de la revisión de código por pares (*Code Review*).
8. Realizar el *Merge* hacia `main`.

## Reparto de Responsabilidades

| Integrante | Responsabilidades |
| :--- | :--- |
| **Miguel Vinamagua** | Configuración de arquitectura Backend, Mongoose schemas, tests de integración con Jest/Supertest, integración de pipeline CI/CD en GitHub Actions y documentación general. |
| **Andrea Bowen** | Diseño y desarrollo de componentes Frontend en Angular 20, integración con servicios HTTP, maquetación con Tailwind CSS, revisión de código en PRs y pruebas Karma. |