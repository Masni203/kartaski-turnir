'use client';

const items = [
  { suit: '♠', color: 'text-white/[0.02]', size: 'text-7xl', top: '8%', left: '5%', delay: '0s' },
  { suit: '♥', color: 'text-red-500/[0.04]', size: 'text-8xl', top: '25%', right: '8%', delay: '1.5s' },
  { suit: '♦', color: 'text-red-500/[0.035]', size: 'text-6xl', top: '60%', left: '12%', delay: '0.8s' },
  { suit: '♣', color: 'text-white/[0.02]', size: 'text-9xl', top: '75%', right: '15%', delay: '2.5s' },
  { suit: '♥', color: 'text-red-500/[0.03]', size: 'text-7xl', top: '45%', left: '80%', delay: '3s' },
  { suit: '♠', color: 'text-white/[0.025]', size: 'text-8xl', top: '90%', left: '45%', delay: '1s' },
];

export default function CardSuits() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-felt-texture" aria-hidden="true">
      {/* Top emerald ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 55%)',
        }}
      />
      {/* Bottom gold ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(212,168,83,0.04) 0%, transparent 45%)',
        }}
      />
      {/* Floating suit symbols */}
      {items.map((item, i) => (
        <span
          key={i}
          className={`absolute ${item.color} ${item.size} animate-float select-none`}
          style={{
            top: item.top,
            left: 'left' in item ? item.left : undefined,
            right: 'right' in item ? item.right : undefined,
            animationDelay: item.delay,
            animationDuration: `${8 + (i % 3)}s`,
          }}
        >
          {item.suit}
        </span>
      ))}
    </div>
  );
}
