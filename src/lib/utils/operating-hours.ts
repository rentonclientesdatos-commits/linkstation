/**
 * Helper para validación de horarios de atención de restaurantes y negocios,
 * con soporte para turnos que cruzan la medianoche (ej: 15:00 a 05:00).
 */

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toLowerCase();
  // Detectar formatos como "3pm", "5am", "15:00", "21:30"
  if (clean.includes("pm") || clean.includes("am")) {
    const isPm = clean.includes("pm");
    const numPart = clean.replace(/[^\d:]/g, "");
    let [h, m] = numPart.split(":").map((v) => parseInt(v, 10) || 0);
    if (isNaN(m)) m = 0;
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return h * 60 + m;
  }

  const parts = clean.split(":").map((v) => parseInt(v, 10) || 0);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  return h * 60 + m;
}

/**
 * Comprueba si una hora (ej: "21:30" o "02:00") cae dentro del horario de atención.
 * Maneja tanto horarios diurnos ("09:00" a "20:00") como horarios nocturnos ("15:00" a "05:00").
 */
export function isTimeWithinOperatingHours(
  targetTimeStr: string,
  startTimeStr: string,
  endTimeStr: string
): boolean {
  if (!targetTimeStr) return true; // Si no especificó hora, no bloqueamos
  const targetMin = parseTimeToMinutes(targetTimeStr);
  const startMin = parseTimeToMinutes(startTimeStr);
  const endMin = parseTimeToMinutes(endTimeStr);

  if (startMin <= endMin) {
    // Rango diurno en el mismo día (ej: 09:00 a 20:00)
    return targetMin >= startMin && targetMin <= endMin;
  } else {
    // Rango nocturno que cruza la medianoche (ej: 15:00 a 05:00 del día siguiente)
    // Es válido si es desde las 15:00 en adelante (hasta 23:59)
    // O desde las 00:00 hasta las 05:00
    return targetMin >= startMin || targetMin <= endMin;
  }
}

/**
 * Genera una descripción legible en español del horario
 */
export function formatOperatingHoursText(startTime: string, endTime: string): string {
  const formatTime = (t: string) => {
    const min = parseTimeToMinutes(t);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const minStr = m > 0 ? `:${pad(m)}` : "";
    return `${h12}${minStr} ${period} (${pad(h)}:${pad(m)})`;
  };

  return `de ${formatTime(startTime)} a ${formatTime(endTime)}`;
}

/**
 * Formatea la lista de días de atención
 */
export function formatDaysText(days: number[]): string {
  if (!days || days.length === 0 || days.length === 7) {
    return "Todos los días (Lunes a Domingo)";
  }
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map((d) => dayNames[d]).join(", ");
}
