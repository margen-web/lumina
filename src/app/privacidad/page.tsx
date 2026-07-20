"use client";

import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-6 md:p-12 flex justify-center">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-DEFAULT animate-pulse" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Lumina.</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold hover:text-primary-dark dark:hover:text-primary-light transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al feed
          </Link>
        </header>

        {/* Content */}
        <main className="flex flex-col gap-6 text-sm leading-relaxed">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Aviso Legal y Política de Privacidad
          </h1>

          <p className="text-slate-500 dark:text-slate-400">
            Última actualización: 27 de junio de 2026
          </p>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Información General (Aviso Legal)</h2>
            <p>
              El propietario de esta aplicación web y PWA (&quot;Lumina&quot;) es de carácter particular y no comercial directos. 
              Para cualquier consulta o incidencia legal, puedes ponerte en contacto a través de la dirección de correo electrónico del creador o en el panel de soporte general.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Privacidad y Tratamiento de Datos</h2>
            <p>
              En Lumina respetamos tu privacidad al máximo. La aplicación está diseñada bajo el principio de 
              <strong> minimización de datos</strong> y no requiere registro, perfiles de usuario obligatorios, ni introduce identificadores intrusivos.
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-2">
              <li>
                <strong>Datos de Navegación:</strong> No recolectamos nombres, correos, ni direcciones físicas. Las visitas son analizadas de forma completamente anónima e individual (sin utilizar cookies) mediante <em>Vercel Analytics</em> con el único fin de medir el rendimiento de la aplicación y el volumen de visitas.
              </li>
              <li>
                <strong>Almacenamiento Local (Local Storage):</strong> Guardamos ciertos estados temporales de forma privada y local en la memoria de tu propio navegador o móvil (preferencia de sonido, racha de días activos y las noticias a las que has reaccionado). Esta información nunca se sube a nuestros servidores ni se comparte con terceros.
              </li>
              <li>
                <strong>Reacciones Globales:</strong> Cuando reaccionas a una noticia con el icono de Lumina, enviamos de forma anónima una petición a la base de datos (Supabase) para incrementar el contador general de esa tarjeta. En ningún momento vinculamos esa acción a tu persona ni a tu dirección IP en base de datos.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Cookies</h2>
            <p>
              Lumina <strong>no utiliza cookies de rastreo ni publicitarias</strong>. Al no usar cookies sujetas al consentimiento de la Directiva ePrivacy/RGPD, no mostramos el clásico banner de cookies, garantizando una interfaz completamente limpia y veloz.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Propiedad Intelectual y Fuentes</h2>
            <p>
              Lumina actúa únicamente como escaparate recopilatorio de noticias y optimismo. Los resúmenes de las noticias se redactan de manera libre y siempre incluyen un botón directo (&quot;Leer original&quot;) para enlazar a la fuente de información original del medio de comunicación correspondiente.
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-600">
          <p>© {new Date().getFullYear()} Lumina. Diseñado con optimismo y calma.</p>
        </footer>

      </div>
    </div>
  );
}
