'use client';

// Floating card suit decorations
export default function CardSuits() {
  const suits = ['♠', '♥', '♦', '♣'];
  const colors = ['text-white/[0.03]', 'text-red-500/[0.06]', 'text-red-500/[0.05]', 'text-white/[0.03]'];

  // Pre-defined positions to avoid layout shift
  const items = [
    { suit: 0, size: 'text-8xl', top: '5%', left: '5%', rotate: '-12deg', delay: '0s' },
    { suit: 1, size: 'text-9xl', top: '10%', right: '8%', rotate: '15deg', delay: '1s' },
    { suit: 2, size: 'text-7xl', top: '25%', left: '12%', rotate: '25deg', delay: '2s' },
    { suit: 3, size: 'text-8xl', top: '35%', right: '5%', rotate: '-20deg', delay: '0.5s' },
    { suit: 0, size: 'text-6xl', top: '50%', left: '3%', rotate: '10deg', delay: '1.5s' },
    { suit: 1, size: 'text-7xl', top: '55%', right: '15%', rotate: '-8deg', delay: '3s' },
    { suit: 2, size: 'text-9xl', top: '70%', left: '10%', rotate: '-15deg', delay: '2.5s' },
    { suit: 3, size: 'text-6xl', top: '75%', right: '3%', rotate: '22deg', delay: '0.8s' },
    { suit: 1, size: 'text-8xl', top: '85%', left: '20%', rotate: '5deg', delay: '1.8s' },
    { suit: 0, size: 'text-7xl', top: '90%', right: '12%', rotate: '-25deg', delay: '3.5s' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {items.map((item, i) => (
        <span
          key={i}
          className={`absolute ${item.size} ${colors[item.suit]} select-none animate-float`}
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            transform: `rotate(${item.rotate})`,
            animationDelay: item.delay,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        >
          {suits[item.suit]}
        </span>
      ))}
    </div>
  );
}
