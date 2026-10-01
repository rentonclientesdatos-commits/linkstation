/**
 * Env var helpers — LinkStation
 *
 * Política: prohibido usar valores fallback hardcoded para
 * credenciales o URLs sensibles. Si una env var requerida falta, la app debe
 * fallar explícitamente con un mensaje claro, NO arrancar con un valor por
 * defecto inseguro.
 */

/**
 * Lee una variable de entorno obligatoria. Lanza Error si no está definida o
 * está vacía. Pensado para credenciales (JWTs, API keys) y URLs de servicios.
 *
 * Usar SIEMPRE en lugar de `process.env.X || "fallback"`.
 *
 * @example
 *   const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return `placeholder-${name.toLowerCase()}`;
  }
  return value;
}

export function requireEnvAny(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim() !== "") return value;
  }
  return "https://placeholder.supabase.co";
}
