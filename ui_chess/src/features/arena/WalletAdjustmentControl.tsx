import { useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { paymentApi, payNumber as n, walletLabels } from './payment-client';
import type { LockState } from './WalletLockControl';

export type Adjustment = { id: string; actor_name: string; amount: number; reason: string; reference: string; payment_order_id: string | null; balance_before: number; balance_after: number; created: number };
export default function WalletAdjustmentControl({ user, history, onSaved }: { user: LockState & { id: string; username: string; balance: number }; history: Adjustment[]; onSaved: () => void }) {
  const [direction, setDirection] = useState('add'), [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [reference, setReference] = useState(''), [order, setOrder] = useState(''), [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const intent = useRef<{ signature: string; requestId: string } | null>(null), pending = useRef(false);
  const delta = Number(amount) * (direction === 'add' ? 1 : -1), valid = Number.isSafeInteger(delta) && Math.abs(delta) >= 1 && Math.abs(delta) <= 10000000 && (delta > 0 || -delta <= user.available_coins);
  return <section className="admin-wallet-lock admin-wallet-adjustment"><div className="admin-lock-heading"><Coins size={21}/><div><h3>Cộng / trừ xu thủ công</h3><p>{walletLabels[user.wallet_mode]} · Tài khoản {user.username}</p></div></div><p className="admin-footnote">Điều chỉnh số dư để xử lý sai lệch hoặc cộng bù. Đây là điều chỉnh xu trong game, không hoàn tiền về ngân hàng/ví thanh toán.</p>
    <form className="admin-review-form" onSubmit={async e => {
      e.preventDefault(); if (!valid || pending.current) return;
      if (!review) { setReview(true); setError(''); return; }
      const payload = { amount: delta, reason, reference, paymentOrderId: direction === 'add' ? order.trim() : '', walletMode: user.wallet_mode, expectedBalance: user.balance };
      const signature = JSON.stringify(payload); if (intent.current?.signature !== signature) intent.current = { signature, requestId: crypto.randomUUID() };
      pending.current = true; setBusy(true); setError('');
      try { await paymentApi(`/admin/users/${user.id}/wallet-adjustment`, { ...payload, requestId: intent.current.requestId }); onSaved(); }
      catch (err) { setError(err instanceof Error ? err.message : 'Không thể điều chỉnh xu.'); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <fieldset disabled={busy || review} className="admin-adjustment-fields"><label>Thao tác<select value={direction} onChange={e => setDirection(e.target.value)}><option value="add">Cộng xu</option><option value="subtract">Trừ xu</option></select></label>
        <label>Số xu điều chỉnh<input type="number" min={1} max={direction === 'add' ? 10000000 : Math.min(10000000, user.available_coins)} step={1} required value={amount} onChange={e => setAmount(e.target.value)}/></label>
        <small>Tối đa 10.000.000 xu / lần. Có thể trừ tối đa {n(Math.min(10000000, user.available_coins))} xu khả dụng; xu đang khóa và giữ cược được bảo toàn.</small>
        <label>Lý do điều chỉnh<textarea required maxLength={500} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ví dụ: Cộng bù đơn nạp đã đối soát…"/></label>
        <label>Mã biên nhận / tham chiếu (tùy chọn)<input maxLength={150} value={reference} onChange={e => setReference(e.target.value)} placeholder="Mã chuyển khoản, mã hỗ trợ…"/></label>
        {direction === 'add' && <><label>Mã đơn nạp của hệ thống cần cộng bù (tùy chọn)<input maxLength={80} value={order} onChange={e => setOrder(e.target.value)} placeholder="Dán mã đơn trong Cấu hình thanh toán"/></label><small>Khi gắn đơn, số xu phải bằng toàn bộ xu của đơn chưa thành công và thuộc đúng người chơi, đúng ví. Cổng xác nhận muộn sẽ không cộng lần hai.</small></>}
      </fieldset>
      {valid && <div className="admin-adjustment-preview" role="status"><strong>{review ? 'Kiểm tra trước khi xác nhận' : 'Số dư dự kiến'}</strong><p>{user.username} · {walletLabels[user.wallet_mode]}</p><b>{n(user.balance)} {delta > 0 ? '+' : '−'} {n(Math.abs(delta))} = {n(user.balance + delta)} xu</b><small>Xu khả dụng sau điều chỉnh: {n(user.available_coins + delta)} xu.</small></div>}
      {error && <p className="admin-error" role="alert">{error} <button type="button" disabled={busy} onClick={onSaved}>Tải lại hồ sơ</button></p>}
      <button className="admin-primary" disabled={busy || !valid || !reason.trim()}>{busy ? 'Đang xử lý…' : review ? `Xác nhận ${direction === 'add' ? 'cộng' : 'trừ'} ${n(Math.abs(delta))} xu` : 'Kiểm tra điều chỉnh'}</button>
      {review && <button type="button" disabled={busy} onClick={() => { setReview(false); setError(''); }}>Sửa thông tin</button>}
    </form>
    {!!history.length && <details><summary>Lịch sử điều chỉnh · {history.length} lần gần nhất</summary><ol className="admin-lock-history">{history.map(item => <li key={item.id}><strong>{item.actor_name} · {item.amount > 0 ? '+' : ''}{n(item.amount)} xu</strong><small>{new Date(item.created).toLocaleString('vi-VN')} · {n(item.balance_before)} → {n(item.balance_after)} xu</small><p>{item.reason}</p>{item.reference && <p>Tham chiếu: {item.reference}</p>}{item.payment_order_id && <p>Đơn cộng bù: {item.payment_order_id}</p>}</li>)}</ol></details>}
  </section>;
}
