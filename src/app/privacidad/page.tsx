"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 md:p-12 flex justify-center">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
            <span className="text-xl font-extrabold tracking-tight text-[var(--heading)]">Lumina</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </header>

        {/* Content */}
        <main className="flex flex-col gap-6 text-sm leading-relaxed">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] mb-2">
            Privacidad & Metodología
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Lumina Core 0.3 · Actualizado agosto 2026
          </p>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-[var(--heading)]">1. Nuestra Filosofía de Privacidad</h2>
            <p>
              Lumina está diseñada bajo el principio de <strong>cero registros y mínima recopilación</strong>. No necesitas crear una cuenta, proporcionar tu correo ni identificarte para leer las cinco noticias de cada día.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-[var(--heading)]">2. Datos y Métricas de Uso</h2>
            <p>
              No recolectamos nombres, correos ni datos personales. Con el único fin de saber si la experiencia resulta útil (si se completan las cinco noticias y si el lector regresa en días posteriores), generamos un identificador anónimo de dispositivo guardado localmente en tu navegador.
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <strong>Almacenamiento Local (Local Storage):</strong> Guardamos únicamente tu preferencia de tema (claro/oscuro), la preferencia de avisos y la confirmación de que la edición de hoy ya ha sido completada para no repetir contenido.
              </li>
              <li>
                <strong>Métricas anónimas:</strong> Registramos eventos de lectura agregados mediante un endpoint seguro con limitación de peticiones. Nunca se asocian a tu identidad personal ni se venden a terceros.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-[var(--heading)]">3. Cookies</h2>
            <p>
              Lumina <strong>no utiliza cookies de rastreo publicitario ni cookies de terceros</strong>. Por este motivo no mostramos banners invasivos de consentimiento, garantizando una carga inmediata y limpia.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-[var(--heading)]">4. Metodología de Fuentes y Enlaces</h2>
            <p>
              Cada noticia en Lumina incluye de forma visible la atribución a su fuente original y un enlace directo (<em>Leer original ↗</em>). Priorizamos fuentes de primer nivel (papers científicos, organismos oficiales, agencias internacionales de noticias e instituciones acreditadas).
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-6 border-t border-[var(--border)] text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Lumina. Cinco noticias positivas al día.</p>
        </footer>

      </div>
    </div>
  );
}
