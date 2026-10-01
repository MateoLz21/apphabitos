# Spec — Usuario visible, avances parciales e historial por día

Estado: **implementado** el 2026-10-01. Decisiones confirmadas por el usuario: D1 sumar, D4 solo
el total del día, D5 días pasados solo de consulta. D2, D3 y D6 quedaron con la recomendación.
Pendiente la revisión visual en navegador.

## 1. Problemas que resuelve

1. **No se ve quién inició sesión.** El encabezado solo muestra la marca y «Salir».
2. **Los avances parciales no se ven.** Si la meta es 30 minutos de ejercicio y registro 10, el
   valor sí se guarda en la base, pero la pantalla no lo dice: el campo se queda con el «10»
   escrito, no hay «10 de 30» ni barra de avance, y el hábito parece simplemente sin cumplir. Lo
   mismo con el ahorro: si ahorro 2 de 5 soles, no hay ningún sitio donde lo vea.
3. **El calendario no informa.** Cada día es un cuadro verde más o menos intenso y un número. No
   se puede abrir un día para ver qué hábitos se cumplieron, cuáles quedaron a medias y con cuánto.

## 2. Qué se va a construir

### 2.1 Usuario visible en el encabezado

- A la izquierda de «Salir» aparece el nombre del usuario; si no tiene nombre, su correo.
- En pantallas estrechas se muestra solo el nombre de pila o la parte del correo antes de la `@`,
  recortado con puntos suspensivos, para que no empuje el botón.
- El registro pide un campo nuevo, **Nombre**. Se guarda en `profiles.full_name` (la columna y el
  trigger que la rellena ya existen desde la migración `001`).
- En **Ajustes** se añade una tarjeta «Tu cuenta» con el correo (solo lectura) y el nombre
  (editable). Así las cuentas ya creadas, que no tienen nombre, pueden ponerlo.

### 2.2 Avance parcial en hábitos con cantidad

Hoy el campo numérico significa «el total del día» y sustituye lo anterior. Pasa a significar
**«lo que acabo de hacer»** y se suma al total del día.

Ejemplo con «Hacer ejercicio», meta 30 minutos:

| Acción | Total del día | Lo que muestra la tarjeta |
| --- | --- | --- |
| Estado inicial | 0 | `0 de 30 minutos`, barra vacía |
| Escribo 10 y pulso **Sumar** | 10 | `10 de 30 minutos · faltan 20`, barra al 33 %, campo vacío |
| Escribo 20 y pulso **Sumar** | 30 | `30 de 30 minutos`, barra llena, «Meta lograda» |
| Escribo 5 más | 35 | `35 de 30 minutos`, «Meta superada» |

Detalle del comportamiento:

- **El campo se limpia** después de cada registro.
- **Barra de avance** y texto `X de Y unidad` siempre visibles en la tarjeta, también con 0.
- Estados de la tarjeta: sin empezar, **en progreso** (color ámbar), cumplido (verde, como hoy).
- **Corregir**: un enlace pequeño «Corregir total» permite escribir el total del día directamente,
  para arreglar un error de tecleo (por ejemplo, sumé 100 en vez de 10). Poner 0 borra el avance.
- No se aceptan valores negativos ni vacíos.
- El aviso de pendientes muestra el avance: «Hacer ejercicio (10 de 30 minutos)».
- El anillo «Tu progreso de hoy» sigue contando solo hábitos cumplidos (ver decisión D2).

Los hábitos de sí/no no cambian.

### 2.3 Detalle del día en el calendario

- Cada día del calendario se puede pulsar. El día seleccionado queda resaltado.
- Debajo del calendario aparece el panel **«Lo que pasó el martes 29 de septiembre»** con una fila
  por hábito:

  | Hábito | Estado ese día |
  | --- | --- |
  | Ordenar la cama | ✔ Cumplido |
  | Hacer ejercicio | ◐ 10 de 30 minutos |
  | Comer saludable | ✖ Sin registrar |
  | Ahorrar dinero | ◐ 2 de 5 soles |

- Cabecera del panel con el resumen: «2 cumplidos, 2 con avance, de 4 hábitos».
- Al entrar en Historial queda seleccionado el día de hoy.
- Solo se listan los hábitos que **ya existían ese día** (uno creado el 28 no aparece el 20).
- Días futuros: no se pueden seleccionar. Días anteriores a tener cualquier hábito: el panel dice
  «Aún no tenías hábitos ese día».
- Se puede navegar a meses anteriores y abrir cualquier día: este es el «viaje en el tiempo».
- **El color del cuadro tiene en cuenta los avances parciales** (ver decisión D3): un día con dos
  hábitos a medias ya no se ve igual que un día sin nada.

### 2.4 Lo que no cambia

- **Estadísticas**: rachas y porcentajes siguen contando solo días cumplidos. Un avance parcial no
  mantiene una racha. Tampoco se añade navegación por fechas ahí; el historial por día vive en el
  calendario.

## 3. Datos

**No hace falta ninguna migración.**

- El avance ya se guarda: `habit_entries` tiene una fila por hábito y día con `numeric_value`
  (cantidad) y `completed` (si alcanzó la meta). Lo que falta es mostrarlo.
- Sumar un avance = leer el total actual del día, sumarle lo nuevo y guardar el total. `completed`
  se recalcula con la misma regla de hoy: total ≥ meta.
- El calendario ya descarga `numeric_value` de todo el mes; el panel del día se arma con datos que
  ya están en memoria, sin consultas nuevas.
- El nombre usa `profiles.full_name`, que ya existe.

**Limitación conocida:** se guarda el **total del día**, no cada registro por separado. El historial
dirá «10 de 30 minutos el martes», pero no «5 a las 8:00 y 5 a las 19:00». Guardar cada registro
con su hora exigiría una tabla nueva (ver decisión D4).

**Otra limitación:** el avance de días pasados se compara con la meta **actual** del hábito. Hoy no
hay forma de cambiar la meta de un hábito, así que no afecta; si algún día se permite editarla,
habrá que guardar la meta vigente en cada registro.

## 4. Decisiones que necesito que confirmes

| # | Decisión | Mi recomendación |
| --- | --- | --- |
| D1 | ¿El campo numérico **suma** al total del día, o **reemplaza** el total como ahora (solo mejorando lo que se muestra)? | **Sumar**, con «Corregir total» para errores. Es lo que describes: registras 10 y luego el resto. |
| D2 | ¿El anillo «Tu progreso de hoy» cuenta avances parciales (10 de 30 = un tercio de hábito) o solo hábitos cumplidos? | **Solo cumplidos.** Es más simple de leer; el avance parcial ya se ve en cada tarjeta. |
| D3 | ¿El color del día en el calendario refleja avances parciales? | **Sí.** Si no, un día con todo a medias se ve igual que un día vacío, que es justo la queja. |
| D4 | ¿Guardar cada registro con su hora (tabla nueva) o solo el total del día? | **Solo el total**, por ahora. Sin migración ni riesgo antes de la presentación. Se puede añadir después sin rehacer nada. |
| D5 | ¿Se pueden **registrar o corregir días pasados** desde el panel del calendario, o es solo consulta? | **Solo consulta** en esta entrega. Editar el pasado permite «arreglar» rachas y abre más casos que probar. |
| D6 | ¿El nombre es obligatorio al registrarse? | **Obligatorio** en el registro; las cuentas existentes lo completan en Ajustes cuando quieran. |

## 5. Archivos que se tocan

| Archivo | Cambio |
| --- | --- |
| `src/App.tsx` | Nombre del usuario junto a «Salir» |
| `src/pages/AuthPage.tsx` | Campo «Nombre» en el registro |
| `src/pages/SettingsPage.tsx` | Tarjeta «Tu cuenta» |
| `src/services/profile.ts` (nuevo) | Leer y guardar el nombre |
| `src/contexts/TodayProvider.tsx` | Exponer el nombre junto al resto del estado compartido |
| `src/services/habits.ts` | Función para sumar un avance al total del día |
| `src/pages/TodayPage.tsx` | Barra de avance, botón «Sumar», campo que se limpia, «Corregir total» |
| `src/components/PendingHabitsNotice.tsx` | Avance en el texto del aviso |
| `src/pages/HistoryPage.tsx` | Día seleccionable, panel de detalle, color con avances parciales |
| `src/utils/progress.ts` (nuevo) | Cálculo de avance compartido por Hoy, aviso y calendario |
| `src/styles/index.css` | Barra de avance, estado «en progreso», panel del día, nombre en el encabezado |
| `README.md` | Documentar el comportamiento nuevo |

Sin cambios en Supabase: ni SQL ni redespliegue de la Edge Function.

## 6. Orden de trabajo

1. **Avance parcial en «Hoy»** (2.2). Es el fallo que más se nota al usar la app.
2. **Detalle del día en el calendario** (2.3).
3. **Usuario visible** (2.1).

Cada paso deja la app funcionando, así que se puede cortar después de cualquiera de ellos si el
tiempo antes de la presentación no alcanza.

## 7. Cómo se comprobará

- Lógica de avance (sumar, corregir, alcanzar y superar la meta, valores inválidos) y color del día
  con avances parciales: casos de prueba ejecutados con Node antes de entregar.
- Compilación, lint, formato y build en verde.
- **Lo visual no puedo verlo desde aquí.** Tú revisas en el navegador: registrar 10 de 30 y ver la
  barra, completar la meta, abrir un día pasado en el calendario y ver el nombre en el encabezado
  en ancho de móvil.
