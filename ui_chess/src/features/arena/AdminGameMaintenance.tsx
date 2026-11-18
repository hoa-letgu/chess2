import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { paymentApi } from './payment-client';
import type { CatalogGame } from './useGameCatalog';

function GameControl({ game, onSaved }: { game: CatalogGame; onSaved: (games: CatalogGame[]) => void }) {
  const [maintenance, setMaintenance] = useState(game.maintenance), [message, setMessage] = useState(game.message), [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <form className="admin-maintenance-card" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { const data = await paymentApi<{ games: CatalogGame[] }>(`/admin/games/${game.id}/maintenance`, { maintenance, message, version: game.version }); onSaved(data.games); window.dispatchEvent(new Event('arena-games-changed')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu.'); } finally { setBusy(false); }
  }}><div className="admin-maintenance-title"><h3>{game.name}</h3><span className={`admin-pill ${game.maintenance ? 'negative' : 'positive'}`}>{game.maintenance ? 'Đang ẩn · Bảo trì' : 'Đang mở'}</span></div>
    <label className="admin-maintenance-toggle"><span><strong>Bảo trì trò chơi</strong><small>Bật để ẩn khỏi sảnh và chặn ván mới.</small></span><button type="button" role="switch" aria-label={`Bảo trì ${game.name}`} aria-checked={maintenance} disabled={busy} className={`admin-maintenance-switch ${maintenance ? 'is-on' : ''}`} onClick={() => setMaintenance(value => !value)}><span/></button></label>
    <label className="admin-maintenance-message">Thông báo bảo trì<textarea rows={2} maxLength={300} value={message} onChange={e => setMessage(e.target.value)} placeholder="Ví dụ: Đang nâng cấp bàn cờ, vui lòng quay lại sau."/></label>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="admin-primary" disabled={busy || (maintenance === game.maintenance && message.trim() === game.message)}>{busy ? 'Đang lưu…' : 'Lưu cấu hình'}</button>
    {game.updated && <small>Cập nhật: {new Date(game.updated).toLocaleString('vi-VN')}</small>}
  </form>;
}
export default function AdminGameMaintenance({ revision }: { revision: number }) {
  const [games, setGames] = useState<CatalogGame[]>([]), [error, setError] = useState('');
  useEffect(() => { const abort = new AbortController(); paymentApi<{ games: CatalogGame[] }>('/admin/games', undefined, abort.signal).then(data => { setGames(data.games); setError(''); }).catch(err => { if (!abort.signal.aborted) setError(err.message); }); return () => abort.abort(); }, [revision]);
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2><Wrench size={19}/> Ẩn trò chơi để bảo trì</h2><p>Bật bảo trì rồi lưu để ẩn trò khỏi sảnh, lựa chọn bot và tạo bàn online. Ván đang chơi tiếp tục bình thường; bàn đang chờ không nhận người mới. Tắt bảo trì rồi lưu để mở lại.</p></div></div>{error && <p className="admin-error" role="alert">{error} Chọn Làm mới để tải lại.</p>}<div className="admin-maintenance-grid">{games.map(game => <GameControl key={`${game.id}:${game.version}`} game={game} onSaved={setGames}/>)}</div></section>;
}
