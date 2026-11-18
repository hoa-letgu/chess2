export type TopupEvent = { enabled:boolean; title:string; type:'discount'|'bonus'; percent:number; starts:number; ends:number; minAmount:number; maxAmount:number; methods:string[]; version:number; status:string };
export type TopupQuote = { faceAmountVnd:number; payAmountVnd:number; baseCoins:number; bonusCoins:number; coins:number; promotion:Pick<TopupEvent,'title'|'type'|'percent'|'version'|'starts'|'ends'>|null; key:string };
export type PaymentMethod = { id: string; gateway: string; name: string; description: string; enabled: boolean; ready: boolean; available: boolean; missing?: string[]; vndPerUsd?: number };
export type PaymentConfig = { mode: 'demo' | 'paid'; topupEvent: TopupEvent; publicUrl: string | null; bankGateway?: 'payos' | 'zalopay'; environment: 'sandbox' | 'live'; walletMode: 'demo' | 'sandbox' | 'paid'; vndPerCoin: number | null; version: number; enabled: string[]; methods: PaymentMethod[] };
export type PaymentOrder = { id: string; method: string; environment: string; walletMode: string; amountVnd: number; faceAmountVnd: number; baseCoins: number; bonusCoins: number; promotion: TopupQuote['promotion']; coins: number; currency: string; chargedMinor: number; status: string; checkoutUrl: string | null; qrImage: string | null; created: number; expires: number; paidAt: number | null; manuallyCredited: boolean; reviewRequired: boolean; error: string | null; username?: string };
export const paymentStatus: Record<string, string> = { creating: 'Đang tạo', pending: 'Chờ thanh toán', unknown: 'Cần kiểm tra', paid: 'Đã cộng xu', expired: 'QR hết hạn', failed: 'Không thành công' };
export const walletLabels: Record<string, string> = { demo: 'XU DEMO', sandbox: 'KIỂM THỬ THANH TOÁN', paid: 'XU NẠP THẬT' };
export const payNumber = (v: number) => v.toLocaleString('vi-VN');
export async function paymentApi<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/arena${path}`, { credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json', 'X-Arena-Request': '1' }, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Không thể tải thanh toán.');
  return data;
}
