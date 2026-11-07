import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

let transporter = null;

function getTransport() {
  if (transporter) return transporter;
  if (env.mail.enabled) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.port === 465,
      auth: { user: env.mail.user, pass: env.mail.pass },
    });
  } else {
    transporter = { sendMail: async (msg) => logger.info(`[mail:console] -> ${msg.to} | ${msg.subject}`) };
  }
  return transporter;
}

const shell = (title, body) => `
<div style="background:#FFF9F3;padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif;color:#282323">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E9DAD0;border-radius:16px;overflow:hidden">
    <div style="background:#78152F;color:#FFF9F3;padding:22px 28px;font-family:Georgia,serif;font-size:22px;letter-spacing:.14em">VIMUHET</div>
    <div style="padding:28px">
      <h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px;color:#3D101D">${title}</h1>
      <div style="font-size:14px;line-height:1.7;color:#756A66">${body}</div>
    </div>
    <div style="padding:16px 28px;background:#F8EFE7;font-size:12px;color:#756A66">
      Vimuhet · Premium ethnic wear · This is an automated message.
    </div>
  </div>
</div>`;

export async function sendMail({ to, subject, html, text }) {
  try {
    const info = await getTransport().sendMail({
      from: env.mail.from,
      to,
      subject,
      html: html || shell(subject, text || ''),
      text: text || undefined,
    });
    logger.info(`Mail sent to ${to}: ${subject}${info?.messageId ? '' : ' (console transport)'}`);
    return true;
  } catch (err) {
    logger.error(`Mail failed to ${to}: ${err.message}`);
    return false;
  }
}

export const mails = {
  welcome: (user) =>
    sendMail({
      to: user.email,
      subject: 'Welcome to Vimuhet',
      html: shell(
        `Welcome, ${user.fullName.split(' ')[0]}`,
        `<p>Your Vimuhet account is ready. Explore our latest kurtis, kurti sets and designer ethnic wear.</p>
         <p style="margin-top:20px"><a href="${env.frontendUrl}/shop" style="background:#78152F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px">Start shopping</a></p>`
      ),
    }),

  resetPassword: (email, token) =>
    sendMail({
      to: email,
      subject: 'Reset your Vimuhet password',
      html: shell(
        'Reset your password',
        `<p>We received a request to reset your password. This link expires in 30 minutes.</p>
         <p style="margin-top:20px"><a href="${env.frontendUrl}/reset-password/${token}" style="background:#78152F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px">Reset password</a></p>
         <p style="margin-top:16px;font-size:12px">If you did not request this, you can safely ignore this email.</p>`
      ),
    }),

  verifyEmail: (email, token) =>
    sendMail({
      to: email,
      subject: 'Verify your Vimuhet email',
      html: shell(
        'Verify your email',
        `<p>Please confirm your email address to secure your account.</p>
         <p style="margin-top:20px"><a href="${env.frontendUrl}/verify-email/${token}" style="background:#78152F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px">Verify email</a></p>`
      ),
    }),

  orderPlaced: (order) =>
    sendMail({
      to: order.customer.email,
      subject: `Order ${order.orderNumber} confirmed`,
      html: shell(
        `Thank you, ${order.customer.fullName.split(' ')[0]}`,
        `<p>Your order <strong>${order.orderNumber}</strong> has been received and is being prepared.</p>
         <p>Amount paid: <strong>₹${order.pricing.total.toLocaleString('en-IN')}</strong></p>
         <p style="margin-top:20px"><a href="${env.frontendUrl}/account/orders/${order._id}" style="background:#78152F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px">Track order</a></p>`
      ),
    }),

  orderStatus: (order, status) =>
    sendMail({
      to: order.customer.email,
      subject: `Order ${order.orderNumber} — ${status}`,
      html: shell(`Order update: ${status}`, `<p>Your order <strong>${order.orderNumber}</strong> is now <strong>${status}</strong>.</p>`),
    }),

  lowStock: (product, variant) =>
    sendMail({
      to: env.seed.adminEmail,
      subject: `Low stock: ${product.name}`,
      html: shell('Low stock alert', `<p>${product.name} (${variant.size}/${variant.color}) has only <strong>${variant.stock}</strong> units left.</p>`),
    }),

  backInStock: (email, product) =>
    sendMail({
      to: email,
      subject: `${product.name} is back in stock`,
      html: shell('Back in stock', `<p>Good news — <strong>${product.name}</strong> is available again.</p>
        <p style="margin-top:20px"><a href="${env.frontendUrl}/product/${product.slug}" style="background:#78152F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:13px">Shop now</a></p>`),
    }),

  contactAck: (msg) =>
    sendMail({
      to: msg.email,
      subject: 'We received your message',
      html: shell('Thanks for writing in', `<p>Hi ${msg.name}, our care team will reply within 24 hours.</p><p style="color:#756A66">Subject: ${msg.subject}</p>`),
    }),
};

export default sendMail;
