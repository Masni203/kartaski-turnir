// Color scheme per group label
// Each group gets a distinct color for easy visual tracking

export interface GroupColor {
  gradient: string;      // header gradient
  border: string;        // card border
  borderHighlight: string; // active/hover border
  bg: string;            // subtle background tint
  text: string;          // label text color
  badge: string;         // badge/chip style
  dot: string;           // dot color for indicators
}

const groupColors: Record<string, GroupColor> = {
  A: {
    gradient: 'from-red-600/80 to-rose-500/80',
    border: 'border-red-500/25',
    borderHighlight: 'border-red-400/50',
    bg: 'bg-red-500/5',
    text: 'text-red-300',
    badge: 'bg-red-500/15 text-red-300 border-red-500/25',
    dot: 'bg-red-400',
  },
  B: {
    gradient: 'from-blue-600/80 to-sky-500/80',
    border: 'border-blue-500/25',
    borderHighlight: 'border-blue-400/50',
    bg: 'bg-blue-500/5',
    text: 'text-blue-300',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    dot: 'bg-blue-400',
  },
  C: {
    gradient: 'from-amber-600/80 to-yellow-500/80',
    border: 'border-amber-500/25',
    borderHighlight: 'border-amber-400/50',
    bg: 'bg-amber-500/5',
    text: 'text-amber-300',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    dot: 'bg-amber-400',
  },
  D: {
    gradient: 'from-emerald-600/80 to-green-500/80',
    border: 'border-emerald-500/25',
    borderHighlight: 'border-emerald-400/50',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  E: {
    gradient: 'from-purple-600/80 to-violet-500/80',
    border: 'border-purple-500/25',
    borderHighlight: 'border-purple-400/50',
    bg: 'bg-purple-500/5',
    text: 'text-purple-300',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    dot: 'bg-purple-400',
  },
  F: {
    gradient: 'from-cyan-600/80 to-teal-500/80',
    border: 'border-cyan-500/25',
    borderHighlight: 'border-cyan-400/50',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
    dot: 'bg-cyan-400',
  },
  G: {
    gradient: 'from-orange-600/80 to-amber-500/80',
    border: 'border-orange-500/25',
    borderHighlight: 'border-orange-400/50',
    bg: 'bg-orange-500/5',
    text: 'text-orange-300',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    dot: 'bg-orange-400',
  },
  H: {
    gradient: 'from-pink-600/80 to-fuchsia-500/80',
    border: 'border-pink-500/25',
    borderHighlight: 'border-pink-400/50',
    bg: 'bg-pink-500/5',
    text: 'text-pink-300',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    dot: 'bg-pink-400',
  },
};

const defaultColor: GroupColor = {
  gradient: 'from-slate-600/80 to-gray-500/80',
  border: 'border-white/10',
  borderHighlight: 'border-white/20',
  bg: 'bg-white/5',
  text: 'text-white/60',
  badge: 'bg-white/10 text-white/60 border-white/10',
  dot: 'bg-white/40',
};

export function getGroupColor(groupLabel: string): GroupColor {
  return groupColors[groupLabel] || defaultColor;
}
