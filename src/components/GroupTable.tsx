'use client';

import type { Standing } from '@/lib/types';

interface GroupTableProps {
  groupLabel: string;
  standings: Standing[];
}

export default function GroupTable({ groupLabel, standings }: GroupTableProps) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600/80 to-cyan-600/80 px-5 py-3">
        <h3 className="text-lg font-bold text-white">Grupa {groupLabel}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-3 text-left text-blue-300/60 font-medium">#</th>
              <th className="px-3 py-3 text-left text-blue-300/60 font-medium">Ekipa</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">OM</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">P</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">N</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">I</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">D:P</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-medium">+/-</th>
              <th className="px-3 py-3 text-center text-blue-300/60 font-bold">Bod</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team.id}
                className={`border-t border-white/5 transition-colors hover:bg-white/5 ${
                  i < 2 ? 'bg-green-500/5' : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                    i === 1 ? 'bg-blue-500/20 text-blue-300' :
                    'bg-white/5 text-white/40'
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium text-white">{s.team.name}</td>
                <td className="px-3 py-2.5 text-center text-white/60">{s.played}</td>
                <td className="px-3 py-2.5 text-center text-green-400">{s.wins}</td>
                <td className="px-3 py-2.5 text-center text-yellow-400">{s.draws}</td>
                <td className="px-3 py-2.5 text-center text-red-400">{s.losses}</td>
                <td className="px-3 py-2.5 text-center text-white/60">{s.scored}:{s.conceded}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={s.diff > 0 ? 'text-green-400' : s.diff < 0 ? 'text-red-400' : 'text-white/40'}>
                    {s.diff > 0 ? '+' : ''}{s.diff}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">{s.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2 text-xs text-green-400/50 border-t border-white/5">
        Zeleno = kvalifikacija za eliminacije
      </div>
    </div>
  );
}
