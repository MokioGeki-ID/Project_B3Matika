import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import Avatar from '@/components/Avatar';

export default function Board() {
  const [users, setUsers] = useState(null);
  useEffect(() => { api('/leaderboard').then((d) => setUsers(d.users)); }, []);
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div className="board-page">
      <h1>Papan Skor</h1>
      <p className="muted mb">20 pemain dengan poin tertinggi.</p>
      <div className="card board-card">
        <div className="table-wrap board-table-wrap">
          <table className="board-table">
            <thead>
              <tr>
                <th className="board-th-rank">#</th>
                <th className="board-th-name">Nama</th>
                <th className="board-th-level">Level</th>
                <th className="board-th-points">Poin</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u, i) => (
                <tr key={u.id} className={i < 3 ? `board-row-top board-row-${i + 1}` : ''}>
                  <td className="board-td-rank">
                    {i < 3 ? (
                      <span className="board-medal" title={`Peringkat ${i + 1}`}>{medal[i]}</span>
                    ) : (
                      <span className="board-rank-num">{i + 1}</span>
                    )}
                  </td>
                  <td className="board-td-name">
                    <div className="board-user-wrap">
                      <Avatar user={u} size={32} />
                      <span className="board-user-name" title={u.name}>
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="board-td-level">
                    <span className="board-level-badge">Lv {u.level}</span>
                  </td>
                  <td className="board-td-points">
                    <b className="board-points-val">{u.points}</b>
                  </td>
                </tr>
              ))}
              {users && !users.length && (
                <tr>
                  <td colSpan="4" className="muted center" style={{ padding: '32px 16px' }}>
                    Belum ada pemain.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

