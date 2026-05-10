/**
 * Formata um telefone brasileiro enquanto o usuário digita.
 * Aceita até 11 dígitos e aplica máscara (DD) 9XXXX-XXXX.
 */
export function formatPhone(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Valida um celular brasileiro: 11 dígitos, DDD válido (11-99), 9º dígito = 9.
 */
export function isValidPhone(formatted) {
  const digits = formatted.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digits[2] !== "9") return false;
  return true;
}

/**
 * Normaliza código de evento (uppercase, sem espaços).
 */
export function normalizeEventCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
