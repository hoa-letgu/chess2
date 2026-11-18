import { useEffect, useState } from 'react';
import './promotions.css';
export type Promotion = { id: string; kind: 'banner' | 'event'; title: string; description: string; link: string; position: number; enabled: boolean; archived: boolean; imageUrl: string; width: number; height: number; version: number };
function PromotionCard({ item }: { item: Promotion }) {
  const content = <><img src={item.imageUrl} alt={item.title} loading="lazy" width={item.width} height={item.height}/><div><span>{item.kind === 'banner' ? 'TIÊU ĐIỂM' : 'SỰ KIỆN'}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}{item.link && <strong>Xem chi tiết ↗</strong>}</div></>;
  return item.link ? <a className="lobby-promotion" href={item.link} target="_blank" rel="noopener noreferrer">{content}</a> : <article className="lobby-promotion">{content}</article>;
}
export default function Promotions() {
  const [items, setItems] = useState<Promotion[]>([]);
  useEffect(() => {
    const abort = new AbortController(); let loading = false;
    const load = async () => { if (loading) return; loading = true; try { const response = await fetch('/api/arena/promotions', { signal: abort.signal, cache: 'no-store' }); if (response.ok) { const data = await response.json(); if (!abort.signal.aborted) setItems(data.items); } } catch { /* Retry with the next refresh; keep the game lobby usable. */ } finally { loading = false; } };
    void load(); const timer = setInterval(() => void load(), 10000); window.addEventListener('focus', load);
    return () => { abort.abort(); clearInterval(timer); window.removeEventListener('focus', load); };
  }, []);
  if (!items.length) return null;
  return <section className="lobby-promotions" aria-label="Banner và sự kiện"><div className="promotion-heading"><span className="eyebrow muted">CÓ GÌ MỚI TẠI ARENA</span><h2>Tiêu điểm & sự kiện</h2></div>{['banner', 'event'].map(kind => { const group = items.filter(item => item.kind === kind); return group.length ? <div key={kind} className={`promotion-grid promotion-${kind}`}>{group.map(item => <PromotionCard key={item.id} item={item}/>)}</div> : null; })}</section>;
}
