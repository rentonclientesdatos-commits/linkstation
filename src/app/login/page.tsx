"use client";

import { useState } from "react";
import { loginAction, resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function LinkStationLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const textSize = size === "sm" ? "text-2xl" : "text-3xl";
  const subSize = size === "sm" ? "text-[10px]" : "text-[11px]";
  const iconSize = size === "sm" ? 28 : 36;
  return (
    <div className="flex items-center gap-3">
      <svg width={iconSize} height={iconSize} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="16" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
        <circle cx="18" cy="9"  r="2.5" fill="#60a5fa" />
        <circle cx="27" cy="23" r="2.5" fill="#60a5fa" />
        <circle cx="9"  cy="23" r="2.5" fill="#60a5fa" />
        <circle cx="18" cy="18" r="2" fill="white" />
        <line x1="18" y1="9" x2="18" y2="18" stroke="#60a5fa" strokeWidth="1.2" />
        <line x1="27" y1="23" x2="18" y2="18" stroke="#60a5fa" strokeWidth="1.2" />
        <line x1="9" y1="23" x2="18" y2="18" stroke="#60a5fa" strokeWidth="1.2" />
        <line x1="18" y1="9" x2="27" y2="23" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
        <line x1="18" y1="9" x2="9" y2="23" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
        <line x1="9" y1="23" x2="27" y2="23" stroke="#3b82f6" strokeWidth="0.8" opacity="0.4" />
      </svg>
      <div>
        <p className={`${textSize} font-black tracking-tight text-white leading-none`}>LinkStation</p>
        <p className={`${subSize} font-bold tracking-[0.2em] text-blue-400 uppercase mt-0.5`}>AI Platform</p>
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

  if (isForgotPassword) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black">
        <div className="w-full max-w-[440px] px-6 py-12">
          <div className="mb-10 flex items-center justify-start">
            <LinkStationLogo size="sm" />
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
              </div>
              <h1 className="mb-3 text-2xl font-black tracking-tight text-white">
                ¡Correo enviado!
              </h1>
              <p className="mb-8 font-medium text-slate-500">
                Si el correo <b>{email}</b> existe en nuestro sistema, recibirás instrucciones para
                restablecer tu contraseña en unos minutos.
              </p>
              <Button
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSuccess(false);
                }}
                className="h-12 w-full rounded-xl bg-[#0ea5e9] text-base font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:bg-[#0284c7]"
              >
                Volver al inicio
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                  }}
                  className="group mb-4 flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  Volver atrás
                </button>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Recuperar contraseña
                </h1>
                <p className="mt-2 text-base font-medium text-slate-500">
                  Control total sobre tus agentes de IA de llamadas, agendamiento automatizado y
                  métricas de contactabilidad en un solo lugar.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-bold text-slate-300">
                    Email Registrado
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="nombre@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-700 bg-slate-800/50 text-white transition-all placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#0ea5e9] text-base font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:bg-[#0284c7] active:scale-[0.98]"
                >
                  {loading ? "Enviando..." : "Enviar link de recuperación"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            Al continuar, aceptas nuestra{" "}
            <Link
              href="/privacy-policy"
              className="font-bold text-[#0ea5e9] transition-colors hover:text-[#0284c7] hover:underline"
            >
              Política de Privacidad
            </Link>
          </p>

          <p className="mt-8 text-center text-xs font-medium text-slate-500">
            © {new Date().getFullYear()} Derechos reservados · LinkStation by{" "}
            <span className="font-bold text-slate-400">Renton Connective</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-[440px] px-6 py-12">
        <div className="mb-8 flex items-center justify-center">
          <LinkStationLogo size="md" />
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">Bienvenido de nuevo</h1>
          <p className="mt-2 text-base font-medium text-slate-400">
            Ingresa tus credenciales para acceder a tu cuenta
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-bold text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 rounded-xl border-slate-700 bg-slate-800/50 text-white transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-bold text-slate-300">
                Contraseña
              </Label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                }}
                className="text-sm font-bold text-amber-400 transition-colors hover:text-amber-300"
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
              required={!isForgotPassword}
              className="h-12 rounded-xl border-slate-700 bg-slate-800/50 text-white transition-all placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-amber-400 text-base font-black text-slate-900 shadow-lg shadow-amber-200/50 transition-all hover:bg-amber-500 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Al iniciar sesión, aceptas nuestra{" "}
          <Link
            href="/privacy-policy"
            className="font-bold text-amber-400 transition-colors hover:text-amber-300 hover:underline"
          >
            Política de Privacidad
          </Link>
        </p>

        <p className="mt-8 text-center text-xs font-medium text-slate-500">
          © {new Date().getFullYear()} Derechos reservados · LinkStation by{" "}
          <span className="font-bold text-slate-400">Renton Connective</span>
        </p>
      </div>
    </div>
  );
}
