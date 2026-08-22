import { normalizarLugar, type LugarOpcion } from './location-types';

/**
 * Entiende lo que el administrador dictó y lo convierte en algo accionable.
 *
 * El caso real, textual: *"grietas torre 3 piso 1 contactar proveedor de
 * construcción"*. De ahí hay que sacar tres cosas — qué pasó, dónde, y a
 * quién hay que llamar — sin hacerle tocar tres campos.
 *
 * **No adivina de más, y eso es deliberado.** Cuando no está seguro, ofrece
 * candidatos y pregunta; el administrador mismo describió ese paso ("puede
 * ser que me pregunte qué proveedor quieres contactar"). Un match dudoso
 * aplicado en silencio manda una cotización al proveedor equivocado, que es
 * mucho peor que un toque más.
 *
 * Dos mitades con criterios distintos:
 *
 *  - **El lugar se resuelve contra el mapa**, por coincidencia exacta de la
 *    clave normalizada. No hay margen de invención: si "torre3piso1" no está
 *    cargado, no existe y punto.
 *  - **La categoría se resuelve por palabras**, que es difuso por
 *    naturaleza: "construcción", "grieta" y "muro" apuntan todas a
 *    albañilería sin que ninguna sea el nombre de la categoría.
 */

/**
 * Cómo la gente nombra cada oficio cuando habla, que casi nunca es como se
 * llama la categoría. Nadie dice "necesito albañilería": dice "hay una
 * grieta" o "un proveedor de construcción".
 *
 * Las palabras van normalizadas (sin tildes, minúsculas) porque así es como
 * se comparan. Si una categoría no está acá, sigue siendo elegible a mano —
 * esto solo sirve para adivinar la primera opción.
 */
const SINONIMOS: Record<string, string[]> = {
  albanileria: [
    'construccion', 'obra', 'grieta', 'grietas', 'fisura', 'fisuras', 'muro',
    'muros', 'pared', 'paredes', 'cemento', 'mamposteria', 'enchape', 'baldosa',
    'baldosas', 'placa', 'resane', 'humedad', 'albanil', 'maestro',
  ],
  plomeria: [
    'plomeria', 'plomero', 'fuga', 'fugas', 'agua', 'tuberia', 'tuberias',
    'desague', 'sifon', 'inodoro', 'sanitario', 'lavamanos', 'goteo', 'gotera',
    'llave', 'grifo',
  ],
  'plomeria-24h': ['plomeria', 'plomero', 'fuga', 'urgencia', 'emergencia', 'inundacion'],
  electricidad: [
    'electricidad', 'electricista', 'luz', 'luces', 'corto', 'breaker',
    'tablero', 'cableado', 'bombillo', 'bombillos', 'lampara', 'toma',
    'enchufe', 'contador',
  ],
  'electricidad-24h': ['electricidad', 'electricista', 'apagon', 'urgencia', 'emergencia'],
  ascensores: ['ascensor', 'ascensores', 'elevador', 'atrapado', 'atrapada'],
  motobombas: ['motobomba', 'motobombas', 'bomba', 'presion', 'hidroneumatico', 'eyector'],
  piscinas: ['piscina', 'piscinas', 'alberca', 'cloro', 'filtro'],
  'tanques-agua': ['tanque', 'tanques', 'cisterna', 'lavado de tanques', 'potable'],
  jardineria: ['jardin', 'jardineria', 'jardinero', 'cesped', 'prado', 'setos', 'maleza'],
  'poda-arboles': ['poda', 'podar', 'arbol', 'arboles', 'rama', 'ramas'],
  cerrajeria: ['cerrajeria', 'cerrajero', 'cerradura', 'llave', 'candado', 'puerta', 'chapa'],
  pintura: ['pintura', 'pintar', 'pintor', 'fachada', 'esmalte', 'vinilo', 'demarcacion'],
  fumigacion: [
    'fumigacion', 'fumigar', 'plaga', 'plagas', 'cucaracha', 'cucarachas',
    'raton', 'ratones', 'roedor', 'roedores', 'zancudo', 'termita', 'comejen',
  ],
  vidrieria: ['vidrio', 'vidrios', 'vidrieria', 'ventana', 'ventanas', 'espejo', 'roto'],
  carpinteria: ['carpinteria', 'carpintero', 'madera', 'mueble', 'muebles', 'closet', 'puerta'],
  'aire-acondicionado': ['aire', 'acondicionado', 'clima', 'ventilacion', 'extractor'],
  'gas-calentadores': ['gas', 'calentador', 'calentadores', 'ducha', 'estufa'],
  'lavado-fachadas': ['fachada', 'fachadas', 'lavado', 'hidrolavado'],
  'limpieza-hogar': ['aseo', 'limpieza', 'limpiar', 'servicio general'],
  'limpieza-tapetes': ['tapete', 'tapetes', 'alfombra', 'alfombras'],
  vigilancia: ['vigilancia', 'seguridad', 'camara', 'camaras', 'cctv', 'porteria'],
  mudanzas: ['mudanza', 'trasteo', 'trasteos'],
  electrodomesticos: ['nevera', 'lavadora', 'secadora', 'horno', 'electrodomestico'],
  'admin-ph': ['administracion', 'contador', 'revisor', 'asamblea'],
};

/**
 * Palabras con las que se pide contactar a alguien de afuera. Su presencia
 * es lo que distingue "hay una grieta" (anotar y ya) de "hay una grieta,
 * llamá al de construcción" (anotar y despachar).
 */
const PALABRAS_PROVEEDOR = [
  'proveedor', 'proveedores', 'contactar', 'contacta', 'llamar', 'llama',
  'cotizar', 'cotizacion', 'cotice', 'coticeme', 'contratar', 'presupuesto',
];

export interface CategoriaDisponible {
  slug: string;
  name: string;
}

export interface Interpretacion {
  /** El lugar del mapa que se mencionó, si se mencionó uno cargado. */
  lugar: LugarOpcion | null;
  /** Se dijo "contactar", "cotizar" o similar: la intención es inequívoca. */
  pidioExplicito: boolean;
  /** Hay a quién ofrecerle el trabajo, sea por verbo o por nombrar el oficio. */
  quiereProveedor: boolean;
  /**
   * Categorías candidatas, de más a menos coincidencias. Vacío significa
   * "no sé": ahí se ofrecen todos los proveedores y decide la persona.
   */
  categorias: string[];
}

/**
 * Busca el lugar dentro del texto dictado.
 *
 * Funciona porque `normalizarLugar` borra espacios y signos: la frase entera
 * queda como una tira de caracteres donde la clave del lugar aparece como
 * subcadena. "grietas torre 3 piso 1 contactar…" se vuelve
 * `grietastorre3piso1contactar…`, y ahí `torre3piso1` está adentro.
 *
 * Gana **el que se nombró primero**, y a igual posición el más largo.
 *
 * El orden importa más que el largo, y lo enseñó un caso real: *"Torre 2
 * cambiar lámpara del corredor hacia el parqueadero"*. Ahí se mencionan dos
 * lugares cargados, pero la lámpara está en la Torre 2 — el parqueadero es
 * una referencia de hacia dónde da el corredor. Al hablar se dice primero
 * dónde estás y después se describe, así que el primero es el bueno.
 *
 * El desempate por largo sigue haciendo falta para "torre 3 piso 1": ahí
 * "torre3" y "torre3piso1" arrancan en la misma posición, y queremos el
 * piso, que es más preciso.
 */
function buscarLugarEnFrase(frase: string, lugares: LugarOpcion[]): LugarOpcion | null {
  const clave = normalizarLugar(frase);
  if (!clave) return null;

  let mejor: LugarOpcion | null = null;
  let posicionMejor = Number.POSITIVE_INFINITY;
  let largoMejor = 0;

  for (const lugar of lugares) {
    /* Se prueban las dos formas: el nombre suelto ("Piso 1") y la ruta
     * completa ("Torre 3 · Piso 1"), porque al hablar se dicen las dos. */
    for (const candidato of [lugar.rutaCompleta, lugar.name]) {
      const clavecita = normalizarLugar(candidato);
      if (!clavecita) continue;
      const posicion = clave.indexOf(clavecita);
      if (posicion === -1) continue;

      const gana =
        posicion < posicionMejor ||
        (posicion === posicionMejor && clavecita.length > largoMejor);
      if (gana) {
        mejor = lugar;
        posicionMejor = posicion;
        largoMejor = clavecita.length;
      }
    }
  }

  return mejor;
}

export function interpretarPendiente(
  texto: string,
  lugares: LugarOpcion[],
  categorias: CategoriaDisponible[],
): Interpretacion {
  const clave = normalizarLugar(texto);
  const tokens = new Set(
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );

  const pidioExplicito = PALABRAS_PROVEEDOR.some((p) => tokens.has(p));

  /* Se puntúa cada categoría por cuántas de sus palabras aparecen. El nombre
   * propio de la categoría cuenta doble: si alguien dijo "plomería" tal cual,
   * eso pesa más que haber dicho "agua". */
  const puntajes = new Map<string, number>();
  for (const categoria of categorias) {
    let puntaje = 0;

    if (clave.includes(normalizarLugar(categoria.name))) puntaje += 2;

    for (const sinonimo of SINONIMOS[categoria.slug] ?? []) {
      if (sinonimo.includes(' ')) {
        if (clave.includes(normalizarLugar(sinonimo))) puntaje += 1;
      } else if (tokens.has(sinonimo)) {
        puntaje += 1;
      }
    }

    if (puntaje > 0) puntajes.set(categoria.slug, puntaje);
  }

  const ordenadas = [...puntajes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);

  return {
    lugar: buscarLugarEnFrase(texto, lugares),
    pidioExplicito,
    /* Nombrar el oficio ya es pedirlo. Nadie dice "cambiar la lámpara,
     * contactar un proveedor de electricidad": dice "cambiar la lámpara,
     * electricidad" y espera que la app entienda. Exigir el verbo dejaba
     * afuera la forma en que la gente habla de verdad. */
    quiereProveedor: pidioExplicito || ordenadas.length > 0,
    categorias: ordenadas,
  };
}
