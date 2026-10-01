import type { Metadata } from "next";
import Link from "next/link";
import NextImage from "next/image";
import {
  ArrowLeft,
  Shield,
  Eye,
  Lock,
  Database,
  UserCheck,
  Globe,
  Mail,
  RefreshCw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Politica de Privacidad | LinkStation",
  description:
    "Conoce como LinkStation recopila, usa y protege tu informacion personal. Tu privacidad es nuestra prioridad.",
};

const sections = [
  {
    id: "recopilacion",
    icon: Database,
    title: "1. Informacion que Recopilamos",
    content: [
      {
        subtitle: "Datos de cuenta",
        text: "Al registrarte, recopilamos tu nombre, correo electronico, nombre de la empresa y contrasena (almacenada cifrada). Esta informacion es necesaria para crear y gestionar tu cuenta.",
      },
      {
        subtitle: "Datos de uso",
        text: "Recopilamos informacion sobre como utilizas la plataforma: modulos visitados, acciones realizadas, preferencias de configuracion y registros de actividad.",
      },
      {
        subtitle: "Datos de llamadas e integraciones",
        text: "Para operar los agentes de IA, procesamos metadatos de llamadas (duracion, estado, resultados), configuraciones de integraciones y datos de agendamiento.",
      },
      {
        subtitle: "Datos tecnicos",
        text: "Recopilamos automaticamente informacion tecnica como direccion IP, tipo de navegador, sistema operativo y tiempos de acceso para garantizar la seguridad y rendimiento.",
      },
    ],
  },
  {
    id: "uso",
    icon: Eye,
    title: "2. Como Usamos tu Informacion",
    content: [
      {
        subtitle: "Prestacion del servicio",
        text: "Usamos tus datos para operar, mantener y mejorar la plataforma LinkStation, incluyendo el procesamiento de llamadas de IA, el agendamiento automatizado y la generacion de metricas de contactabilidad.",
      },
      {
        subtitle: "Comunicaciones",
        text: "Te enviamos correos transaccionales (confirmaciones, alertas de seguridad, resumenes de actividad) y, con tu consentimiento, comunicaciones sobre nuevas funciones.",
      },
      {
        subtitle: "Seguridad y cumplimiento",
        text: "Analizamos patrones de uso para detectar actividades fraudulentas y accesos no autorizados. Tambien cumplimos con obligaciones legales aplicables.",
      },
      {
        subtitle: "Mejora del producto",
        text: "Datos anonimizados y agregados son utilizados para mejorar nuestros modelos de IA, optimizar el rendimiento y desarrollar nuevas funcionalidades.",
      },
    ],
  },
  {
    id: "compartir",
    icon: Globe,
    title: "3. Compartir tu Informacion",
    content: [
      {
        subtitle: "Proveedores de servicio",
        text: "Compartimos datos con proveedores de confianza: infraestructura en la nube (Supabase, Vercel), proveedores de IA (OpenAI, ElevenLabs) y herramientas de analisis. Todos bajo acuerdos de confidencialidad.",
      },
      {
        subtitle: "Integraciones de terceros",
        text: "Cuando conectas integraciones externas (CRMs, calendarios, etc.), compartimos los datos necesarios segun tu configuracion explicita.",
      },
      {
        subtitle: "Requisitos legales",
        text: "Podemos divulgar informacion si asi lo exige la ley, una orden judicial u otra autoridad gubernamental competente.",
      },
      {
        subtitle: "No vendemos tus datos",
        text: "LinkStation nunca vende, arrienda ni comercializa tu informacion personal a terceros con fines publicitarios o de marketing.",
      },
    ],
  },
  {
    id: "seguridad",
    icon: Lock,
    title: "4. Seguridad de los Datos",
    content: [
      {
        subtitle: "Medidas tecnicas",
        text: "Implementamos cifrado TLS/SSL para todas las transmisiones de datos, cifrado en reposo para informacion sensible, autenticacion multifactor y controles de acceso basados en roles.",
      },
      {
        subtitle: "Infraestructura segura",
        text: "Nuestra infraestructura esta alojada en proveedores certificados con ISO 27001 y SOC 2. Realizamos auditorias de seguridad periodicas y pruebas de penetracion.",
      },
      {
        subtitle: "Respuesta a incidentes",
        text: "En caso de una brecha de seguridad que afecte tus datos, te notificaremos dentro de las 72 horas conforme a la normativa aplicable.",
      },
    ],
  },
  {
    id: "derechos",
    icon: UserCheck,
    title: "5. Tus Derechos",
    content: [
      {
        subtitle: "Acceso y rectificacion",
        text: "Tienes derecho a acceder a los datos personales que tenemos sobre ti y a solicitar la correccion de informacion inexacta o incompleta.",
      },
      {
        subtitle: "Eliminacion",
        text: "Puedes solicitar la eliminacion de tu cuenta y datos personales. Conservaremos unicamente la informacion que estemos legalmente obligados a mantener.",
      },
      {
        subtitle: "Portabilidad",
        text: "Tienes derecho a recibir tus datos en un formato estructurado y legible por maquina para transferirlos a otro servicio.",
      },
      {
        subtitle: "Oposicion y restriccion",
        text: "Puedes oponerte al procesamiento de tus datos para fines de marketing. Para ejercer estos derechos, contactanos en privacidad@linkstation.ai",
      },
    ],
  },
  {
    id: "cookies",
    icon: RefreshCw,
    title: "6. Cookies y Tecnologias Similares",
    content: [
      {
        subtitle: "Cookies esenciales",
        text: "Utilizamos cookies estrictamente necesarias para el funcionamiento: gestion de sesion, autenticacion y preferencias de seguridad. Estas no pueden desactivarse.",
      },
      {
        subtitle: "Cookies analiticas",
        text: "Con tu consentimiento, utilizamos cookies analiticas para entender como se usa la plataforma y mejorar la experiencia. Puedes desactivarlas desde la configuracion de tu navegador.",
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  const lastUpdated = "21 de septiembre de 2026";

  return (
    <div className="min-h-screen bg-[#120b2e]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#120b2e]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <NextImage
            src="/logo-login.png"
            alt="LinkStation"
            width={140}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Volver
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-6 pt-16 pb-24">
        {/* Hero */}
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <Shield className="h-10 w-10 text-amber-400" />
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-white md:text-5xl">
            {"Politica de "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Privacidad
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-medium text-slate-400">
            Tu privacidad es fundamental para nosotros. Este documento explica como recopilamos,
            usamos y protegemos tu informacion personal en LinkStation.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Ultima actualizacion: {lastUpdated}
          </div>
        </div>

        {/* Table of Contents */}
        <nav
          aria-label="Tabla de contenidos"
          className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
        >
          <p className="mb-4 text-xs font-bold tracking-widest text-slate-500 uppercase">
            Contenido
          </p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="group flex items-center gap-3 rounded-xl p-3 text-sm font-semibold text-slate-400 transition-all hover:bg-amber-400/10 hover:text-amber-400"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {section.title}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-white/20"
              >
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                    <Icon className="h-6 w-6 text-amber-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white">{section.title}</h2>
                </div>
                <div className="space-y-6">
                  {section.content.map((item, idx) => (
                    <div key={idx} className="border-l-2 border-amber-400/30 pl-6">
                      <h3 className="mb-2 text-base font-bold text-amber-400">{item.subtitle}</h3>
                      <p className="leading-relaxed text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Contact Section */}
          <section
            id="contacto"
            className="scroll-mt-24 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-orange-400/5 p-8"
          >
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                <Mail className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="text-2xl font-black text-white">7. Contacto</h2>
            </div>
            <p className="mb-6 leading-relaxed text-slate-400">
              Si tienes preguntas, inquietudes o deseas ejercer tus derechos sobre tus datos
              personales, puedes contactarnos a traves de los siguientes medios:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="mailto:privacidad@linkstation.ai"
                id="contact-privacy-email"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400"
              >
                <Mail className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Email de privacidad
                  </p>
                  <p className="font-bold">privacidad@linkstation.ai</p>
                </div>
              </a>
              <a
                href="mailto:soporte@linkstation.ai"
                id="contact-support-email"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300 transition-all hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-400"
              >
                <Mail className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Soporte general
                  </p>
                  <p className="font-bold">soporte@linkstation.ai</p>
                </div>
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-white/10 pt-10 text-center">
          <p className="mb-4 text-sm text-slate-500">
            Al utilizar LinkStation, aceptas los terminos descritos en esta Politica de Privacidad.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/login"
              id="footer-back-to-login"
              className="text-sm font-bold text-amber-400 transition-colors hover:text-amber-300"
            >
              {"<- Volver al inicio"}
            </Link>
            <span className="text-slate-600">|</span>
            <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">
              LinkStation {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
