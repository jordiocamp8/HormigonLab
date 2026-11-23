# HormigónLab · v1.3.0

**Creado por Jordi Ocampo.** Herramienta académica de predosificación de hormigón convencional, desarrollada en el contexto de estudios de Ingeniería Civil en la UTPL.

[Abrir HormigónLab en GitHub Pages](https://jordiocamp8.github.io/HormigonLab/). Para usarla sin internet, guarda **dist/HormigonLab-portatil.html** en tu equipo y ábrelo en un navegador moderno.

## Del diseño a la amasada

1. En **Diseño**, elige **Cargar demostración** para practicar con el ejemplo de 28 MPa, o **Nuevo diseño real** para trabajar con tus propios ensayos y especificaciones.
2. En **Materiales**, registra las propiedades de cemento, áridos, agua y aditivo. El botón **ⓘ** junto al campo explica qué dato copiar, con qué unidades y, cuando corresponde, cómo calcularlo en **Laboratorio**. Puedes pasar el cursor, usar el teclado o tocar el botón en el teléfono. Los ejemplos de la ayuda no rellenan el campo.
3. En **Resultados**, consulta la dosificación por m³ y la memoria paso a paso. El agua efectiva determina la relación a/c; el **agua a añadir** es la cantidad que corresponde pesar después de corregir por la humedad de los áridos y el agua del aditivo. Usa **Lotes y costos** para escalar la mezcla al volumen que vas a preparar.
4. En **Mezcla de prueba → Bitácora de amasadas**, anota un código, fecha, volumen nominal y **los kg que realmente pesaste de cada material para toda la amasada**. Puedes incorporar la densidad fresca, el asentamiento y el aire medidos. El registro conserva el diseño de ese momento y compara las cantidades previstas y pesadas.
5. En **Seguimiento de probetas**, selecciona la amasada e ingresa la identificación de cada probeta, su edad real, el diámetro medido y la carga máxima de rotura. El informe muestra la resistencia individual a la edad ensayada; no proyecta resultados a otras edades.

**Cómo leer el rendimiento:** en la bitácora es la masa total realmente pesada (kg) dividida por la densidad fresca medida (kg/m³). Por ejemplo, 72,0 kg y 2400 kg/m³ dan **0,030 m³**, es decir, 30 L. Sin una densidad medida no se muestra un rendimiento medido. La calculadora anterior de mezcla de prueba sigue disponible: estima el rendimiento a partir de cantidades **teóricas** del diseño.

## Novedades de la v1.3

- **Laboratorio** se organiza en áridos, hormigón fresco y endurecido. Añade finos por lavado, densidad fresca y rendimiento con masa real, aire por presión y volumétrico, compresión nominal con dimensiones y absorción/vacíos permeables. Cada registro conserva mediciones, fecha, muestra, procedencia y fórmulas; se incluye en el JSON. Las correcciones de aire son entradas documentadas, no tablas asumidas. La compresión nominal no aplica correcciones de esbeltez ni aceptación automática.
- **Informes** ofrece formato académico con referencias APA 7 o ficha técnica resumida, vista previa, selección de gráficas, memoria y registros, descarga HTML e impresión a PDF. Las tablas y figuras se numeran. La memoria queda como anexo y las gráficas de resistencia solo muestran probetas registradas, agrupadas por amasada.
- **Guías de ensayo** reúne doce rutas didácticas por tipo de material, equipo, mediciones y pasos, con enlaces a ASTM, INEN y al manual público WSDOT/WAQTC. Estas rutas no reproducen ni reemplazan el procedimiento oficial completo. Consulta la edición aplicable; ciertos documentos requieren acceso institucional o compra. El manual WSDOT está en inglés y sigue métodos AASHTO, sin equivalencia automática con NTE INEN.
- Para guardar PDF, abre **Informes → Imprimir / guardar PDF**, selecciona **Guardar como PDF**, papel A4 y escala 100 %. Desactiva los encabezados y pies del navegador; el documento incorpora su propia numeración de página cuando el navegador la admite.

## Reutilizar y comparar

- **Biblioteca de materiales** (en Materiales): guarda una ficha con nombre, fecha y referencia del ensayo o proveedor. Al aplicar una ficha de arena o grava se recuperan sus propiedades de caracterización y queda vacía la humedad. Ingresa la medición del día antes de volver a dosificar. Las fichas de demostración no se aplican a diseños reales.
- **Mis proyectos → Comparador de dos escenarios**: compara el diseño abierto, versiones guardadas o demostraciones. Las diferencias se expresan como **B − A**. El comparador explica qué controla el cemento, separa los aportes que cambian el agua a añadir y distingue el costo que cambia por cantidades del que cambia por precios. Si una mezcla sale del alcance de las tablas, muestra la causa sin inventar cantidades.

## Guardar proyectos y respaldos

La aplicación realiza los cálculos en tu navegador; no requiere crear una cuenta. Los datos de los proyectos se guardan localmente en el navegador que usas, no se sincronizan entre equipos. **Exporta tus proyectos a JSON** para mantener respaldos. Los enlaces a referencias técnicas pueden abrir sitios externos.

- La v1.3 conserva la clave de almacenamiento anterior en el mismo sitio y admite proyectos JSON de esquemas 1, 2, 3 y 4. Al abrir un proyecto antiguo no se inventan amasadas ni ensayos nuevos.
- **Guardar proyecto** crea una versión en el navegador. El **JSON** de la v1.3 respalda el proyecto abierto, su bitácora y la biblioteca de materiales: ten presente ese contenido si decides compartirlo.
- **CSV** exporta cantidades; el **informe HTML** y **Imprimir / PDF** presentan la memoria y las amasadas reales registradas cuando correspondan. Un registro de demostración no se convierte en evidencia experimental.
- La copia portátil puede tener un almacenamiento distinto al sitio web. Para cambiar de navegador, equipo o copia, exporta el proyecto a JSON e impórtalo en el destino. La web conserva la configuración de Google Analytics de la publicación original; la copia portátil no carga ese script.

## Cómo actualizar esta misma página

El [repositorio jordiocamp8/HormigonLab](https://github.com/jordiocamp8/HormigonLab) ya corresponde al enlace público indicado arriba. **Editar archivos en tu computadora no cambia la web.** GitHub Pages publica el `index.html` de la raíz de `main` cuando los cambios llegan a esa rama.

1. Prepara los cambios en una rama de trabajo. Edita los módulos de `dist/`, su plantilla `dist/index.html` y sus estilos. El archivo `index.html` de la raíz se genera; editarlo a mano haría que los cambios se perdieran en la siguiente generación.
2. Desde la carpeta del repositorio, ejecuta estos comandos con Node.js 24. No se necesitan paquetes adicionales:

   ```text
   node portable.cjs
   node --test tests/*.test.cjs
   node serve.cjs
   ```

   El primer comando genera el `index.html` de GitHub Pages y `dist/HormigonLab-portatil.html`. El segundo comprueba, entre otras cosas, el motor y la copia portátil. El tercero abre un servidor de prueba en `http://127.0.0.1:4173`; prueba la interfaz allí y ciérralo con Ctrl+C al terminar.
3. Guarda en Git las fuentes, los archivos generados y las pruebas. Sube la rama y, una vez revisada, incorpora los cambios a `main` en el mismo repositorio.
4. Revisa el despliegue asociado a ese cambio en [Actions](https://github.com/jordiocamp8/HormigonLab/actions). Cuando finalice correctamente, abre la dirección habitual y comprueba el número de versión de la interfaz. No hace falta subir un ZIP, crear otro sitio ni configurar Pages de nuevo.

## Alcance y advertencias

**Es una herramienta académica de predosificación.** No certifica mezclas, no reemplaza ensayos de laboratorio, ni garantiza el cumplimiento de todas las ediciones aplicables de ACI, ASTM, NEC o NTE INEN. Los datos precargados son **de demostración**, no ensayos reales. El sitio no representa un servicio oficial de la UTPL ni implica aprobación de la universidad.

La publicación es de acceso gratuito. La disponibilidad pública de este repositorio no implica por sí sola una licencia de reutilización del código fuente; puedes establecer una licencia por separado cuando lo decidas.
