'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * Dictado por voz sobre un campo de texto.
 *
 * Existe porque la métrica del módulo de pendientes es cuántos segundos
 * cuesta meter uno, y quien lo usa está caminando la unidad con una mano
 * ocupada. El teclado de Android ya trae micrófono, pero está escondido
 * detrás de abrir el teclado y encontrar la tecla: un botón propio, grande
 * y al lado del campo, es un toque en vez de tres.
 *
 * Dos límites que hay que conocer antes de esperar que funcione:
 *
 *  - **Solo en contexto seguro.** El navegador expone el reconocimiento de
 *    voz únicamente bajo HTTPS o `localhost`. Servido desde una IP de red
 *    (`http://192.168.x.x`) la API no existe, y por eso el botón se esconde
 *    solo en vez de fallar al tocarlo.
 *  - **No está en todos los navegadores.** Chrome y Edge sí; Firefox no.
 *    Detectamos capacidad y no renderizamos nada donde no se puede.
 *
 * El texto dictado se agrega a lo que ya había escrito, nunca lo reemplaza:
 * corregir a mano y después dictar el resto es un flujo normal, y perder lo
 * tecleado sería imperdonable.
 */

interface AlternativaReconocimiento {
  transcript: string;
}

interface ResultadoReconocimiento {
  isFinal: boolean;
  0: AlternativaReconocimiento;
}

interface ListaResultados {
  length: number;
  [indice: number]: ResultadoReconocimiento;
}

interface EventoReconocimiento extends Event {
  resultIndex: number;
  results: ListaResultados;
}

interface EventoErrorReconocimiento extends Event {
  error: string;
}

interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((evento: EventoReconocimiento) => void) | null;
  onerror: ((evento: EventoErrorReconocimiento) => void) | null;
  onend: (() => void) | null;
}

type ConstructorReconocedor = new () => Reconocedor;

/** El estándar es `SpeechRecognition`; Chrome todavía lo sirve prefijado. */
function obtenerConstructor(): ConstructorReconocedor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructorReconocedor;
    webkitSpeechRecognition?: ConstructorReconocedor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MENSAJES_ERROR: Record<string, string> = {
  'not-allowed': 'Falta darle permiso al micrófono en el navegador.',
  'service-not-allowed': 'Falta darle permiso al micrófono en el navegador.',
  'no-speech': 'No se escuchó nada. Probá de nuevo.',
  'audio-capture': 'No se encontró micrófono.',
  network: 'El reconocimiento de voz necesita conexión.',
};

interface Props {
  /** Lo que hay escrito ahora. Se usa como base para no pisarlo. */
  valor: string;
  /** Recibe el texto completo ya combinado, listo para guardar en estado. */
  onCambio: (texto: string) => void;
  /** Para el lector de pantalla y el tooltip. */
  etiqueta?: string;
  onError?: (mensaje: string) => void;
  deshabilitado?: boolean;
}

export function BotonMicrofono({
  valor,
  onCambio,
  etiqueta = 'Dictar',
  onError,
  deshabilitado = false,
}: Props) {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocedorRef = useRef<Reconocedor | null>(null);
  /* Lo que había escrito al arrancar a dictar. El resultado parcial se
     recalcula sobre esta base en cada evento, así el texto se ve formarse
     sin duplicarse. */
  const baseRef = useRef('');
  /* El valor vive en una ref además del estado porque los handlers del
     reconocedor se registran una vez y capturarían un valor viejo. */
  const valorRef = useRef(valor);
  valorRef.current = valor;

  /* La detección va en un efecto y no en el render: en el servidor no hay
     `window`, y evaluarlo durante el render daría una hidratación distinta
     a lo que después pinta el cliente. */
  useEffect(() => {
    setSoportado(obtenerConstructor() !== null);
    return () => reconocedorRef.current?.abort();
  }, []);

  if (!soportado) return null;

  function detener() {
    reconocedorRef.current?.stop();
    setEscuchando(false);
  }

  function arrancar() {
    const Constructor = obtenerConstructor();
    if (!Constructor) return;

    const reconocedor = new Constructor();
    reconocedor.lang = 'es-CO';
    /* Sin `continuous`: corta solo cuando la persona deja de hablar, que es
       lo que corresponde a un pendiente corto dictado al pasar. */
    reconocedor.continuous = false;
    reconocedor.interimResults = true;

    baseRef.current = valorRef.current;

    reconocedor.onresult = (evento) => {
      let texto = '';
      for (let i = 0; i < evento.results.length; i += 1) {
        const resultado = evento.results[i];
        if (resultado) texto += resultado[0].transcript;
      }
      const base = baseRef.current.trim();
      onCambio(base ? `${base} ${texto.trim()}` : texto.trim());
    };

    reconocedor.onerror = (evento) => {
      setEscuchando(false);
      /* `aborted` es lo que pasa al cancelar a propósito: no es un error
         que valga la pena mostrarle a nadie. */
      if (evento.error === 'aborted') return;
      onError?.(MENSAJES_ERROR[evento.error] ?? 'No se pudo usar el micrófono.');
    };

    reconocedor.onend = () => setEscuchando(false);

    reconocedorRef.current = reconocedor;
    setEscuchando(true);
    reconocedor.start();
  }

  return (
    <button
      type="button"
      data-tactil
      disabled={deshabilitado}
      aria-label={escuchando ? 'Dejar de dictar' : etiqueta}
      aria-pressed={escuchando}
      title={escuchando ? 'Dejar de dictar' : etiqueta}
      onClick={() => (escuchando ? detener() : arrancar())}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] disabled:opacity-40 ${
        escuchando
          ? 'animate-pulse border-transparent text-white'
          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
      }`}
      style={escuchando ? { backgroundColor: 'var(--color-urgencia)' } : undefined}
    >
      {escuchando ? (
        <MicOff className="h-5 w-5" aria-hidden />
      ) : (
        <Mic className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
