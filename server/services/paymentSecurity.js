import crypto from 'node:crypto';
export function safeEqualHex(a,b){if(typeof a!=='string'||typeof b!=='string'||!/^[a-f0-9]+$/i.test(a)||!/^[a-f0-9]+$/i.test(b)||a.length!==b.length)return false;return crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))}
export function verifyWebhook(rawBody,signature,secret){if(!rawBody||!signature||!secret)return false;const expected=crypto.createHmac('sha256',secret).update(rawBody).digest('hex');return safeEqualHex(expected,signature)}
export function verifyCheckoutSignature(orderId,paymentId,signature,secret){if(!orderId||!paymentId||!signature||!secret)return false;const expected=crypto.createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex');return safeEqualHex(expected,signature)}
