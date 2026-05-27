# KingsLand — Documento de Diseño

> Juego de tablero digital, multijugador 1v1 en tiempo real, web.
> Estilo: "ajedrez con economía + fusión".
> Backend: Firebase Realtime Database (vía una capa de "false API").
> Frontend: web (desktop only en MVP).

---

## 1. Concepto

Duelo táctico **1 vs 1** en grid 8x8, sesiones cortas (15 min máx), donde cada jugador empieza con sólo su **rey** y debe gestionar una economía militar para construir un ejército, sumar piezas mediante **fusión** y eliminar al rey enemigo.

### Hooks clave de diseño

- Una sola estadística por unidad (= vida = ataque = curación). Súper legible.
- **Fusión estilo 2048**: 2 unidades iguales = 1 más fuerte.
- **Escolta**: el rey es intocable si tiene aliados a su lado.
- **Sin contraataque**: la iniciativa importa, el rango es vital.

---

## 2. Especificación mecánica

### 2.1 Tablero

- Grid **8x8**, terreno plano (todas las casillas iguales).
- **Adyacencia Chebyshev** (8 vecinos, incluye diagonales).
- 1 casilla = máximo 1 unidad (excepto durante el momento de fusión).
- "Anillo X" = todas las casillas con distancia Chebyshev = X.

### 2.2 Condiciones de victoria

1. **Matar al rey enemigo** → ganas inmediatamente.
2. Si pasan **15 minutos** (reloj compartido) sin que ningún rey caiga → gana el rey con más HP.
3. Si los reyes tienen HP idéntico al expirar → **empate**.

### 2.3 Setup inicial

1. **Sorteo** decide quién es Jugador 1.
2. Jugador 1 elige la **columna de su rey en su fila trasera** (fila 0 para A, fila 7 para B).
3. Jugador 2 elige la columna de su rey en su fila trasera.
4. Cada jugador empieza con: **solo el rey + 6 recursos**, nada más.
5. Arranca el reloj compartido de **15 min**.
6. Jugador 1 juega su turno 1, luego Jugador 2 su turno 1, **alternando**.

### 2.4 Estructura del turno

- **3 AP** (Action Points) por turno.
- Acciones que cuestan **1 AP**: mover, atacar, sanar, fusionar.
- **Reclutar NO cuesta AP** (solo recursos).
- **Una unidad solo puede atacar una vez por turno** (tras atacar queda marcada; se resetea al cambiar de turno). Sí puede seguir moviéndose.
- AP no usados al finalizar turno **se pierden** (no acumulan).
- El jugador puede **terminar turno cuando quiera**, incluso con AP restantes.
- **Sin límite de tiempo por turno** (riesgo de AFK aceptado).
- Una misma unidad puede consumir varios AP en un turno (mover varias veces), pero solo **atacar una vez**.
- Unidades recién reclutadas pueden actuar el mismo turno (**sin summoning sickness**).
- Unidades fusionadas pueden actuar el mismo turno.

### 2.5 Unidades

| Unidad | Coste | Stat Lvl 1 | Stat Lvl 2 | Stat Lvl 3 | Rol |
|---|---|---|---|---|---|
| Rey | — (fijo) | — | — | **10 (sin nivel)** | Objetivo a proteger |
| Caballero | 2 res | 2 | 4 | 8 | Melee, escolta |
| Arquero | 3 res | 2 | 4 | 8 | Rango medio (sweet spot dist 2) |
| Mago | 4 res | 2 | 4 | 8 | Sanador/atacante adyacente |

**Stat única**: vida = ataque (= curación en el mago). Una unidad herida es más débil en todo.

### 2.6 Combate

- **Sin contraataque**: sólo el atacante hace daño. El defensor sufre, pero no responde.
- El daño se resta del stat del defensor. Si llega a 0 o menos, **muere** (se quita del tablero).
- El atacante queda intacto.

### 2.7 Alcances y falloff

Alcance máximo: 3 casillas para arquero y mago.

| Distancia | Caballero | Arquero | Mago |
|---|---|---|---|
| 1 (adyacente) | stat (full) | stat - 1 | **stat (full) ← sweet spot** |
| 2 (anillo siguiente) | — | **stat (full) ← sweet spot** | stat - 1 |
| 3 | — | stat - 1 | stat - 2 |
| 4+ | — | sin alcance | sin alcance |

### 2.8 El rey

- Stat fijo **10**, no sube de nivel.
- **Mueve sólo al inicio del turno**, 1 casilla adyacente, **consume TODOS los AP restantes** del turno.
- **Ataca como caballero** (melee adyacente, daño = 10).
- **No se cura** (ningún efecto restaura HP del rey; daño es permanente).

### 2.9 Escolta

- **Para que un enemigo pueda atacar al rey, NO debe haber ninguna unidad ALIADA al rey adyacente**.
- Si el rey tiene cualquier escolta aliada en sus 8 (o menos) casillas adyacentes, es **intocable**.
- Las unidades enemigas adyacentes al rey NO cuentan como escolta (son la amenaza).
- Romper la escolta es el paso previo obligatorio para atacar al rey.

### 2.10 Mago (caso especial)

- 1 sola acción que se resuelve según el objetivo:
  - Objetivo aliado en rango → **cura** (stat con falloff por distancia).
  - Objetivo enemigo en rango → **ataca** (stat con falloff por distancia).
- **No puede curar**: al rey, ni a sí mismo.
- La curación restaura HP hasta el cap del nivel del objetivo (no overheal).

### 2.11 Fusión

- Condición: **2 unidades del mismo tipo y mismo nivel adyacentes**.
- Acción: mueves una sobre la otra (cuesta 1 AP, igual que mover).
- Resultado: 1 unidad de **nivel +1**, en la casilla de destino.
- Stat resultante: **suma de los stats actuales** de ambas, **cap al nivel nuevo** (sobrante se descarta).
- Caps por nivel: lvl 1 = 2, lvl 2 = 4, lvl 3 = 8. **Lvl 3 es el tope**, no se puede fusionar dos lvl 3.
- Si el resultado tiene stat menor al cap (por fusionar heridas), un mago puede curar después hasta el cap.
- Múltiples fusiones por turno permitidas (con AP suficiente y pares disponibles).

### 2.12 Movimiento

- 1 AP = 1 casilla a cualquier vecina (Chebyshev, 8 direcciones).
- Una unidad puede mover múltiples veces por turno (cada vez = 1 AP).
- No se mueve sobre aliados (excepto si activa fusión).
- No se mueve sobre enemigos (no hay saltos).
- El rey tiene su regla especial (ver 2.8).

### 2.13 Reclutamiento

- Coste: **solo recursos** (Cab=2, Arc=3, Mago=4). NO cuesta AP.
- **Spawn**: en cualquier casilla VACÍA **adyacente al rey** (de las 8 disponibles, menos si el rey está en borde/esquina).
- Requiere al menos 1 casilla adyacente vacía al rey.
- La unidad nueva nace en lvl 1.
- Puede actuar el mismo turno.

### 2.14 Economía

- **Ingreso pasivo: +1 moneda al inicio de cada turno** (evita que la economía se atasque).
- Recursos por kill:
  - Matar unidad lvl 1 = 1 res
  - Matar unidad lvl 2 = 2 res
  - Matar unidad lvl 3 = 3 res
- Matar al rey termina la partida (no genera recursos, ya ganaste).

---

## 3. UI / UX

### 3.1 Target

- **Desktop only** en MVP (resoluciones 1024px+).
- Sin mobile/responsive en esta fase.

### 3.2 Layout general (estilo chess.com)

```
+-----------------------------+------------------+
|                             |  Oponente        |
|                             |  ?? recursos     |
|                             |  Unidades        |
|        TABLERO 8x8          +------------------+
|                             |  Reloj 15:00     |
|                             +------------------+
|                             |  Historial       |
|                             |  T5: mov B3->C4  |
|                             |  T4: atac        |
+-----------------------------+------------------+
|                             |  6 recursos      |
|                             |  4/5 AP          |
|                             |  [Caballero 2]   |
|                             |  [Arquero 3]     |
|                             |  [Mago 4]        |
|                             |  [End turn]      |
+-----------------------------+------------------+
```

### 3.3 Interacción en el tablero

- Modelo **click-click**: 1er click selecciona unidad propia → 2do click ejecuta acción al destino.
- Al seleccionar una unidad, las casillas válidas se resaltan por color:
  - **Azul** = movimiento posible
  - **Rojo** = ataque posible
  - **Verde** = curación posible (solo mago, sobre aliado)
  - **Morado** = fusión posible (aliado mismo tipo+nivel adyacente)
- El sistema **infiere la acción** del destino seleccionado.
- Re-clic sobre la misma unidad seleccionada → deselecciona.

### 3.4 Estilo visual

- **Minimalista/abstracto**, formas geométricas en SVG/CSS.
- Propuesta: estrella = rey, círculo = caballero, triángulo = arquero, rombo = mago.
- Color por jugador (ej: A=azul, B=rojo).
- Nivel indicado por puntos sobre la forma (1, 2 o 3 puntos).
- Stat actual indicado por número dentro de la forma.

### 3.5 Información visible

- **Propia**: todo (unidades, niveles, stats actuales, AP, recursos).
- **Oponente**: unidades, niveles, stats actuales visibles. **Recursos OCULTOS**.
- Reloj compartido visible para ambos.

### 3.6 Reclutamiento (UI)

- Panel siempre visible en HUD (sección inferior derecha) con 3 botones (Caballero/Arquero/Mago) y sus costes.
- Botón gris/disabled si no tienes recursos suficientes.
- Click en botón → tablero resalta casillas válidas adyacentes al rey → click destino = recluta.

### 3.7 Identidad jugador

- **Anonymous Auth** de Firebase.
- Al entrar, escribes un nombre (display name). UID asignado automáticamente.
- No hay cuentas registradas, no hay persistencia entre sesiones (todavía).

### 3.8 Matchmaking

- **Solo partidas privadas por código** en MVP.
- A crea sala → recibe código (ej: "ABC123") o enlace.
- B entra el código → se une.
- Cuando ambos están listos, sorteo decide quién juega primero.

### 3.9 Desconexión

- Estado persiste en Firebase, reloj sigue corriendo.
- El desconectado puede reconectar y retomar si vuelve a tiempo (antes de los 15 min).
- Sin "lose by disconnect"; la partida sigue normal.

### 3.10 Flujo pre-partida

1. Menú: escribes nombre → "Crear" o "Unirse".
2. Crear → sala de espera mostrando el código compartible; estado "esperando rival".
3. Rival entra con el código.
4. **Auto-start**: en cuanto el segundo jugador entra, arranca el sorteo inmediatamente (sin ready check ni cuenta regresiva).
5. Tras el sorteo: colocación de reyes. Al jugador que va primero se le resalta su fila trasera y hace click en una columna para colocar su rey. El otro ve "Esperando que [rival] coloque su rey". Luego al revés.
6. Empieza la partida.

### 3.11 Fin de partida

- Pantalla mínima: muestra **VICTORIA / DERROTA / EMPATE** + botón "Volver al menú".
- **Sin revancha en MVP** (para jugar otra vez, se crea sala nueva).

### 3.12 Animaciones y feedback (nivel: moderado)

- Movimiento: la pieza se desliza con transición CSS suave.
- Daño: flash rojo breve sobre la unidad golpeada + número de daño flotante (ej: "-3").
- Muerte: fade-out al morir.
- Fusión: animación especial (las dos formas se juntan y la resultante crece).
- Casillas válidas: highlight pulsante al seleccionar una unidad.

### 3.13 Audio

- **Efectos de sonido** para acciones: mover, atacar, curar, fusionar, reclutar, victoria/derrota.
- **Música de fondo ambiental** (loop sutil).
- **Controles de volumen** separados (efectos / música) + mute.
- Assets iniciales: royalty-free / CC0.

### 3.14 Onboarding / tutorial

- **Nada en MVP**: se asume que los jugadores conocen las reglas (explicación externa o entre amigos).
- Tutorial/how-to-play queda para post-MVP.

---

## 4. Pendientes / "To watch"

### Decididos pero a vigilar en playtests

- **Snowball económico**: mitigado por escolta + fusión + costes altos. Playtest lo confirmará.
- **First-strike meta**: mitigado por escolta + rey stat 10 + rango. Playtest dirá si necesita más balance.
- **Poder del lvl 3 ilimitado por turno**: aceptado como "win condition de facto". Podría necesitar nerf si rompe partidas.
- **AFK / griefing**: aceptado sin per-turn limit. Podría requerir per-turn timer en v1.

### Diferido a post-MVP (decidido NO incluir ahora)

- Revancha desde la pantalla de fin de partida (en MVP se crea sala nueva).
- Tutorial / pantalla "cómo jugar" (en MVP, explicación externa).
- Resumen de partida / stats al final (duración, unidades perdidas, etc.).
- Mobile / responsive.
- Spectator mode, replays, ranking, stats persistentes entre sesiones.

---

## 5. Próximos pasos

1. Diseñar el **modelo de datos** (esquema JSON del estado de partida).
2. Diseñar la **"false API"**: funciones que simulan endpoints (`createGame`, `joinGame`, `performAction`, etc.) pero internamente leen/escriben en Firebase Realtime Database.
3. Definir un **roadmap de implementación** por fases (MVP → v1 → polish).
4. Comenzar a codear el cliente y la capa de datos.
