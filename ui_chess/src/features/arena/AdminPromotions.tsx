import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { paymentApi } from './payment-client';
import type { Promotion } from './Promotions';
import './promotions.css';

function Editor({ item, onSaved }: { item: Promotion; onSaved: (items: Promotion[]) => void }) {
  const [draft, setDraft] = useState(item), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(archive = false) {
    if (busy) return; setBusy(true); setError('');
    try { const data = await paymentApi<{ items: Promotion[] }>(`/admin/promotions/${item.id}${archive ? '/archive' : ''}`, archive ? { archived: !item.archived, version: item.version } : draft); onSaved(data.items); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu ảnh.'); } finally { setBusy(false); }
  }
  return <form className="admin-promotion-card" onSubmit={e => { e.preventDefault(); void save(); }}><img src={item.imageUrl} alt={`Xem trước ${item.title}`} width={item.width} height={item.height}/><div className="admin-promotion-body"><div className="admin-promotion-state"><span className="admin-pill">{item.archived ? 'Đã lưu trữ' : item.enabled ? 'Đang hiển thị' : 'Bản nháp'}</span><small>{item.width} × {item.height} px</small></div>
    <label>Loại ảnh<select disabled={item.archived} value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as Promotion['kind'] })}><option value="banner">Banner</option><option value="event">Sự kiện</option></select></label>
    <label>Tiêu đề<input required maxLength={100} disabled={item.archived} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label>
    <label>Mô tả<textarea rows={2} maxLength={500} disabled={item.archived} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label>
    <label>Liên kết khi bấm ảnh (tùy chọn)<input type="url" placeholder="https://…" maxLength={1000} disabled={item.archived} value={draft.link} onChange={e => setDraft({ ...draft, link: e.target.value })}/></label>
    <label>Thứ tự hiển thị<input type="number" min={0} max={9999} step={1} required disabled={item.archived} value={draft.position} onChange={e => setDraft({ ...draft, position: Number(e.target.value) })}/></label>
    <label className="admin-promotion-checkbox"><input type="checkbox" disabled={item.archived} checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })}/> Hiển thị trên sảnh game</label>
    {error && <p className="admin-error" role="alert">{error} Chọn Làm mới nếu dữ liệu đã thay đổi.</p>}
    <div className="admin-promotion-actions">{!item.archived && <button className="admin-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>}<button type="button" disabled={busy} onClick={() => void save(true)}>{item.archived ? 'Khôi phục bản nháp' : 'Lưu trữ ảnh'}</button></div>
  </div></form>;
}
export default function AdminPromotions({ revision }: { revision: number }) {
  const [items, setItems] = useState<Promotion[]>([]), [kind, setKind] = useState('banner'), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [archived, setArchived] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => { URL.revokeObjectURL(url); setPreview(''); }; }, [file]);
  useEffect(() => { const abort = new AbortController(); paymentApi<{ items: Promotion[] }>('/admin/promotions', undefined, abort.signal).then(data => { setItems(data.items); setError(''); }).catch(err => { if (!abort.signal.aborted) setError(err.message); }); return () => abort.abort(); }, [revision]);
  async function upload() {
    if (!file || busy) return; setBusy(true); setError(''); setNotice('');
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
      const response = await fetch(`/api/arena/admin/promotions/upload?kind=${kind}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type, 'X-Arena-Request': '1' }, body: file });
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Không thể tải ảnh lên.');
      setItems(data.items); setFile(null); if (input.current) input.current.value = ''; setNotice('Đã tải ảnh lên bản nháp. Nhập tiêu đề, bật hiển thị rồi lưu để đưa lên sảnh.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải ảnh.'); } finally { setBusy(false); }
  }
  return <section className="admin-panel"><div className="admin-panel-heading"><div><h2><ImagePlus size={20}/> Banner & ảnh sự kiện</h2><p>Tải ảnh lên bản nháp, chỉnh nội dung rồi bật hiển thị. Số thứ tự nhỏ được hiển thị trước trong từng nhóm. Có thể lưu trữ và khôi phục ảnh.</p></div></div><form className="admin-promotion-upload" onSubmit={e => { e.preventDefault(); void upload(); }}><div><label>Loại ảnh tải lên<select value={kind} onChange={e => setKind(e.target.value)}><option value="banner">Banner</option><option value="event">Ảnh sự kiện</option></select></label><label>Chọn ảnh từ thiết bị<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const chosen = e.target.files?.[0] ?? null; setError(''); setNotice(''); if (chosen && (!['image/jpeg','image/png','image/webp'].includes(chosen.type) || chosen.size > 5 * 1024 * 1024)) { setError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.'); setFile(null); e.target.value = ''; } else setFile(chosen); }}/></label><small>Ảnh tĩnh JPG, PNG, WebP · tối đa 5 MB / ảnh, 20 triệu điểm ảnh. Gợi ý banner 1600 × 600; sự kiện 1200 × 800. Ảnh tự tối ưu, không cắt mất nội dung.</small><button className="admin-primary" disabled={!file || busy}><Upload size={15}/>{busy ? 'Đang tải ảnh…' : 'Tải ảnh lên bản nháp'}</button></div>{preview && <img className="admin-upload-preview" src={preview} alt="Xem trước ảnh sắp tải lên"/>}</form>
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-media-notice" role="status">{notice}</p>}
    <label className="admin-promotion-filter"><input type="checkbox" checked={archived} onChange={e => setArchived(e.target.checked)}/> Hiện ảnh đã lưu trữ ({items.filter(item => item.archived).length})</label>
    <div className="admin-promotion-grid">{items.filter(item => archived || !item.archived).map(item => <Editor key={`${item.id}:${item.version}`} item={item} onSaved={next => { setItems(next); setNotice('Đã lưu thay đổi. Ảnh đang bật sẽ cập nhật trên sảnh trong khoảng 10 giây.'); }}/>)}</div>{!items.some(item => archived || !item.archived) && <div className="admin-empty">Chưa có ảnh. Chọn ảnh từ thiết bị để tạo banner hoặc sự kiện đầu tiên.</div>}
  </section>;
}
