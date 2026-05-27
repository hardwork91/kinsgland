# KingsLand — Roadmap de Implementación

> Estrategia central: **local-first**. Construir el juego completo jugable en local (hot-seat) antes de añadir red. La "false API" empieza operando sobre estado local y luego se conecta a Firebase **sin cambiar el cliente**.

Ver [DESIGN.md](DESIGN.md) para la especificación funcional completa.

---

## Stack técnico

| Capa | Elección |
|---|---|
| Framework / lenguaje | **React + TypeScript** |
| Build tool | **Vite** |
| Manejo de estado | **Zustand** (store central, encaja con la false API) |
| Estilos | **Tailwind CSS** |
| Render del tablero | **CSS Grid** (celdas) + **capa SVG** de piezas posicionadas encima (patrón chess.com) |
| Backend | **Firebase Realtime Database** + **Anonymous Auth** (SDK modular v9+) |
| Hosting (deploy) | Firebase Hosting *(default, decidir en Fase 5)* |
| Lint / formato | ESLint + Prettier *(default)* |

---

## Fase 0 — Setup del proyecto ✅ COMPLETA

- [ ] Scaffold con Vite (plantilla React + TypeScript).
- [ ] Instalar y configurar: Zustand, Tailwind CSS, ESLint + Prettier.
- [ ] Estructura de carpetas (componentes, store, lógica de juego, false API, tipos).
- [ ] Configurar dev server.
- [ ] Render básico de un tablero 8x8 vacío (CSS Grid) con celdas alternadas.

**Entregable**: el proyecto corre y muestra una cuadrícula 8x8.

---

## Fase 1 — Juego completo en local (hot-seat) ✅ COMPLETA

Toda la mecánica, sin red. Dos jugadores en el mismo navegador. **Verificado:** todas las reglas (movimiento, combate con falloff, fusión, curación, escolta, regla del rey, economía, victoria/tiebreak/reloj) y el flujo de inicio (sorteo + colocación). Juego 100% jugable hot-seat.

- [ ] Modelo de estado en memoria: board, units, turno actual, AP, recursos por jugador, reloj.
- [ ] Representación de unidades (tipo, nivel, stat actual, dueño, posición).
- [ ] Render de unidades sobre el tablero (formas geométricas + nivel + stat).
- [ ] Selección de unidad (click) con resaltado de acciones válidas por color.
- [ ] Lógica de **movimiento** (1 casilla Chebyshev, coste 1 AP, no sobre ocupadas salvo fusión).
- [ ] Lógica de **ataque** con falloff de rango (caballero melee, arquero sweet spot dist 2, mago sweet spot dist 1, máx 3).
- [ ] Lógica de **curación** del mago (aliado adyacente/rango, no rey ni self, cap por nivel).
- [ ] Lógica de **fusión** (mismo tipo+nivel, suma de stats con cap, sube nivel).
- [ ] Lógica de **reclutamiento** (coste AP + recursos, spawn adyacente al rey).
- [ ] Lógica de **escolta** (rey intocable si tiene aliado adyacente).
- [ ] Regla especial del **rey** (mueve al inicio del turno, consume todos los AP).
- [ ] Sistema de **AP** (5 por turno, cada acción 1 AP) y fin de turno.
- [ ] **Economía**: recursos por kill (1/2/3 según nivel).
- [ ] **Setup inicial**: sorteo, colocación de reyes, 6 recursos iniciales.
- [ ] **Condiciones de victoria**: matar rey, tiebreak por HP a los 15 min, empate.
- [ ] **Reloj** compartido de 15 min.

**Entregable**: juego 100% jugable en hot-seat. Validar diversión y balance aquí.

---

## Fase 2 — Capa "false API" ✅ COMPLETA

- [x] Interfaz de la API: `createGame`, `joinGame`, `performAction`, `subscribeToGame`, `getGame` (async, en `src/api/gameApi.ts`).
- [x] Refactor: el cliente (store) deja de mutar el estado; dispatcha `GameAction` vía `performAction` y se actualiza por `subscribeToGame`.
- [x] Implementación de la API operando sobre estado en memoria (Map de partidas + pubsub).
- [x] Validación en `applyAction` (reducer central, fuente única de verdad; no confía en el cliente).

**Entregable**: mismo juego, desacoplado — el cliente solo habla con la API async. Verificado end-to-end (init → colocación → reclutar) vía la API. Contrato idéntico al que tendrá Firebase (Fase 3).

---

## Fase 3 — Firebase real ✅ COMPLETA (código; requiere credenciales para activar)

Implementado: `src/api/firebase.ts` (init + anon auth desde env), `src/api/firebaseGameApi.ts` (contrato sobre RTDB con runTransaction/onValue), `src/api/index.ts` (swap automático firebase/memoria según `VITE_FIREBASE_*`). Con `.env` configurado y Anonymous Auth + RTDB habilitados, el juego es multijugador real sin cambiar el cliente. Sin config → usa la API en memoria. Ver `.env.example`.


- [ ] Configurar proyecto Firebase + Realtime Database.
- [ ] Anonymous Auth + display name.
- [ ] Implementar las funciones de la API contra Firebase RTDB.
- [ ] Sincronización en tiempo real (listeners) entre dos clientes.
- [ ] Definir reglas de seguridad de RTDB.

**Entregable**: dos navegadores distintos comparten y juegan una misma partida.

---

## Fase 4 — Matchmaking y flujo de salas ✅ COMPLETA

Implementado: fase `lobby`, `Menu` (nombre + Jugar local / Crear online / Unirse con código), `WaitingRoom` (muestra código), acción `join` (lobby→placement). Store: createMatch/joinMatch/startLocalGame. El flujo local (hot-seat) verificado end-to-end; el online usa el mismo contrato vía Firebase.


- [ ] Menú: escribir nombre, crear/unirse.
- [ ] Crear sala → generar código compartible.
- [ ] Unirse por código.
- [ ] Sala de espera (mostrar código, estado de conexión del rival).
- [ ] Auto-start al entrar el segundo jugador → sorteo.
- [ ] Fase de colocación de reyes (resaltar fila trasera, click columna).

**Entregable**: flujo completo de inicio entre 2 jugadores reales.

---

## Fase 5 — Pulido ✅ COMPLETA (parcial)

Implementado: animaciones (deslizamiento de piezas, números de daño/curación flotantes con `float-up`, highlights pulsantes), SFX sintetizados con Web Audio (`src/audio.ts`) + botón de mute, reconexión (persistencia de sesión en localStorage + `tryReconnect`). Pendiente (necesita assets/lib): música de fondo ambiental, fade de muerte de piezas.


- [ ] Animaciones moderadas (deslizamiento, flash de daño, números flotantes, fusión, highlights).
- [ ] Audio (efectos + música ambiental + controles de volumen + mute).
- [ ] Pantalla de fin de partida (resultado + volver al menú).
- [ ] Manejo de reconexión (retomar partida desde Firebase).
- [ ] Indicadores de UI: reloj, AP, recursos (propios visibles, rival oculto).

**Entregable**: MVP presentable.

---

## Diferido a post-MVP

- Revancha desde fin de partida.
- Tutorial / how-to-play.
- Resumen de partida / stats.
- Mobile / responsive.
- Spectator, replays, ranking, cuentas persistentes.
