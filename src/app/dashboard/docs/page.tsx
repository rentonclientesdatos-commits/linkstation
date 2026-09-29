"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Book,
  ChevronRight,
  Home,
  Terminal,
  Layers,
  ShieldCheck,
  Zap,
  BookOpen,
  Search,
  Cpu,
  MessageSquare,
  Database,
  Activity,
  Scale,
  UserCheck,
  Layout,
  ArrowUpRight,
  Info,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const MermaidDiagram = dynamic(() => import("@/components/docs/MermaidDiagram"), { ssr: false });

// Fases y Tomos — Lenguaje de negocio para el cliente
const DOC_STRUCTURE = [
  {
    phase: "🚀 INICIO: Guía del Propietario",
    color: "from-indigo-600 to-violet-600",
    items: [{ id: "0", title: "¿Qué hace el sistema?", icon: <BookOpen className="h-4 w-4" /> }],
  },
  {
    phase: "FASE I: El Sistema y sus Partes",
    color: "from-blue-600 to-indigo-600",
    items: [
      { id: "1", title: "Cómo funciona todo junto", icon: <Layout className="h-4 w-4" /> },
      { id: "2", title: "Dónde viven tus datos", icon: <Database className="h-4 w-4" /> },
      { id: "3", title: "Por qué nunca se cae", icon: <ShieldCheck className="h-4 w-4" /> },
      { id: "4", title: "Tu panel de control", icon: <Cpu className="h-4 w-4" /> },
      { id: "5", title: "Todos los módulos del sistema", icon: <Terminal className="h-4 w-4" /> },
    ],
  },
  {
    phase: "FASE II: Seguridad y Resultados",
    color: "from-emerald-500 to-teal-600",
    items: [
      { id: "6", title: "Tus datos son 100% tuyos", icon: <ShieldCheck className="h-4 w-4" /> },
      { id: "7", title: "Cómo el sistema convierte leads", icon: <Zap className="h-4 w-4" /> },
      { id: "8", title: "Qué hacer si algo falla", icon: <Activity className="h-4 w-4" /> },
      { id: "10", title: "Cómo activar un nuevo cliente", icon: <Layers className="h-4 w-4" /> },
    ],
  },
  {
    phase: "FASE III: La Inteligencia Artificial",
    color: "from-purple-500 to-pink-600",
    items: [
      { id: "11", title: "Cómo califica a tus leads", icon: <Brain className="h-4 w-4" /> },
      {
        id: "12",
        title: "Cómo se conecta con otros sistemas",
        icon: <Database className="h-4 w-4" />,
      },
      { id: "13", title: "Plan ante cualquier emergencia", icon: <Activity className="h-4 w-4" /> },
      { id: "14", title: "El motor que nunca descansa", icon: <Cpu className="h-4 w-4" /> },
      {
        id: "15",
        title: "Cómo se controla el agente IA",
        icon: <MessageSquare className="h-4 w-4" />,
      },
    ],
  },
  {
    phase: "FASE IV: Detalles y Referencia",
    color: "from-orange-500 to-amber-600",
    items: [
      { id: "16", title: "Privacidad y cumplimiento legal", icon: <Scale className="h-4 w-4" /> },
      { id: "17", title: "Por qué suena tan humano", icon: <Zap className="h-4 w-4" /> },
      { id: "18", title: "Variables que usa el sistema", icon: <BookOpen className="h-4 w-4" /> },
      {
        id: "19",
        title: "Cómo funciona el agente por dentro",
        icon: <UserCheck className="h-4 w-4" />,
      },
      { id: "20", title: "Guía de todos los módulos", icon: <Layout className="h-4 w-4" /> },
      { id: "21", title: "Glosario de términos", icon: <Info className="h-4 w-4" /> },
      { id: "22", title: "Cómo usar el panel de control", icon: <Layout className="h-4 w-4" /> },
      { id: "23", title: "Qué pasa con tus datos", icon: <Database className="h-4 w-4" /> },
      { id: "24", title: "Cuánto cuesta operar", icon: <Activity className="h-4 w-4" /> },
      { id: "25", title: "Cuándo entra un humano", icon: <UserCheck className="h-4 w-4" /> },
      { id: "26", title: "El mapa completo del sistema", icon: <Layers className="h-4 w-4" /> },
    ],
  },
];

export default function DocsPage() {
  const [content, setContent] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("0");
  const [isLoading, setIsLoading] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch("/api/docs/content");
        const data = await response.json();
        setContent(data.content);
      } catch (error) {
        console.error("Error loading docs:", error);
        setContent("# Error\nNo se pudo cargar la documentación maestra.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  // Filtrar contenido por la sección activa (buscando el heading ## SECCIÓN X.)
  const displayedContent = useMemo(() => {
    if (!content) return "";

    // 1. Intentar por separadores ---
    const sections = content.split(/\n---\n/);
    const sectionPattern = new RegExp(`## (SECCIÓN )?${activeSection}\\.`, "i");

    let targetSection = sections.find((s) => sectionPattern.test(s));

    // 2. Si no se encuentra por separadores, buscar en todo el texto (Fallback)
    if (!targetSection) {
      const allLines = content.split("\n");
      const startIndex = allLines.findIndex((line) => sectionPattern.test(line));

      if (startIndex !== -1) {
        // Buscamos hasta el siguiente encabezado o el final
        const nextSectionIndex = allLines.findIndex(
          (line, idx) => idx > startIndex && line.startsWith("## SECCIÓN")
        );
        targetSection = allLines
          .slice(startIndex, nextSectionIndex !== -1 ? nextSectionIndex : undefined)
          .join("\n");
      }
    }

    // Si estamos en la sección "1" y no hay match (ej. el intro), mostramos el bloque 0 (Intro)
    return targetSection || sections[0];
  }, [content, activeSection]);

  // Encontrar el título actual para el breadcrumb
  const currentItem = useMemo(() => {
    for (const phase of DOC_STRUCTURE) {
      const item = phase.items.find((i) => i.id === activeSection);
      if (item) return { phase: phase.phase, title: item.title };
    }
    return { phase: "Documentación", title: "Introducción" };
  }, [activeSection]);

  const scrollToTop = () => {
    const container = document.getElementById("docs-content-area");
    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f8fafc] dark:bg-slate-900">
      <style jsx global>{`
        .edgeLabel {
          background-color: #f1f5f9 !important;
          stroke: none !important;
          color: #1e293b !important;
          font-weight: 800 !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
        }
        .edgeLabel rect {
          fill: #f1f5f9 !important;
          stroke: #cbd5e1 !important;
        }
        .label foreignObject div {
          color: #ffffff !important;
          font-weight: 900 !important;
        }
        .node rect,
        .node circle,
        .node ellipse,
        .node polygon,
        .node path {
          stroke-width: 2px !important;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          main,
          main * {
            visibility: visible;
          }
          main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          aside,
          nav,
          .sticky {
            display: none !important;
          }
          .prose {
            max-width: none !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Nav Superior Glassmorphism */}
      <div className="sticky top-0 z-[60] border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="bg-grad-primary shadow-primary/40 group relative flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-2xl shadow-2xl">
              <motion.div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-500 group-hover:translate-y-0" />
              <Book className="relative z-10 h-6 w-6 text-white" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-[10px] font-black tracking-[0.3em] text-indigo-500 uppercase dark:text-indigo-400">
                  Knowledge Base v5.0
                </h1>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Enterprise Edition
                </span>
              </div>
              <p className="flex items-center gap-3 text-xl font-black text-slate-900 dark:text-white">
                {currentItem.title}
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-500 shadow-sm shadow-emerald-500/10">
                  Certificado
                </span>
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-6 md:flex">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black tracking-tighter text-slate-400 uppercase">
                Status
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs font-bold">Sincronizado</span>
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-200 dark:border-slate-800" />
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-bold transition-all hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <Home className="h-4 w-4 text-slate-500" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full min-w-0 grid-cols-1 gap-8 px-6 py-10 lg:grid-cols-[280px_1fr]">
        {/* SIDEBAR DE FASES Y TOMOS (MÁS ORDENADO) */}
        <aside className="custom-scrollbar sticky top-32 h-fit max-h-[calc(100vh-160px)] space-y-8 overflow-y-auto pr-2 pb-10">
          <div className="relative mb-8">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en el Dossier..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm font-medium shadow-sm ring-indigo-500/20 transition-all focus:ring-2 dark:border-slate-800 dark:bg-slate-900"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {DOC_STRUCTURE.map((phase) => (
            <div
              key={phase.phase}
              className="space-y-4 rounded-[2rem] border border-slate-200/60 bg-white/40 p-5 dark:border-slate-800/60 dark:bg-slate-900/40"
            >
              <div className="flex items-center gap-3 px-1">
                <div
                  className={`h-5 w-1.5 rounded-full bg-gradient-to-b ${phase.color} shadow-lg`}
                />
                <h3 className="text-[10px] leading-tight font-black tracking-[0.2em] text-slate-400 uppercase">
                  {phase.phase}
                </h3>
              </div>
              <nav className="space-y-1">
                {phase.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      scrollToTop();
                    }}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-left text-[13px] font-bold transition-all ${
                      activeSection === item.id
                        ? "bg-grad-primary border-none text-white shadow-xl shadow-indigo-500/25"
                        : "text-slate-500 hover:bg-indigo-500/5 hover:text-indigo-600"
                    }`}
                  >
                    <span
                      className={`${activeSection === item.id ? "text-white" : "text-slate-400 group-hover:text-indigo-500"} relative z-10 transition-colors`}
                    >
                      {item.icon}
                    </span>
                    <span className="relative z-10 flex-1 truncate">{item.title}</span>
                    <span
                      className={`relative z-10 text-[9px] font-black uppercase opacity-40 ${activeSection === item.id ? "text-white" : ""}`}
                    >
                      Tomo {item.id}
                    </span>
                    {activeSection === item.id && (
                      <motion.div
                        layoutId="active-bg"
                        className="bg-grad-primary absolute inset-0"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </div>
          ))}

          <div className="bg-grad-primary group relative overflow-hidden rounded-[2rem] p-6 text-white">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110">
              <ShieldCheck className="h-20 w-20" />
            </div>
            <h4 className="mb-2 text-xs font-black tracking-widest text-white/70 uppercase opacity-80">
              Certificación Técnica
            </h4>
            <p className="relative z-10 text-sm leading-relaxed font-bold">
              Este dossier representa la propiedad intelectual íntegra del sistema v5.0.
            </p>
            <button
              onClick={() => window.print()}
              className="mt-4 flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-[10px] font-black uppercase transition-all hover:bg-white/30"
            >
              Descargar PDF <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <style
            dangerouslySetInnerHTML={{
              __html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            main, main * {
                                visibility: visible;
                            }
                            main {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            aside, nav, .sticky {
                                display: none !important;
                            }
                            .prose {
                                max-width: none !important;
                                color: black !important;
                            }
                        }
                    `,
            }}
          />
        </aside>

        {/* VISOR DE CONTENIDO MAESTRO */}
        <main className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="relative min-h-[800px] overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/50 md:p-16 dark:border-slate-800 dark:bg-slate-950 dark:shadow-none"
            >
              {/* Decoración de Fondo Premium */}
              <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-[100px]" />
              <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-500/5 blur-[100px]" />

              {/* Cabecera de Sección Centralizada */}
              <div className="relative z-10 mb-20 flex flex-col items-center space-y-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="h-[1px] w-12 bg-indigo-500/30" />
                  <span className="text-[10px] font-black tracking-[0.4em] text-indigo-500 uppercase">
                    {currentItem.phase}
                  </span>
                  <span className="h-[1px] w-12 bg-indigo-500/30" />
                </div>
                <h2 className="mx-auto max-w-3xl text-4xl leading-[1.1] font-black tracking-tight text-slate-900 md:text-6xl dark:text-white">
                  {currentItem.title}
                </h2>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 dark:border-slate-900 dark:bg-slate-800"
                      >
                        <UserCheck className="h-3 w-3 text-slate-500" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                    Revisado por Ingeniería
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
                  <p className="text-sm font-bold text-slate-400">Sincronizando Dossier...</p>
                </div>
              ) : (
                <article className="mx-auto max-w-4xl text-slate-700 dark:text-slate-300">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({ children }) => (
                        <h2 className="relative mt-16 mb-6 flex items-center justify-center gap-3 border-b-2 border-slate-100 pb-4 text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:border-slate-800 dark:text-white">
                          <span className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500" />
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="mt-10 mb-4 flex items-center justify-center gap-2 text-xl font-black text-indigo-600 dark:text-indigo-400">
                          <span className="font-mono text-sm text-indigo-300 dark:text-indigo-600">
                            ▸
                          </span>
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="mt-8 mb-3 text-base font-black tracking-wider text-slate-700 uppercase dark:text-slate-300">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="mb-6 text-center text-base leading-[1.9] text-slate-600 md:text-lg dark:text-slate-400">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-8 list-none space-y-4 text-center">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-8 list-none space-y-4 text-center">{children}</ol>
                      ),
                      li: ({ children, ...props }) =>
                        React.createElement(
                          "li",
                          {
                            className:
                              "text-base md:text-lg text-slate-600 dark:text-slate-400 leading-[1.8] flex flex-col items-center",
                            ...props,
                          },
                          children
                        ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-10 border-t-2 border-b-2 border-indigo-500/20 bg-indigo-500/5 px-6 py-8 text-center italic dark:bg-indigo-500/10">
                          <div className="text-base leading-[1.8] font-medium text-indigo-700 md:text-lg dark:text-indigo-300">
                            {children}
                          </div>
                        </blockquote>
                      ),
                      hr: () => (
                        <div className="my-12 flex items-center gap-4">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
                        </div>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-black text-slate-900 dark:text-white">
                          {children}
                        </strong>
                      ),
                      table: ({ children }) => (
                        <div className="my-10 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-800">
                          <table className="w-full border-collapse">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-slate-50 dark:bg-slate-900/60">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-4 text-left text-xs font-black tracking-widest text-slate-400 uppercase dark:text-slate-500">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
                          {children}
                        </td>
                      ),
                      code({
                        className,
                        children,
                        ...props
                      }: React.ComponentPropsWithoutRef<"code">) {
                        const match = /language-(\w+)/.exec(className || "");
                        const content = String(children).replace(/\n$/, "");
                        if (!match) {
                          return (
                            <code
                              className="rounded-md bg-indigo-500/5 px-1.5 py-0.5 font-mono text-[0.9em] text-indigo-500 dark:text-indigo-400"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        }

                        // RENDERIZADO DE MERMAID (Visual Premium)
                        if (match && match[1] === "mermaid") {
                          return <MermaidDiagram chart={content} />;
                        }

                        return (
                          <div className="group/code relative my-10 overflow-hidden rounded-[2rem] border border-slate-200 shadow-xl dark:border-slate-800">
                            <div className="flex items-center justify-between bg-slate-900 px-6 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                  <div className="h-2.5 w-2.5 rounded-full border border-red-500/50 bg-red-500/20" />
                                  <div className="h-2.5 w-2.5 rounded-full border border-amber-500/50 bg-amber-500/20" />
                                  <div className="h-2.5 w-2.5 rounded-full border border-emerald-500/50 bg-emerald-500/20" />
                                </div>
                                <span className="ml-4 text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                  {match[1]}
                                </span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(content)}
                                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1 text-[9px] font-black text-white/50 uppercase transition-all hover:bg-white/10 hover:text-white"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                Copiar
                              </button>
                            </div>
                            <pre className="custom-scrollbar overflow-x-auto bg-slate-950 p-8 font-mono text-sm leading-relaxed text-indigo-300">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      },
                    }}
                  >
                    {displayedContent}
                  </ReactMarkdown>
                </article>
              )}

              {/* Footer de Sección */}
              <div className="mt-24 flex flex-col items-center justify-between gap-6 border-t border-slate-100 pt-10 md:flex-row dark:border-slate-900">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-900">
                    <Info className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="max-w-xs text-xs leading-relaxed font-medium text-slate-400">
                    Este documento es propiedad intelectual del cliente. Prohibida su reproducción
                    sin autorización técnica.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black tracking-widest text-white uppercase shadow-xl shadow-slate-900/20 transition-all hover:scale-105 dark:bg-white dark:text-slate-900 dark:shadow-none"
                >
                  Exportar a PDF Profesional
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Footer de Navegación de Página */}
          <div className="mt-12 flex items-center justify-between px-4">
            <button
              className="group flex flex-col items-start gap-1"
              onClick={() => {
                const prevId = (parseInt(activeSection) - 1).toString();
                if (parseInt(prevId) > 0) setActiveSection(prevId);
                scrollToTop();
              }}
            >
              <span className="text-[10px] font-black text-slate-400 uppercase transition-colors group-hover:text-indigo-500">
                Anterior
              </span>
              <span className="flex items-center gap-1 text-sm font-bold">
                <ChevronRight className="h-4 w-4 rotate-180" /> Tomo {parseInt(activeSection) - 1}
              </span>
            </button>

            <button
              className="group flex flex-col items-end gap-1 text-right"
              onClick={() => {
                const nextId = (parseInt(activeSection) + 1).toString();
                if (parseInt(nextId) <= 26) setActiveSection(nextId);
                scrollToTop();
              }}
            >
              <span className="text-[10px] font-black text-slate-400 uppercase transition-colors group-hover:text-indigo-500">
                Siguiente
              </span>
              <span className="flex items-center gap-1 text-sm font-bold">
                Tomo {parseInt(activeSection) + 1} <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
