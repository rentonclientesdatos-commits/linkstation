"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY } from "@/lib/auth-config";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import NextImage from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="w-full max-w-[440px] px-6 py-12">
        <div className="mb-10 flex items-center justify-start">
          <NextImage
            src="/logo.png"
            alt="LinkStation"
            width={240}
            height={64}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>

        {success ? (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-black tracking-tight text-[#0f172a]">
              ¡Contraseña actualizada!
            </h1>
            <p className="mb-8 font-medium text-slate-500">
              Tu contraseña ha sido cambiada con éxito. Serás redirigido al login en unos segundos.
            </p>
            <Button
              onClick={() => router.push("/login")}
              className="h-12 w-full rounded-xl bg-[#0ea5e9] text-base font-black text-white shadow-lg shadow-blue-200/50 transition-all hover:bg-[#0284c7]"
            >
              Ir al Login ahora
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
                Nueva contraseña
              </h1>
              <p className="mt-2 text-base font-medium text-slate-500">
                Por favor ingresá tu nueva contraseña de acceso.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  title="password"
                  className="text-sm font-bold text-slate-700"
                >
                  Contraseña Nueva
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  title="confirmPassword"
                  className="text-sm font-bold text-slate-700"
                >
                  Confirmar Contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl border-slate-200 bg-white text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100"
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
                {loading ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-12 text-center text-xs font-bold tracking-widest text-slate-400 uppercase">
          LinkStation {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
