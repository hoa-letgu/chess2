import { useState } from 'react';
import { LockKeyhole, UnlockKeyhole } from 'lucide-react';
import { paymentApi, payNumber as n, walletLabels } from './payment-client';

export type LockState = { locked_coins: number; available_coins: number; lock_reason: string; lock_updated: number | null; lock_version: number; wallet_mode: string };
export type LockEvent = { id: string; actor: string; amount: number; previous: number; reason: string; walletMode: string; created: number };
export default function WalletLockControl({ user, history, onSaved }: { user: LockState & { id: string; balance: number }; history: LockEvent[]; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(user.locked_coins)), [reason, setReason] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  return <section className="admin-wallet-lock"><div className="admin-lock-heading"><LockKeyhole size={21}/><div><h3>Khóa xu một phần</h3><p>{walletLabels[user.wallet_mode]} · Chỉ khóa số xu chỉ định, không trừ số dư.</p></div></div>
    <div className="admin-lock-totals"><span>Tổng số dư<strong>{n(user.balance)} xu</strong></span><span>Đang khóa<strong>{n(user.locked_coins)} xu</strong></span><span>Có thể sử dụng<strong>{n(user.available_coins)} xu</strong></span></div>
    {user.locked_coins > 0 && <p className="admin-footnote">Lý do hiện tại: {user.lock_reason}</p>}
    <form className="admin-review-form" onSubmit={async e => { e.preventDefault(); if (saving) return; setSaving(true); setError(''); try { await paymentApi(`/admin/users/${user.id}/wallet-lock`, { amount: Number(amount), reason, version: user.lock_version, walletMode: user.wallet_mode }); onSaved(); } catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu mức khóa.'); } finally { setSaving(false); } }}>
      <label>Tổng số xu muốn khóa<input type="number" min={0} max={user.balance} step={1} required value={amount} onChange={e => setAmount(e.target.value)}/></label>
      <small>Đây là tổng mức khóa mới. Nhập 0 để mở khóa toàn bộ. Xu đã giữ cược được quyết toán theo ván.</small>
      <label>Lý do khóa / điều chỉnh / mở khóa<textarea required maxLength={500} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do để lưu nhật ký…"/></label>
      {error && <p className="admin-error" role="alert">{error} <button type="button" onClick={onSaved}>Tải lại hồ sơ</button></p>}
      <button className="admin-primary" disabled={saving || Number(amount) === user.locked_coins}>{Number(amount) === 0 ? <UnlockKeyhole size={15}/> : <LockKeyhole size={15}/>} {saving ? 'Đang lưu…' : Number(amount) === 0 ? 'Mở khóa xu' : 'Lưu mức khóa xu'}</button>
    </form>
    {!!history.length && <details><summary>Lịch sử khóa xu · {history.length} lần gần nhất</summary><ol className="admin-lock-history">{history.map(event => <li key={event.id}><strong>{event.actor} · {n(event.previous)} → {n(event.amount)} xu</strong><small>{walletLabels[event.walletMode]} · {new Date(event.created).toLocaleString('vi-VN')}</small><p>{event.reason}</p></li>)}</ol></details>}
  </section>;
}
