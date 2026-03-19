'use client';

import type { Standing } from '@/lib/types';

interface GroupTableProps {
  groupLabel: string;
  standings: Standing[];
}

export default function GroupTable({ groupLabel, standings }: GroupTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-600 text-white px-4 py-3">
        <h3 className="text-lg font-bold">Grupa {groupLabel}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Ekipa</th>
              <th className="px-3 py-2 text-center">OM</th>
              <th className="px-3 py-2 text-center">P</th>
              <th className="px-3 py-2 text-center">N</th>
              <th className="px-3 py-2 text-center">I</th>
              <th className="px-3 py-2 text-center">D:P</th>
              <th className="px-3 py-2 text-center">+/-</th>
              <th className="px-3 py-2 text-center font-bold">Bod</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.team.id}
                className={`border-t ${i < 2 ? 'bg-green-50' : ''} hover:bg-gray-50`}
              >
                <td className="px-3 py-2 font-medium">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{s.team.name}</td>
                <td className="px-3 py-2 text-center">{s.played}</td>
                <td className="px-3 py-2 text-center text-green-600">{s.wins}</td>
                <td className="px-3 py-2 text-center text-yellow-600">{s.draws}</td>
                <td className="px-3 py-2 text-center text-red-600">{s.losses}</td>
                <td className="px-3 py-2 text-center">{s.scored}:{s.conceded}</td>
                <td className="px-3 py-2 text-center">
                  <span className={s.diff > 0 ? 'text-green-600' : s.diff < 0 ? 'text-red-600' : ''}>
                    {s.diff > 0 ? '+' : ''}{s.diff}
                  </span>
                </td>
                <td className="px-3 py-2 text-center font-bold">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
        Zeleno = kvalifikacija za eliminacije
      </div>
    </div>
  );
}
