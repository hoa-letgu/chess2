// Fictional merchant credentials and an in-process gateway emulator. Never
// forwards requests to the network; used by tests and the isolated UI preview.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
export const sign = (key, value, encoding = 'hex') => createHmac('sha256', key).update(value).digest(encoding);
const canonical = data => Object.keys(data).sort().map(k => `${k}=${data[k] == null ? '' : typeof data[k] === 'object' ? JSON.stringify(data[k]) : data[k]}`).join('&');
export function fakePaymentEnv(environment = 'sandbox') { return { PAYMENT_ENV: environment, PAYMENT_PUBLIC_URL: 'https://arena.invalid', MOMO_PARTNER_CODE: 'test_partner', MOMO_ACCESS_KEY: 'test_access', MOMO_SECRET_KEY: 'test_momo_secret', ZALOPAY_APP_ID: '1234', ZALOPAY_KEY1: 'test_zalo_1', ZALOPAY_KEY2: 'test_zalo_2', SHOPEEPAY_CLIENT_ID: 'test_shopee', SHOPEEPAY_SECRET_KEY: 'test_shopee_secret', SHOPEEPAY_MERCHANT_ID: 'test_merchant', SHOPEEPAY_STORE_ID: 'test_store', PAYOS_CLIENT_ID: 'test_payos', PAYOS_API_KEY: 'test_payos_api', PAYOS_CHECKSUM_KEY: 'test_checksum', PAYPAL_CLIENT_ID: 'test_paypal', PAYPAL_CLIENT_SECRET: 'test_paypal_secret', PAYPAL_WEBHOOK_ID: 'test_webhook', PAYPAL_VND_PER_USD: '25000' }; }
export function fakeGateway({ paidAfterMs = Infinity } = {}) {
  const rows = new Map(), calls = [];
  let paid = false, wrongAmount = false, failCreate = false;
  const fetcher = async (url, options = {}) => {
    const u = new URL(url), body = options.body ? (String(options.body).startsWith('grant_type=') ? {} : JSON.parse(String(options.body))) : {};
    calls.push({ url: u.href, body, headers: options.headers });
    const response = (data, extra = {}) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', ...extra } });
    const add = (ref, amount, extra = {}) => { if (failCreate) throw Error('Simulated connection timeout'); const row = { ref, amount, created: Date.now(), ...extra }; rows.set(String(ref), row); return row; };
    const isPaid = row => paid || Date.now() - row.created >= paidAfterMs;
    if (u.hostname.includes('momo.vn')) {
      if (u.pathname.endsWith('/create')) {
        assert.equal(body.signature, sign('test_momo_secret', `accessKey=test_access&amount=${body.amount}&extraData=&ipnUrl=${body.ipnUrl}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&partnerCode=test_partner&redirectUrl=${body.redirectUrl}&requestId=${body.requestId}&requestType=captureWallet`));
        add(body.orderId, body.amount);
        return response({ resultCode: 0, orderId: body.orderId, amount: body.amount, payUrl: `https://checkout.invalid/${body.orderId}`, qrCodeUrl: `TEST-ONLY-${body.orderId}` });
      }
      const row = rows.get(body.orderId); if (!row) return response({ resultCode: 1000, orderId: body.orderId, partnerCode: 'test_partner' });
      return response({ resultCode: isPaid(row) ? 0 : 1000, orderId: row.ref, partnerCode: 'test_partner', amount: row.amount + (wrongAmount ? 1 : 0), transId: `momo-${row.ref}` });
    }
    if (u.hostname.includes('zalopay.vn')) {
      if (u.pathname.endsWith('/create')) {
        assert.equal(body.mac, sign('test_zalo_1', [body.app_id, body.app_trans_id, body.app_user, body.amount, body.app_time, body.embed_data, body.item].join('|')));
        add(body.app_trans_id, body.amount, { embed: JSON.parse(body.embed_data) });
        return response({ return_code: 1, order_url: `https://checkout.invalid/${body.app_trans_id}`, qr_code: `TEST-ONLY-${body.app_trans_id}` });
      }
      const row = rows.get(body.app_trans_id);
      return response({ return_code: row && isPaid(row) ? 1 : 3, amount: row?.amount, zp_trans_id: `zalo-${row?.ref}` });
    }
    if (u.hostname.includes('airpay.vn')) {
      assert.equal(options.headers['X-Airpay-Req-H'], sign('test_shopee_secret', options.body, 'base64'));
      let data;
      if (u.pathname.endsWith('/order/create')) { add(body.payment_reference_id, body.amount); data = { errcode: 0, redirect_url_http: `https://checkout.invalid/${body.payment_reference_id}`, qr_content: `TEST-ONLY-${body.payment_reference_id}` }; }
      else { const row = rows.get(body.reference_id); data = { errcode: 0, transaction: { reference_id: row.ref, amount: row.amount, transaction_sn: `shopee-${row.ref}`, status: isPaid(row) ? 3 : 2, transaction_type: 13, merchant_ext_id: 'test_merchant', store_ext_id: 'test_store' } }; }
      const raw = JSON.stringify(data); return new Response(raw, { headers: { 'Content-Type': 'application/json', 'x-airpay-res-h': sign('test_shopee_secret', raw, 'base64') } });
    }
    if (u.hostname === 'api-merchant.payos.vn') {
      let data;
      if (options.method === 'POST') { add(body.orderCode, body.amount); data = { orderCode: body.orderCode, amount: body.amount, checkoutUrl: `https://checkout.invalid/${body.orderCode}`, qrCode: `TEST-ONLY-${body.orderCode}` }; }
      else { const row = rows.get(u.pathname.split('/').at(-1)); data = { id: `link-${row.ref}`, orderCode: row.ref, amount: row.amount, amountPaid: isPaid(row) ? row.amount : 0, status: isPaid(row) ? 'PAID' : 'PENDING', transactions: [] }; }
      return response({ code: '00', desc: 'success', data, signature: sign('test_checksum', canonical(data)) });
    }
    if (u.hostname.includes('paypal.com')) {
      if (u.pathname.endsWith('/token')) return response({ access_token: 'test_only_access_token' });
      if (u.pathname.endsWith('/verify-webhook-signature')) return response({ verification_status: body.transmission_sig === 'test_valid_signature' ? 'SUCCESS' : 'FAILURE' });
      if (u.pathname === '/v2/checkout/orders') { const ref = `PP${body.purchase_units[0].custom_id.replaceAll('-', '')}`; add(ref, body.purchase_units[0].amount.value, { unit: body.purchase_units[0] }); return response({ id: ref, links: [{ rel: 'payer-action', href: `https://checkout.invalid/${ref}` }] }); }
      const ref = u.pathname.split('/')[4], row = rows.get(ref); assert.ok(row);
      if (u.pathname.endsWith('/capture')) { paid = true; return response({ status: 'COMPLETED' }); }
      return response({ id: ref, status: isPaid(row) ? 'COMPLETED' : 'APPROVED', purchase_units: [{ ...row.unit, payments: { captures: isPaid(row) ? [{ id: `capture-${ref}`, status: 'COMPLETED', amount: row.unit.amount }] : [] } }] });
    }
    throw Error(`Mock gateway rejects unexpected host ${u.hostname}`);
  };
  return { fetch: fetcher, calls, rows, setPaid: value => { paid = value; }, setWrongAmount: value => { wrongAmount = value; }, setFailCreate: value => { failCreate = value; } };
}
