"use client";

import { useState } from "react";
import { loginAction, resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

function LinkStationLogo() {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#272935] bg-[#161720] text-blue-500 shadow-md">
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
        <circle cx="12" cy="12" r="10" />
        <path d="m4.93 4.93 4.24 4.24" />
        <path d="m14.83 9.17 4.24-4.24" />
        <path d="m14.83 14.83 4.24 4.24" />
        <path d="m9.17 14.83-4.24 4.24" />
        <circle cx="12" cy="12" r="4" />
      </svg>
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
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-blue-600/[0.04] blur-[140px]" />

      {/* Main Split-Screen Container */}
      <div className="relative z-10 grid w-full max-w-[1020px] overflow-hidden rounded-[28px] border border-[#23252e] bg-[#0c0d12] shadow-2xl lg:grid-cols-2">
        {/* LEFT COLUMN: Authentication Form */}
        <div className="flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          <div>
            {/* Brand Logo */}
            <div className="mb-8">
              <LinkStationLogo />
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
                    Si <strong className="text-white">{email}</strong> está registrado, recibirás un enlace seguro para restablecer tu contraseña.
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
                    Ingresa tu correo para recibir el enlace de acceso seguro.
                  </p>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs font-medium text-zinc-300">
                        Correo Electrónico
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="nombre@empresa.com"
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
                  El Asistente de IA para tus Citas y Ventas
                </h1>
                <p className="mt-3 text-xs leading-relaxed text-[#8a8f9d]">
                  Al iniciar sesión, aceptas nuestros{" "}
                  <Link
                    href="/privacy-policy"
                    className="text-zinc-300 underline underline-offset-4 hover:text-white"
                  >
                    Términos de Servicio
                  </Link>{" "}
                  y reconoces nuestra{" "}
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
                        Iniciar Sesión
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
              <span>SOC 2 TYPE II · GDPR · HIPAA · 256-BIT ENCRYPTION</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Showcase & Social Proof */}
        <div className="relative hidden lg:flex flex-col justify-between border-l border-[#23252e] bg-[#0f1017]/80 p-12 overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl" />

          {/* Top / Center: Mock Product Card */}
          <div className="relative z-10 my-auto space-y-4">
            <div className="rounded-2xl border border-[#23252e] bg-[#14151e]/90 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-[#23252e]/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Sincronización Comercial</h3>
                  <p className="text-[11px] text-[#8a8f9d]">15 Ene, 11:30 AM · Asesor Asignado</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En directo
                </span>
              </div>

              <div className="my-4 space-y-2.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-400">
                  <span>🎯 Prioridades:</span>
                  <span className="font-mono text-[10px] text-zinc-400">00:00 - 10:12</span>
                </div>
                <p className="text-xs text-zinc-300">
                  • Cualificar presupuesto, canal preferido y fecha estimada de inicio.
                </p>
                <div className="space-y-1.5 pt-1">
                  <div className="h-2 w-3/4 rounded-full bg-white/[0.06]" />
                  <div className="h-2 w-1/2 rounded-full bg-white/[0.04]" />
                </div>
              </div>

              {/* Interactive prompt input bar */}
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#272935] bg-[#181924] p-2">
                <div className="flex items-center gap-1 pl-1 text-[#8a8f9d]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#23252e] text-[9px] font-bold text-white">
                    AI
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  value="Listar compromisos y sincronizar con CRM..."
                  className="flex-1 bg-transparent text-xs text-zinc-400 outline-none cursor-default"
                />
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Social Proof & Testimonial */}
          <div className="relative z-10 space-y-4 pt-8">
            <div className="flex items-center justify-between border-t border-[#1e2027]/80 pt-6">
              <span className="text-xs font-bold text-white tracking-widest uppercase">
                ▲ LINKSTATION ENTERPRISE
              </span>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                <span>★ 4.9 / 5</span>
                <span className="text-[10px] text-[#8a8f9d]">satisfacción</span>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-300 italic">
              "LinkStation mantiene la cualificación y agendamiento 100% activo en tiempo real sin que se pierda ninguna oportunidad comercial."
            </p>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                CM
              </div>
              <div>
                <p className="text-xs font-bold text-white">Carlos Mendoza</p>
                <p className="text-[10px] text-[#8a8f9d]">Director de Operaciones & Crecimiento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
