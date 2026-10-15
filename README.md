# HormigónLab · Versión web v1.1.0

Herramienta académica de **predosificación de hormigón convencional** desarrollada en el contexto de estudios de Ingeniería Civil en la UTPL. 

## Abrir la aplicación

GitHub Pages puede publicar `index.html` directamente desde la rama `main` y la carpeta `/(root)`.

La aplicación realiza los cálculos en tu navegador; no requiere crear una cuenta. Los datos de los proyectos se guardan localmente en el navegador que usas, no se sincronizan entre equipos. **Exporta tus proyectos a JSON** para mantener respaldos. Los enlaces a referencias técnicas pueden abrir sitios externos.

## Qué permite hacer

- Configurar resistencia, trabajabilidad, agregados y otras condiciones de diseño.
- Calcular cemento, agua y áridos, y aplicar correcciones de humedad y absorción.
- Consultar una memoria de cálculo paso a paso, comparar diseños y generar informes.
- Analizar datos granulométricos y guardar versiones locales de los proyectos.

## Alcance y advertencias

**Es una herramienta académica de predosificación.** No certifica mezclas, no reemplaza ensayos de laboratorio, ni garantiza el cumplimiento de todas las ediciones aplicables de ACI, ASTM, NEC o NTE INEN. Los datos precargados son **de demostración**, no ensayos reales. El sitio no representa un servicio oficial de la UTPL ni implica aprobación de la universidad.

La publicación es de acceso gratuito. La disponibilidad pública de este repositorio no implica por sí sola una licencia de reutilización del código fuente; puedes establecer una licencia por separado cuando lo decidas.

## Publicación con GitHub Pages

1. Crea un repositorio público llamado `HormigonLab` en GitHub.
2. Sube estos archivos **sin comprimir** a la raíz del repositorio (`index.html`, `.nojekyll`, `README.md`).
3. En el repositorio, abre **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**, rama `main`, directorio `/(root)` y **Save**.
5. GitHub mostrará el vínculo público del sitio, normalmente `https://TU_USUARIO.github.io/HormigonLab/`.

## Versión

1.1.0 — preparado para alojamiento estático, sin dependencia de servidor.
