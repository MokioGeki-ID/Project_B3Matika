import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import NotFound from '@/components/NotFound';

export default function PuzzleDetail() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [map, setMap] = useState({});
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);

  useEffect(() => {
    api(`/puzzles/detail?puzzle=${id}`)
      .then((d) => {
        if (d && d.puzzle) {
          setP(d.puzzle);
        } else {
          setErr(true);
        }
      })
      .catch(() => setErr(true));
  }, [id]);

  async function submit(e) {
    e.preventDefault();
    if (!user) return nav('/masuk');
    try {
      const d = await api(`/puzzles/detail?puzzle=${id}`, { method: 'POST', body: p.type === 'cryptarithm' ? { answer: map } : { answer } });
      if (!d.correct) return setFb({ ok: false, text: 'Belum tepat, coba lagi!' });
      if (d.user) setUser(d.user);
      setFb({ ok: true, text: d.awarded ? `Benar! +${d.awarded} poin 🎉` : 'Benar! (sudah pernah diselesaikan, tanpa poin tambahan)' });
    } catch (e) {
      if (e.status === 401) return nav('/masuk');
      setFb({ ok: false, text: e.message || 'Terjadi kesalahan.' });
    }
  }

  if (err) return <NotFound />;
  if (!p) return <p className="muted">Memuat…</p>;
  return (
    <>
      <Link to="/puzzle" className="back" onClick={(e) => { e.preventDefault(); nav(-1); }}>← Semua puzzle</Link>
      <h1>{p.title}</h1>
      <div className="card tutorial-box mb">
        <h3 style={{ margin: '0 0 6px 0', color: 'var(--blue-d)', fontSize: '1.1rem' }}>ℹ️ Cara Mengerjakan</h3>
        <p style={{ margin: 0, fontSize: '0.95rem' }}>{p.description}</p>
        {p.type === 'cryptarithm' && <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>Setiap huruf mewakili angka unik (0-9). Substitusikan angka yang tepat agar persamaan matematikanya bernilai benar.</p>}
        {p.type === 'riddle' && <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>Pecahkan pola atau teka-teki logika yang diberikan lalu tulis jawaban akhir di kolom jawaban.</p>}
      </div>
      <form className="card puzzle-play-card" onSubmit={submit}>
        {p.type === 'cryptarithm' ? (
          <>
            <div className="crypt">{p.data.equation}</div>
            <div className="row wrap mb">
              {(p.letters || Array.from(new Set(p.data.equation.replace(/[^A-Z]/g, '').split('')))).map((l) => (
                <label key={l} className="letter">{l}
                  <input type="number" min="0" max="9" required value={map[l] ?? ''} onChange={(e) => setMap({ ...map, [l]: e.target.value })} />
                </label>
              ))}
            </div>
            {p.data.hint && <p className="hint">💡 Petunjuk: {p.data.hint}</p>}
          </>
        ) : (
          <>
            <p className="q-text mb">{p.data.question}</p>
            <input required value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Jawabanmu" />
          </>
        )}
        {fb && <div className={fb.ok ? 'notice good-box' : 'alert'}>{fb.text}</div>}
        {user ? <button className="btn mt">Periksa Jawaban</button> : <Link to="/masuk" className="btn mt">Masuk untuk menjawab</Link>}
      </form>
    </>
  );
}
