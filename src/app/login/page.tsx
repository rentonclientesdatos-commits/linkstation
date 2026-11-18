"use client";

import { useState, useEffect } from "react";
import { loginAction, resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EnterpriseSolution {
  id: string;
  badge: string;
  pillLabel: string;
  meetingTitle: string;
  meetingSubtitle: string;
  priorities: string;
  bullet: string;
  promptText: string;
  quote: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  statBadge: string;
}

const SOLUTIONS: EnterpriseSolution[] = [
  {
    id: "scheduling",
    badge: "Agendamiento 24/7",
    pillLabel: "Agendamiento 24/7",
    meetingTitle: "Valoración & Diagnóstico Dental",
    meetingSubtitle: "Paciente Nuevo · Ortodoncia & Limpieza",
    priorities: "00:00 - 08:30 · Asignación de Sillón 1",
    bullet: "Cualificar motivo de consulta, previsión/cobertura y disponibilidad horaria del paciente.",
    promptText: "Confirmar cita por WhatsApp y sincronizar con la agenda de DentiPro...",
    quote: "LinkStation agenda y reprograma pacientes 24/7 sin que se nos escape ninguna consulta ni en fines de semana.",
    authorName: "Dr. Roberto Valenzuela",
    authorRole: "Director Clínico · Clínica DentiPro",
    authorInitials: "RV",
    statBadge: "+1,450 citas / mes",
  },
  {
    id: "qualification",
    badge: "Triaje Inteligente",
    pillLabel: "Triaje de Tratamientos",
    meetingTitle: "Cualificación de Implantes & Cirugía",
    meetingSubtitle: "Paciente Premium · Rehabilitación Oral Completa",
    priorities: "00:00 - 10:15 · Box Quirúrgico",
    bullet: "Detectar urgencia odontológica, tratamientos previos y presupuesto estimado del paciente.",
    promptText: "Enviar cotización inicial y agendar escaneo 3D con especialista...",
    quote: "Los pacientes llegan al box dental informados y con el tratamiento pre-aprobado, duplicando la tasa de aceptación.",
    authorName: "Dra. Camila Soto",
    authorRole: "Especialista en Implantología · Clínica DentiPro",
    authorInitials: "CS",
    statBadge: "94% aceptación de casos",
  },
  {
    id: "anti-noshow",
    badge: "Control Anti No-Show",
    pillLabel: "Anti No-Show & Reactivación",
    meetingTitle: "Confirmación Automática Multicanal",
    meetingSubtitle: "Controles Periódicos & Limpieza Profiláctica",
    priorities: "Recordatorio 24h & 2h antes · Canal WhatsApp",
    bullet: "Reconfirmación interactiva con botón de asistencia y reubicación automática de huecos libres.",
    promptText: "Reasignar sillón liberado a paciente en lista de espera inmediata...",
    quote: "Redujimos la tasa de inasistencia en un 82% y reactivamos a más de 120 pacientes inactivos en el primer mes.",
    authorName: "Ignacio Tapia",
    authorRole: "Gerente de Operaciones · Clínica DentiPro",
    authorInitials: "IT",
    statBadge: "-82% inasistencias",
  },
];

function DentiProLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-600/10 text-blue-400 shadow-md">
        {/* Dental / Health Cross & Tooth Icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2C8.5 2 6 4.5 6 8c0 3.5 1.5 6 2.5 9 .8 2.3 1.5 5 3.5 5s2.7-2.7 3.5-5c1-3 2.5-5.5 2.5-9 0-3.5-2.5-6-6-6z" />
          <path d="M9 10h6" />
          <path d="M12 7v6" />
        </svg>
      </div>
      <div>
        <span className="text-base font-extrabold tracking-tight text-white uppercase">
          Clínica DentiPro
        </span>
        <span className="block text-[10px] font-semibold tracking-widest text-[#8a8f9d] uppercase">
          Portal Enterprise · LinkStation
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [activeSolutionIdx, setActiveSolutionIdx] = useState(0);

  // Auto-rotate solutions every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSolutionIdx((prev) => (prev + 1) % SOLUTIONS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const activeSolution = SOLUTIONS[activeSolutionIdx];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await loginAction(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await resetPasswordAction(email);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setResetSuccess(true);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#07080a] p-4 md:p-8 antialiased">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[850px] rounded-full bg-blue-600/[0.04] blur-[150px]" />

      {/* Main Split-Screen Container */}
      <div className="relative z-10 grid w-full max-w-[1060px] overflow-hidden rounded-[28px] border border-[#23252e] bg-[#0c0d12] shadow-2xl lg:grid-cols-2">
        {/* LEFT COLUMN: Authentication Form */}
        <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          <div>
            {/* Brand Logo: Clínica DentiPro */}
            <div className="mb-8">
              <DentiProLogo />
            </div>

            {isForgotPassword ? (
              /* Forgot password mode */
              resetSuccess ? (
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Correo enviado
                  </h1>
                  <p className="text-xs leading-relaxed text-[#8a8f9d]">
                    Si <strong className="text-white">{email}</strong> está registrado en el sistema de Clínica DentiPro, recibirás las instrucciones para restablecer tu contraseña.
                  </p>
                  <Button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSuccess(false);
                    }}
                    className="mt-4 h-11 w-full rounded-xl bg-white text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
                  >
                    Volver a Iniciar Sesión
                  </Button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="group mb-5 flex items-center gap-1.5 text-xs font-semibold text-[#8a8f9d] transition-colors hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Volver al login
                  </button>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Recuperar contraseña
                  </h1>
                  <p className="mt-2 mb-6 text-xs text-[#8a8f9d]">
                    Ingresa tu correo institucional de Clínica DentiPro para recibir el acceso.
                  </p>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs font-medium text-zinc-300">
                        Correo Electrónico
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="doctor@dentipro.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 rounded-xl border border-[#272935] bg-[#161720] px-3.5 text-xs text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 w-full rounded-xl bg-white text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.99]"
                    >
                      {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                    </Button>
                  </form>
                </div>
              )
            ) : (
              /* Standard login mode */
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  El Asistente de IA para Clínica DentiPro
                </h1>
                <p className="mt-3 text-xs leading-relaxed text-[#8a8f9d]">
                  Acceso exclusivo para el equipo médico y administrativo de{" "}
                  <strong className="text-zinc-200">Clínica DentiPro</strong>. Al iniciar sesión, aceptas nuestros{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-zinc-300 underline underline-offset-4 hover:text-white"
                  >
                    Términos de Servicio
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-zinc-300 underline underline-offset-4 hover:text-white"
                  >
                    Política de Privacidad
                  </Link>.
                </p>

                {/* Form */}
                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@dentipro.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl border border-[#272935] bg-[#161720] px-3.5 text-xs text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-medium text-zinc-300">
                        Contraseña
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                        }}
                        className="text-[11px] font-medium text-[#8a8f9d] transition-colors hover:text-white"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 rounded-xl border border-[#272935] bg-[#161720] px-3.5 text-xs text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 h-11 w-full rounded-xl bg-white text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                        Iniciando sesión...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Ingresar a DentiPro
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Bottom Security / Trust Footer */}
          <div className="mt-8 pt-6 border-t border-[#1e2027]/80">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase text-emerald-400/90">
              <Lock className="h-3 w-3" />
              <span>HIPAA COMPLIANT · SOC 2 TYPE II · DATOS MÉDICOS CIFRADOS 256-BIT</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Showcase de Soluciones Enterprise DentiPro */}
        <div className="relative hidden lg:flex flex-col justify-between border-l border-[#23252e] bg-[#0f1017]/90 p-10 xl:p-12 overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-600/10 blur-3xl" />

          {/* Header Switcher: Soluciones Enterprise */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-blue-400">
                <Sparkles className="h-3 w-3" /> Soluciones Enterprise DentiPro
              </span>
              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setActiveSolutionIdx(
                      (prev) => (prev - 1 + SOLUTIONS.length) % SOLUTIONS.length
                    )
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#23252e] bg-[#161720] text-[#8a8f9d] transition-all hover:bg-[#1e2029] hover:text-white"
                  title="Solución anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-1 text-[10px] font-mono font-semibold text-zinc-400">
                  {activeSolutionIdx + 1}/{SOLUTIONS.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setActiveSolutionIdx((prev) => (prev + 1) % SOLUTIONS.length)
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-[#23252e] bg-[#161720] text-[#8a8f9d] transition-all hover:bg-[#1e2029] hover:text-white"
                  title="Siguiente solución"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Switcher Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {SOLUTIONS.map((sol, idx) => (
                <button
                  key={sol.id}
                  type="button"
                  onClick={() => setActiveSolutionIdx(idx)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-wide whitespace-nowrap transition-all",
                    activeSolutionIdx === idx
                      ? "border border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-sm"
                      : "border border-[#23252e] bg-[#14151e] text-[#8a8f9d] hover:bg-white/[0.03] hover:text-zinc-300"
                  )}
                >
                  {sol.pillLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Center: Mock Clinical Card (Dynamic per solution) */}
          <div className="relative z-10 my-4 space-y-4">
            <div className="rounded-2xl border border-[#23252e] bg-[#14151e]/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300">
              <div className="flex items-center justify-between border-b border-[#23252e]/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeSolution.meetingTitle}
                  </h3>
                  <p className="text-[11px] text-[#8a8f9d]">
                    {activeSolution.meetingSubtitle}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sillón Activo
                </span>
              </div>

              <div className="my-3.5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-400">
                  <span>🎯 Prioridades Clínicas:</span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {activeSolution.priorities}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  • {activeSolution.bullet}
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="h-1.5 w-3/4 rounded-full bg-white/[0.06]" />
                  <div className="h-1.5 w-1/2 rounded-full bg-white/[0.04]" />
                </div>
              </div>

              {/* Clinical AI Prompt Bar */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#272935] bg-[#181924] p-2">
                <div className="flex items-center gap-1 pl-1 text-[#8a8f9d]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#23252e] text-[9px] font-bold text-blue-400">
                    IA
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value={activeSolution.promptText}
                  className="flex-1 bg-transparent text-xs text-zinc-400 outline-none cursor-default"
                />
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Testimonial & Metrics of Clínica DentiPro */}
          <div className="relative z-10 space-y-3.5 border-t border-[#1e2027]/80 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                🦷 CLÍNICA DENTIPRO · RED DENTAL
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px]">
                  {activeSolution.statBadge}
                </span>
                <span className="text-amber-400">★ 4.9</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-300 italic min-h-[36px]">
              "{activeSolution.quote}"
            </p>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-600 text-xs font-bold text-white shadow-sm ring-1 ring-white/10">
                {activeSolution.authorInitials}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {activeSolution.authorName}
                </p>
                <p className="text-[10px] text-[#8a8f9d]">
                  {activeSolution.authorRole}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
