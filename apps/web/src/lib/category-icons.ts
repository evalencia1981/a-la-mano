import {
  AirVent, AlarmClock, ArrowUpDown, Baby, Bed, Bike, BrickWall, Briefcase, Brush, Bug,
  Building, Cake, Calculator, Camera, Car, ChefHat, Cog, Dog, Droplet, Dumbbell, Eye,
  Flame, Flower, Gavel, GraduationCap, Hammer, Hand, HeartPulse, Key, Lamp, Laptop,
  Music, Package, PaintRoller, Paintbrush, Palette, PartyPopper, PawPrint, Printer,
  Scissors, Shield, Shirt, Smartphone, Smile, Sofa, Sparkles, Sprout, Square,
  Stethoscope, Trees, Truck, Utensils, WashingMachine, Waves, Wind, Wrench, Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de íconos que puede tener una categoría.
 *
 * Fuente única: lo usa `ProviderAvatar` para dibujar y el editor de
 * categorías para ofrecerlos. Si un ícono no está en este mapa, la ficha
 * cae en el genérico — por eso el selector solo muestra estos.
 *
 * Están agrupados por rubro porque elegir de una grilla de sesenta íconos
 * sueltos es imposible: quien crea "Manicura" busca en Belleza, no recorre
 * todo el catálogo.
 */
export const ICONOS: Record<string, LucideIcon> = {
  // Reparaciones y hogar
  wrench: Wrench, zap: Zap, flame: Flame, key: Key, paintbrush: Paintbrush,
  'paint-roller': PaintRoller, hammer: Hammer, 'brick-wall': BrickWall,
  'washing-machine': WashingMachine, 'air-vent': AirVent, square: Square,
  lamp: Lamp, bed: Bed, sofa: Sofa,

  // Limpieza
  sparkles: Sparkles, droplet: Droplet, bug: Bug, shirt: Shirt, wind: Wind,

  // Exterior y jardín
  flower: Flower, trees: Trees, sprout: Sprout, waves: Waves,

  // Comunidad y edificio
  'arrow-up-down': ArrowUpDown, cog: Cog, shield: Shield, building: Building,
  briefcase: Briefcase,

  // Belleza y cuidado personal
  scissors: Scissors, hand: Hand, eye: Eye, palette: Palette, brush: Brush,
  smile: Smile, 'heart-pulse': HeartPulse, stethoscope: Stethoscope,
  dumbbell: Dumbbell,

  // Mascotas y niños
  dog: Dog, 'paw-print': PawPrint, baby: Baby,

  // Vehículos y transporte
  car: Car, bike: Bike, truck: Truck, package: Package,

  // Comida y eventos
  'chef-hat': ChefHat, utensils: Utensils, cake: Cake, 'party-popper': PartyPopper,
  camera: Camera, music: Music,

  // Oficina y profesionales
  printer: Printer, laptop: Laptop, smartphone: Smartphone, calculator: Calculator,
  gavel: Gavel, 'graduation-cap': GraduationCap,

  // Urgencias
  'alarm-clock': AlarmClock,
};

/** Los mismos íconos agrupados, para el selector del editor de categorías. */
export const ICONOS_POR_RUBRO: { rubro: string; iconos: string[] }[] = [
  {
    rubro: 'Reparaciones y hogar',
    iconos: ['wrench', 'zap', 'flame', 'key', 'paintbrush', 'paint-roller', 'hammer',
      'brick-wall', 'washing-machine', 'air-vent', 'square', 'lamp', 'bed', 'sofa'],
  },
  {
    rubro: 'Limpieza',
    iconos: ['sparkles', 'droplet', 'bug', 'shirt', 'wind'],
  },
  {
    rubro: 'Exterior y jardín',
    iconos: ['flower', 'trees', 'sprout', 'waves'],
  },
  {
    rubro: 'Comunidad y edificio',
    iconos: ['arrow-up-down', 'cog', 'shield', 'building', 'briefcase'],
  },
  {
    rubro: 'Belleza y salud',
    iconos: ['scissors', 'hand', 'eye', 'palette', 'brush', 'smile', 'heart-pulse',
      'stethoscope', 'dumbbell'],
  },
  {
    rubro: 'Mascotas y niños',
    iconos: ['dog', 'paw-print', 'baby'],
  },
  {
    rubro: 'Vehículos y transporte',
    iconos: ['car', 'bike', 'truck', 'package'],
  },
  {
    rubro: 'Comida y eventos',
    iconos: ['chef-hat', 'utensils', 'cake', 'party-popper', 'camera', 'music'],
  },
  {
    rubro: 'Oficina y profesionales',
    iconos: ['printer', 'laptop', 'smartphone', 'calculator', 'gavel', 'graduation-cap'],
  },
  {
    rubro: 'Urgencias',
    iconos: ['alarm-clock'],
  },
];

export const NOMBRES_DE_ICONOS = Object.keys(ICONOS);

export function iconoDe(nombre: string | null | undefined): LucideIcon {
  return (nombre && ICONOS[nombre]) || Briefcase;
}
