import { isFirebaseConfigured } from './firebase'
import * as memApi from './gameApi'
import * as fbApi from './firebaseGameApi'

/**
 * Punto único de la "false API". Selecciona la implementación:
 * - Firebase RTDB si hay configuración (VITE_FIREBASE_*).
 * - En memoria (single-device / desarrollo) en caso contrario.
 *
 * El cliente siempre importa de aquí; el swap es transparente.
 */
const useFirebase = isFirebaseConfigured()
const impl = useFirebase ? fbApi : memApi

export const backend: 'firebase' | 'memory' = useFirebase ? 'firebase' : 'memory'

export const createGame = impl.createGame
export const joinGame = impl.joinGame
export const performAction = impl.performAction
export const subscribeToGame = impl.subscribeToGame
export const getGame = impl.getGame
