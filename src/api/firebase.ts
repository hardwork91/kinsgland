import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'

/**
 * Configuración de Firebase leída de variables de entorno Vite (VITE_FIREBASE_*).
 * Copia `.env.example` a `.env` y rellena con los datos de tu proyecto Firebase.
 * Requiere: Realtime Database habilitada y Anonymous Auth activado en la consola.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** ¿Hay configuración suficiente para usar Firebase? Si no, la app usa la API en memoria. */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.databaseURL && config.projectId)
}

let app: FirebaseApp | null = null
let db: Database | null = null
let auth: Auth | null = null

export function getFirebase(): { app: FirebaseApp; db: Database; auth: Auth } {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase no está configurado (faltan variables VITE_FIREBASE_*).')
  }
  if (!app) {
    app = initializeApp(config)
    db = getDatabase(app)
    auth = getAuth(app)
  }
  return { app: app!, db: db!, auth: auth! }
}

/** Garantiza una sesión anónima y devuelve el uid. */
export async function ensureAuth(): Promise<string> {
  const { auth } = getFirebase()
  if (auth.currentUser) return auth.currentUser.uid
  const cred = await signInAnonymously(auth)
  return cred.user.uid
}
