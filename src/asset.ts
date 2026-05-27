/**
 * Construye la URL de un asset de `public/` respetando la base del sitio
 * (import.meta.env.BASE_URL). En dev es "/", en GitHub Pages "/kinsgland/".
 * Necesario porque las rutas absolutas "/units/..." se romperían en Pages.
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
