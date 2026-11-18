"use client";

import { useState } from "react";
import { loginAction, resetPasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function LinkStationLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const textSize = size === "sm" ? "text-xl" : "text-2xl";
  const iconSize = size === "sm" ? 28 : 34;
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#272935] bg-[#181920] text-blue-500 shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 4.24 4.24" />
          <path d="m14.83 9.17 4.24-4.24" />
          <path d="m14.83 14.83 4.24 4.24" />
          <path d="m9.17 14.83-4.24 4.24" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </div>
      <div>
        <p className={`${textSize} font-bold tracking-tight text-white leading-none`}>LinkStation</p>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#8a8f9d] uppercase mt-1">Enterprise Platform</p>
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
      <div className="relative flex min-h-screen items-center justify-center bg-[#090a0d] p-4 antialiased">
        <div className="w-full max-w-[420px] rounded-2xl border border-[#23252e] bg-[#121317] p-8 shadow-2xl">
          <div className="mb-8 flex items-center justify-start">
            <LinkStationLogo size="sm" />
          </div>

          {resetSuccess ? (
            <div className="text-center">
              <div className="mb-5 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              </div>
              <h1 className="mb-2 text-xl font-bold tracking-tight text-white">
                Correo enviado
              </h1>
              <p className="mb-6 text-sm font-normal text-[#8a8f9d]">
                Si el correo <strong className="text-white">{email}</strong> está registrado, recibirás un enlace seguro para restablecer tu acceso.
              </p>
              <Button
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetSuccess(false);
                }}
                className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-200"
              >
                Volver a Iniciar Sesión
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                  }}
                  className="group mb-4 flex items-center gap-2 text-xs font-semibold text-[#8a8f9d] transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Volver al login
                </button>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Recuperar contraseña
                </h1>
                <p className="mt-1.5 text-xs text-[#8a8f9d]">
                  Ingresa tu correo para recibir las instrucciones de recuperación.
                </p>
              </div>

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
                    className="h-11 rounded-xl border border-[#272935] bg-[#181920] px-3.5 text-sm text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
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
                  className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.99]"
                >
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-xs text-[#52525b]">
            © {new Date().getFullYear()} LinkStation Platform. Todos los derechos reservados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#090a0d] p-4 antialiased">
      <div className="w-full max-w-[420px] rounded-2xl border border-[#23252e] bg-[#121317] p-8 shadow-2xl">
        <div className="mb-8 flex items-center justify-center">
          <LinkStationLogo size="md" />
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-white">Iniciar Sesión</h1>
          <p className="mt-1.5 text-xs text-[#8a8f9d]">
            Ingresa tus credenciales para acceder a la plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              className="h-11 rounded-xl border border-[#272935] bg-[#181920] px-3.5 text-sm text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
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
                className="text-xs font-medium text-[#8a8f9d] transition-colors hover:text-white"
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
              className="h-11 rounded-xl border border-[#272935] bg-[#181920] px-3.5 text-sm text-white placeholder:text-[#52525b] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
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
            className="h-11 w-full rounded-xl bg-white text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
              "Continuar"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#52525b]">
          Al continuar, aceptas nuestros{" "}
          <Link
            href="/privacy-policy"
            className="text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Términos y Privacidad
          </Link>
        </p>

        <p className="mt-6 text-center text-[11px] text-[#52525b]">
          © {new Date().getFullYear()} LinkStation Platform
        </p>
      </div>
    </div>
  );
}
