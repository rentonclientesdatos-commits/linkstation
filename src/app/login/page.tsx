"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import { loginAction, resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Building2,
  Stethoscope,
  Briefcase,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EnterpriseSolution {
  id: string;
  industry: string;
  pillLabel: string;
  statusBadge: string;
  statusColor: string;
  meetingTitle: string;
  meetingSubtitle: string;
  priorities: string;
  bullet: string;
  promptText: string;
  companyHeader: string;
  quote: string;
  authorName: string;
  authorRole: string;
  authorInitials: string;
  statBadge: string;
  rating: string;
}

const SOLUTIONS: EnterpriseSolution[] = [
  {
    id: "dentipro",
    industry: "Salud & Odontología",
    pillLabel: "🏥 Salud & Clínicas",
    statusBadge: "Sillón Activo",
    statusColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    meetingTitle: "Valoración & Diagnóstico Dental",
    meetingSubtitle: "Clínica DentiPro · Box 1 · Ortodoncia & Implantes",
    priorities: "00:00 - 08:30 · Asignación de Sillón 1",
    bullet: "Cualificar cobertura dental, molestia principal y confirmación interactiva por WhatsApp.",
    promptText: "Reasignar cita cancelada a paciente en lista de espera inmediata...",
    companyHeader: "🦷 CLÍNICA DENTIPRO · RED DENTAL",
    quote: "Redujimos el ausentismo en un 82% y los sillones dentales se mantienen con ocupación completa de lunes a sábado.",
    authorName: "Dr. Roberto Valenzuela",
    authorRole: "Director Clínico · Clínica DentiPro",
    authorInitials: "RV",
    statBadge: "+1,450 citas / mes",
    rating: "★ 4.9",
  },
  {
    id: "renton",
    industry: "Consultoría & Automatización",
    pillLabel: "🚀 Renton Connective",
    statusBadge: "Sesión Activa",
    statusColor: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    meetingTitle: "Consultoría en IA & Automatización",
    meetingSubtitle: "Renton Connective · Arquitectura de Agentes",
    priorities: "Auditoría Operativa · Reducción de Tiempos a Segundos",
    bullet: "Diagnóstico de volumen operativo, arquitectura omnicanal y agentes de voz para agendamiento.",
    promptText: "Generar propuesta técnica de implementación para Renton Connective...",
    companyHeader: "🚀 RENTON CONNECTIVE · AUTOMATIZACIÓN",
    quote: "LinkStation nos permitió automatizar la captación y atención corporativa reduciendo los tiempos de respuesta a segundos.",
    authorName: "Esteban Morales",
    authorRole: "Director de Innovación · Renton Connective",
    authorInitials: "RC",
    statBadge: "+3,200 leads automatizados",
    rating: "★ 4.9",
  },
  {
    id: "realestate",
    industry: "Inmobiliaria & Real Estate",
    pillLabel: "🏢 Inmobiliaria & Bienes Raíces",
    statusBadge: "Visita en Terreno",
    statusColor: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    meetingTitle: "Visita a Propiedad · Loft Las Condes",
    meetingSubtitle: "Habitat Desarrollos · Agente en Terreno",
    priorities: "Rango $180k - $240k USD · Pre-aprobación Bancaria",
    bullet: "Filtrar capacidad crediticia, verificar intención de compra y enviar pin de ubicación por Google Maps.",
    promptText: "Confirmar visita presencial para mañana a las 11:00h y enviar ficha técnica por WhatsApp...",
    companyHeader: "🏢 HABITAT REAL ESTATE · DESARROLLOS",
    quote: "Filtra a los curiosos de portales web y solo agenda visitas con compradores que ya tienen pre-aprobación hipotecaria.",
    authorName: "Matías Silva",
    authorRole: "Gerente Comercial · Habitat Real Estate",
    authorInitials: "MS",
    statBadge: "4.2x visitas calificadas",
    rating: "★ 4.8",
  },
  {
    id: "b2b",
    industry: "Servicios B2B & Consultoría",
    pillLabel: "💼 Servicios B2B & Tech",
    statusBadge: "Demo Agendada",
    statusColor: "text-purple-400 border-purple-500/20 bg-purple-500/10",
    meetingTitle: "Reunión de Diagnóstico Estratégico",
    meetingSubtitle: "Andes Advisory · Videollamada Google Meet",
    priorities: "Empresas 50+ colaboradores · Decisor C-Level",
    bullet: "Validar presupuesto anual, software en uso actual y fecha límite para la toma de decisión.",
    promptText: "Generar minuta ejecutiva de la llamada y crear oportunidad en el pipeline CRM...",
    companyHeader: "💼 ANDES ADVISORY · CONSULTORÍA B2B",
    quote: "Nuestros consultores entran a las llamadas con el 80% del trabajo de diagnóstico hecho por el agente de voz.",
    authorName: "Sofía Arancibia",
    authorRole: "VP of Client Operations · Andes Advisory",
    authorInitials: "SA",
    statBadge: "+120 demos / mes",
    rating: "★ 5.0",
  },
];

function LinkStationBrandLogo() {
  return (
    <div className="flex items-center py-1">
      <NextImage
        src="/logo-login.png"
        alt="LinkStation Enterprise"
        width={360}
        height={90}
        className="h-10 w-auto max-w-[220px] object-contain drop-shadow-md"
        priority
      />
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
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[520px] w-[880px] rounded-full bg-blue-600/[0.04] blur-[150px]" />

      {/* Main Split-Screen Container */}
      <div className="relative z-10 grid w-full max-w-[1060px] overflow-hidden rounded-[28px] border border-[#23252e] bg-[#0c0d12] shadow-2xl lg:grid-cols-2">
        {/* LEFT COLUMN: Authentication Form */}
        <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          <div>
            {/* Brand Logo: LinkStation Enterprise */}
            <div className="mb-8">
              <LinkStationBrandLogo />
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
                    Si <strong className="text-white">{email}</strong> está registrado en la plataforma, recibirás las instrucciones para restablecer tu contraseña.
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
                    Ingresa tu correo corporativo para recibir el enlace seguro de acceso.
                  </p>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs font-medium text-zinc-300">
                        Correo Corporativo
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="tu-nombre@empresa.com"
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
                  El Copiloto de IA para tus Citas y Ventas
                </h1>
                <p className="mt-2 text-xs leading-relaxed text-[#8a8f9d]">
                  Atención 24/7, cualificación omnicanal y agendamiento inteligente para clínicas, inmobiliarias y empresas B2B.
                </p>

                {/* Industry badges pill row */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 rounded-md border border-[#23252e] bg-[#14151e] px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                    <Stethoscope className="h-2.5 w-2.5 text-blue-400" /> Clínica DentiPro
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-[#23252e] bg-[#14151e] px-2 py-0.5 text-[9px] font-semibold text-blue-400">
                    <Zap className="h-2.5 w-2.5 text-blue-400" /> Renton Connective
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-[#23252e] bg-[#14151e] px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                    <Building2 className="h-2.5 w-2.5 text-blue-400" /> Inmobiliarias
                  </span>
                  <span className="flex items-center gap-1 rounded-md border border-[#23252e] bg-[#14151e] px-2 py-0.5 text-[9px] font-semibold text-zinc-300">
                    <Briefcase className="h-2.5 w-2.5 text-blue-400" /> Consultoría B2B
                  </span>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="mt-7 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-zinc-300">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nombre@empresa.com"
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
                        Ingresar a LinkStation
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-[11px] text-[#8a8f9d]">
                  Al continuar, aceptas nuestros{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-zinc-400 underline underline-offset-4 hover:text-white"
                  >
                    Términos
                  </Link>{" "}
                  y{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-zinc-400 underline underline-offset-4 hover:text-white"
                  >
                    Privacidad
                  </Link>.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Security / Trust Footer */}
          <div className="mt-6 pt-5 border-t border-[#1e2027]/80">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase text-emerald-400/90">
              <Lock className="h-3 w-3" />
              <span>SOC 2 TYPE II · HIPAA COMPLIANT · GDPR · 256-BIT ENCRYPTION</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Multi-Industry Enterprise Showcase */}
        <div className="relative hidden lg:flex flex-col justify-between border-l border-[#23252e] bg-[#0f1017]/90 p-10 xl:p-12 overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" />

          {/* Header: Solución Enterprise Activa */}
          <div className="relative z-10 space-y-2">
            <div className="flex items-center justify-between border-b border-[#23252e]/80 pb-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-blue-400">
                <Sparkles className="h-3 w-3" /> Solución Enterprise Activa
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300">
                {activeSolution.industry}
              </span>
            </div>

            {/* Subtle Minimal Dots (without scrollbar or 4/4 selector) */}
            <div className="flex items-center justify-end gap-1 pt-0.5">
              {SOLUTIONS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSolutionIdx(idx)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    activeSolutionIdx === idx
                      ? "w-5 bg-blue-500"
                      : "w-1.5 bg-zinc-700/60 hover:bg-zinc-500"
                  )}
                  title={`Caso ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Center: Live Action Mock Card (Dynamic per industry) */}
          <div className="relative z-10 my-4 space-y-4">
            <div className="rounded-2xl border border-[#23252e] bg-[#14151e]/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-300">
              <div className="flex items-center justify-between border-b border-[#23252e]/80 pb-3">
                <div className="min-w-0 pr-3">
                  <h3 className="truncate text-sm font-bold text-white">
                    {activeSolution.meetingTitle}
                  </h3>
                  <p className="truncate text-[11px] text-[#8a8f9d]">
                    {activeSolution.meetingSubtitle}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                    activeSolution.statusColor
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {activeSolution.statusBadge}
                </span>
              </div>

              <div className="my-3.5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-400">
                  <span>🎯 Prioridades de Cualificación:</span>
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

              {/* AI Prompt Action Bar */}
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

          {/* Bottom: Testimonial & Industry Metric */}
          <div className="relative z-10 space-y-3.5 border-t border-[#1e2027]/80 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest uppercase text-white truncate max-w-[260px]">
                {activeSolution.companyHeader}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 shrink-0">
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px]">
                  {activeSolution.statBadge}
                </span>
                <span className="text-amber-400">{activeSolution.rating}</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-300 italic min-h-[36px]">
              "{activeSolution.quote}"
            </p>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm ring-1 ring-white/10">
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
