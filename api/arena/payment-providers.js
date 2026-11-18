import { PayOS } from '@payos/node';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export const hmac = (key, text, encoding = 'hex') => createHmac('sha256', key).update(text).digest(encoding);
export function sameSignature(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
export const sorted = data => Object.keys(data).sort().map(k => `${k}=${data[k] === null || data[k] === undefined || data[k] === 'null' ? '' : typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]}`).join('&');
export function parseProviderJSON(text) {
  // Preserve large provider transaction identifiers without rounding int64 values.
  return JSON.parse(text, (key, value, context) => ['transId', 'zp_trans_id'].includes(key) && typeof value === 'number' ? context?.source ?? String(value) : value);
}
export function providerConfig(gateway, environment, env = process.env) {
  const read = key => env[`${gateway.toUpperCase()}_${environment.toUpperCase()}_${key}`] ?? (environment === (env.PAYMENT_ENV ?? 'sandbox') ? env[`${gateway.toUpperCase()}_${key}`] : undefined);
  const keys = { momo: ['PARTNER_CODE', 'ACCESS_KEY', 'SECRET_KEY'], zalopay: ['APP_ID', 'KEY1', 'KEY2'], shopeepay: ['CLIENT_ID', 'SECRET_KEY', 'MERCHANT_ID', 'STORE_ID'], payos: ['CLIENT_ID', 'API_KEY', 'CHECKSUM_KEY'], paypal: ['CLIENT_ID', 'CLIENT_SECRET', 'WEBHOOK_ID', 'VND_PER_USD'] }[gateway] ?? [];
  const values = Object.fromEntries(keys.map(key => [key, read(key)]));
  const missing = keys.filter(key => !values[key]);
  let publicUrl;
  try { publicUrl = new URL(env.PAYMENT_PUBLIC_URL); if (publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash || publicUrl.pathname !== '/' || (publicUrl.protocol !== 'https:' && !(environment === 'sandbox' && publicUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(publicUrl.hostname)))) throw Error(); } catch { missing.push('PAYMENT_PUBLIC_URL'); }
  if (gateway === 'paypal' && (!Number.isSafeInteger(Number(values.VND_PER_USD)) || Number(values.VND_PER_USD) < 1000 || Number(values.VND_PER_USD) > 1000000)) missing.push('PAYPAL_VND_PER_USD');
  if (gateway === 'payos' && environment !== 'live') missing.push('payOS chỉ hỗ trợ kênh Live');
  return { ...values, ready: missing.length === 0, missing: [...new Set(missing)], publicUrl: publicUrl?.origin, environment, gateway };
}
function link(value) { if (!value) return null; const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) throw Error('Cổng trả về đường dẫn không hợp lệ.'); return url.href; }
const cents = value => { if (typeof value !== 'string' || !/^\d{1,9}\.\d{2}$/.test(value)) throw Error('Số tiền PayPal không hợp lệ.'); return Number(value.replace('.', '')); };

export function paymentDriver(gateway, environment, { env = process.env, fetch: fetcher = fetch } = {}) {
  const c = providerConfig(gateway, environment, env);
  if (!c.ready) throw Error('Cổng thanh toán chưa được cấu hình đầy đủ.');
  const base = { momo: environment === 'live' ? 'https://payment.momo.vn' : 'https://test-payment.momo.vn', zalopay: environment === 'live' ? 'https://openapi.zalopay.vn' : 'https://sb-openapi.zalopay.vn', shopeepay: environment === 'live' ? 'https://api.wallet.airpay.vn' : 'https://api.uat.wallet.airpay.vn', payos: 'https://api-merchant.payos.vn', paypal: environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com' }[gateway];
  async function call(path, body, headers = {}, method = 'POST') {
    const response = await fetcher(base + path, { method, signal: AbortSignal.timeout(35000), redirect: 'error', headers: { 'Content-Type': 'application/json', ...headers }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
    const text = await response.text();
    if (!response.ok || text.length > 200000) throw Error('Cổng thanh toán chưa phản hồi hợp lệ. Kiểm tra trạng thái đơn trước khi thử lại.');
    if (gateway === 'shopeepay') {
      const signature = response.headers.get('x-airpay-res-h') ?? response.headers.get('x-airpay-req-h');
      if (!sameSignature(signature, hmac(c.SECRET_KEY, text, 'base64'))) throw Error('Chữ ký phản hồi ShopeePay không hợp lệ.');
    }
    return parseProviderJSON(text);
  }
  const returnUrl = order => `${c.publicUrl}/?payment=${order.id}#wallet`;
  const webhookUrl = `${c.publicUrl}/api/arena/payments/webhook/${gateway}`;
  async function shopee(path, body) { const raw = JSON.stringify(body); return call(path, raw, { 'X-Airpay-ClientId': c.CLIENT_ID, 'X-Airpay-Req-H': hmac(c.SECRET_KEY, raw, 'base64') }); }
  async function paypal(path, body, method = 'POST', headers = {}) {
    const token = await call('/v1/oauth2/token', 'grant_type=client_credentials', { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${c.CLIENT_ID}:${c.CLIENT_SECRET}`).toString('base64')}` });
    if (!token.access_token) throw Error('Không thể xác thực PayPal.');
    return call(path, body, { Authorization: `Bearer ${token.access_token}`, ...headers }, method);
  }
  const payos = gateway === 'payos' ? new PayOS({ clientId: c.CLIENT_ID, apiKey: c.API_KEY, checksumKey: c.CHECKSUM_KEY, fetch: fetcher, timeout: 35000, maxRetries: 0, logLevel: 'off' }) : null;
  return {
    async create(order, platform = 'pc') {
      if (gateway === 'momo') {
        const body = { partnerCode: c.PARTNER_CODE, requestId: order.id, orderId: order.provider_ref, amount: order.amount_vnd, orderInfo: `Nap ${order.coins} xu Board Arena`, redirectUrl: returnUrl(order), ipnUrl: webhookUrl, requestType: 'captureWallet', extraData: '', autoCapture: true, lang: 'vi' };
        body.signature = hmac(c.SECRET_KEY, sorted({ accessKey: c.ACCESS_KEY, amount: body.amount, extraData: body.extraData, ipnUrl: body.ipnUrl, orderId: body.orderId, orderInfo: body.orderInfo, partnerCode: body.partnerCode, redirectUrl: body.redirectUrl, requestId: body.requestId, requestType: body.requestType }));
        const data = await call('/v2/gateway/api/create', body);
        if (data.resultCode !== 0 || data.orderId !== order.provider_ref || Number(data.amount) !== order.amount_vnd) throw Error('MoMo chưa tạo được đơn thanh toán.');
        return { providerRef: order.provider_ref, checkoutUrl: link(data.payUrl), qrData: data.qrCodeUrl || data.payUrl };
      }
      if (gateway === 'zalopay') {
        const body = { app_id: Number(c.APP_ID), app_user: order.user_id, app_trans_id: order.provider_ref, app_time: Date.now(), amount: order.amount_vnd, embed_data: JSON.stringify({ redirecturl: returnUrl(order), preferred_payment_method: [order.method === 'card' ? 'international_card' : order.method === 'bank' ? 'vietqr' : 'zalopay_wallet'] }), item: '[]', description: `Board Arena - nap ${order.coins} xu`, callback_url: webhookUrl, bank_code: '', expire_duration_seconds: 1200 };
        body.mac = hmac(c.KEY1, [body.app_id, body.app_trans_id, body.app_user, body.amount, body.app_time, body.embed_data, body.item].join('|'));
        const data = await call('/v2/create', body);
        if (data.return_code !== 1) throw Error('ZaloPay chưa tạo được đơn thanh toán.');
        return { providerRef: order.provider_ref, checkoutUrl: link(data.order_url), qrData: data.qr_code || data.order_url };
      }
      if (gateway === 'shopeepay') {
        const data = await shopee('/v3/merchant-host/order/create', { request_id: order.id, payment_reference_id: order.provider_ref, merchant_ext_id: c.MERCHANT_ID, store_ext_id: c.STORE_ID, amount: order.amount_vnd * 100, currency: 'VND', return_url: returnUrl(order), platform_type: platform, validity_period: 1200 });
        if (data.errcode !== 0) throw Error('ShopeePay chưa tạo được đơn thanh toán.');
        return { providerRef: order.provider_ref, checkoutUrl: link(data.redirect_url_http), qrData: data.qr_content || data.redirect_url_http };
      }
      if (gateway === 'payos') {
        const body = { orderCode: Number(order.provider_ref), amount: order.amount_vnd, description: `BA${order.provider_ref}`, cancelUrl: returnUrl(order), returnUrl: returnUrl(order), expiredAt: Math.floor(order.expires / 1000) };
        const data = await payos.paymentRequests.create(body);
        if (data.orderCode !== Number(order.provider_ref) || data.amount !== order.amount_vnd) throw Error('Ngân hàng chưa tạo được đơn thanh toán hợp lệ.');
        return { providerRef: order.provider_ref, checkoutUrl: link(data.checkoutUrl), qrData: data.qrCode };
      }
      if (gateway === 'paypal') {
        const data = await paypal('/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ reference_id: order.id, custom_id: order.id, amount: { currency_code: 'USD', value: (order.charged_minor / 100).toFixed(2) } }], payment_source: { paypal: { experience_context: { return_url: returnUrl(order), cancel_url: returnUrl(order), user_action: 'PAY_NOW' } } } }, 'POST', { 'PayPal-Request-Id': order.id });
        if (!data.id) throw Error('PayPal chưa tạo được đơn thanh toán.');
        const url = link(data.links?.find(l => ['payer-action', 'approve'].includes(l.rel))?.href);
        return { providerRef: data.id, checkoutUrl: url, qrData: url };
      }
      throw Error('Cổng không được hỗ trợ.');
    },
    async check(order) {
      if (gateway === 'momo') {
        const body = { partnerCode: c.PARTNER_CODE, requestId: randomUUID(), orderId: order.provider_ref, lang: 'vi', signature: hmac(c.SECRET_KEY, sorted({ accessKey: c.ACCESS_KEY, orderId: order.provider_ref, partnerCode: c.PARTNER_CODE })) };
        const d = await call('/v2/gateway/api/query', body);
        if (d.orderId !== order.provider_ref || d.partnerCode !== c.PARTNER_CODE) throw Error('Đơn MoMo không khớp.');
        return { paid: d.resultCode === 0, amount: Number(d.amount), currency: 'VND', transactionId: String(d.transId ?? ''), reversed: Array.isArray(d.refundTrans) && d.refundTrans.length > 0 };
      }
      if (gateway === 'zalopay') {
        const d = await call('/v2/query', { app_id: Number(c.APP_ID), app_trans_id: order.provider_ref, mac: hmac(c.KEY1, `${c.APP_ID}|${order.provider_ref}|${c.KEY1}`) });
        return { paid: d.return_code === 1, amount: Number(d.amount), currency: 'VND', transactionId: String(d.zp_trans_id ?? '') };
      }
      if (gateway === 'shopeepay') {
        const d = await shopee('/v3/merchant-host/transaction/check', { request_id: randomUUID(), reference_id: order.provider_ref, transaction_type: 13, merchant_ext_id: c.MERCHANT_ID, store_ext_id: c.STORE_ID, amount: order.amount_vnd * 100 });
        const t = d.transaction;
        if (!t) return { paid: false };
        if (t.reference_id !== order.provider_ref || t.merchant_ext_id !== c.MERCHANT_ID || t.store_ext_id !== c.STORE_ID || t.transaction_type !== 13) throw Error('Đơn ShopeePay không khớp.');
        return { paid: d.errcode === 0 && t.status === 3, amount: Number(t.amount) / 100, currency: 'VND', transactionId: t.transaction_sn };
      }
      if (gateway === 'payos') {
        const d = await payos.paymentRequests.get(order.provider_ref);
        if (String(d.orderCode) !== order.provider_ref) throw Error('Đơn ngân hàng không khớp.');
        return { paid: d.status === 'PAID', amount: Number(d.amountPaid), currency: 'VND', transactionId: String(d.id ?? ''), expectedAmount: Number(d.amount) };
      }
      const d = await paypal(`/v2/checkout/orders/${encodeURIComponent(order.provider_ref)}`, undefined, 'GET');
      const unit = d.purchase_units?.[0], captures = unit?.payments?.captures ?? [];
      if (d.id !== order.provider_ref || unit?.custom_id !== order.id || d.purchase_units?.length !== 1) throw Error('Đơn PayPal không khớp.');
      const capture = captures.find(v => v.status === 'COMPLETED');
      if (d.status !== 'COMPLETED' || !capture) return { paid: false, reversed: captures.some(v => ['REFUNDED', 'PARTIALLY_REFUNDED', 'REVERSED'].includes(v.status)) };
      return { paid: true, amount: cents(capture.amount?.value), currency: capture.amount?.currency_code, transactionId: capture.id, expectedAmount: cents(unit.amount?.value), captureCount: captures.length };
    },
    async capture(order) {
      if (gateway !== 'paypal') throw Error('Chỉ PayPal cần hoàn tất thanh toán ở bước này.');
      // Reuse one idempotency ID on every retry, including network timeouts.
      await paypal(`/v2/checkout/orders/${encodeURIComponent(order.provider_ref)}/capture`, {}, 'POST', { 'PayPal-Request-Id': `cap-${order.id}` });
    },
    async webhook(raw, headers) {
      const d = parseProviderJSON(raw);
      if (gateway === 'momo') {
        const keys = ['amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
        if (d.partnerCode !== c.PARTNER_CODE || keys.some(k => d[k] === undefined) || !sameSignature(d.signature, hmac(c.SECRET_KEY, sorted({ accessKey: c.ACCESS_KEY, ...Object.fromEntries(keys.map(k => [k, d[k]])) })))) throw Error('Chữ ký MoMo không hợp lệ.');
        return { ref: d.orderId };
      }
      if (gateway === 'zalopay') {
        if (typeof d.data !== 'string' || !sameSignature(d.mac, hmac(c.KEY2, d.data))) throw Error('Chữ ký ZaloPay không hợp lệ.');
        const data = parseProviderJSON(d.data); if (String(data.app_id) !== String(c.APP_ID)) throw Error('Ứng dụng ZaloPay không khớp.');
        return { ref: data.app_trans_id };
      }
      if (gateway === 'shopeepay') {
        if (!sameSignature(headers['x-airpay-req-h'], hmac(c.SECRET_KEY, raw, 'base64')) || d.merchant_ext_id !== c.MERCHANT_ID || d.store_ext_id !== c.STORE_ID) throw Error('Chữ ký ShopeePay không hợp lệ.');
        return { ref: d.reference_id ?? d.payment_reference_id, review: d.transaction_type && d.transaction_type !== 13 };
      }
      if (gateway === 'payos') {
        const verified = await payos.webhooks.verify(d);
        return { ref: String(verified.orderCode) };
      }
      const payload = { auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'], transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'], transmission_time: headers['paypal-transmission-time'], webhook_id: c.WEBHOOK_ID, webhook_event: d };
      if (Object.values(payload).some(v => !v)) throw Error('Thiếu chữ ký PayPal.');
      const verified = await paypal('/v1/notifications/verify-webhook-signature', payload);
      if (verified.verification_status !== 'SUCCESS') throw Error('Chữ ký PayPal không hợp lệ.');
      return { ref: d.resource?.supplementary_data?.related_ids?.order_id ?? d.resource?.custom_id ?? d.resource?.id, review: /REFUND|REVERSE|DISPUTE/.test(d.event_type ?? '') };
    },
  };
}
