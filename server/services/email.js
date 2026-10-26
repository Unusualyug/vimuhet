import nodemailer from 'nodemailer';

let transporter;
function getTransport(){
  if(process.env.EMAIL_ENABLED!=='true'||!process.env.GMAIL_USER||!process.env.GMAIL_APP_PASSWORD)return null;
  return transporter??=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD},disableFileAccess:true,disableUrlAccess:true});
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const from=()=>`"${process.env.EMAIL_FROM_NAME||'VIMUHET'}" <${process.env.GMAIL_USER}>`;

export async function sendWelcome(to,name){
  const t=getTransport();if(!t)return{skipped:true};const safe=esc(name);
  return t.sendMail({from:from(),to,subject:'A warm welcome to VIMUHET',text:`Hello ${name}, welcome to VIMUHET — clothing that moves with you.`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Welcome, ${safe}.</h2><p>We're so glad you're here. Discover thoughtful pieces made for all the places life takes you.</p><p>Clothing that moves with you.</p></div>`});
}
export async function sendReset(to,name,url){
  const t=getTransport();if(!t)return{skipped:true};
  return t.sendMail({from:from(),to,subject:'Reset your VIMUHET password',text:`Hello ${name}, use this link within 30 minutes to reset your password: ${url}\nIf you did not request this, ignore this message.`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Password reset</h2><p>Hello ${esc(name)}, we received a request to reset your password.</p><p><a href="${esc(url)}" style="background:#292722;color:white;padding:14px 20px;text-decoration:none">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p></div>`});
}
export async function sendContactMessage({name,email,message}){
  const t=getTransport();if(!t||!process.env.ADMIN_EMAIL)throw Error('Support mailbox is not configured');
  return t.sendMail({from:from(),to:process.env.ADMIN_EMAIL,replyTo:email,subject:'VIMUHET website contact request',text:`From: ${name} <${email}>\n\n${message}`,html:`<div style="font-family:Arial;background:#f5efe4;padding:24px;color:#292722"><h2>Website contact request</h2><p><b>From:</b> ${esc(name)} (${esc(email)})</p><p>${esc(message).replace(/\n/g,'<br/>')}</p></div>`});
}
export async function sendNewsletterWelcome(to,token){
  const t=getTransport();if(!t)return{skipped:true};const url=`${process.env.CLIENT_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return t.sendMail({from:from(),to,subject:'You’re on the VIMUHET list',text:`Thanks for subscribing to VIMUHET updates. Unsubscribe any time: ${url}`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Lovely to have you here.</h2><p>Thanks for choosing to receive our occasional styling notes and new-drop updates.</p><p><a href="${esc(url)}">Unsubscribe from marketing emails</a></p></div>`});
}
export async function sendOrder(to,order){
  const t=getTransport();if(!t)return{skipped:true};
  const lines=order.items.map(i=>`${i.name}${i.size?` · Size ${i.size}`:''}${i.color?` · ${i.color}`:''} × ${i.quantity} — ₹${i.unitPrice*i.quantity}`).join('\n');
  const list=order.items.map(i=>`<li>${esc(i.name)}${i.size?` · Size ${esc(i.size)}`:''}${i.color?` · ${esc(i.color)}`:''} × ${i.quantity} — ₹${i.unitPrice*i.quantity}</li>`).join('');
  const sh=order.shipping||{},address=[sh.name,sh.line1,sh.line2,sh.city,sh.state,sh.pincode,sh.phone].filter(Boolean).join(', ');
  return t.sendMail({from:from(),to,subject:`Order ${order.number} update: ${order.status} / ${order.paymentStatus}`,text:`Order ${order.number}\nStatus: ${order.status}\nPayment: ${order.paymentStatus}\n${lines}\nSubtotal: ₹${order.subtotal}\nShipping: ₹${order.shippingFee}\nTotal: ₹${order.total}\nShip to: ${address}`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Order update</h2><p>Order ${esc(order.number)} · ${esc(order.status)} · payment ${esc(order.paymentStatus)}</p><ul>${list}</ul><p>Subtotal ₹${order.subtotal} · Shipping ₹${order.shippingFee}</p><strong>Total ₹${order.total}</strong><p>Shipping to: ${esc(address)}</p><p>We'll keep you posted as your order moves along.</p></div>`});
}
export async function sendStockAlert(to,{productName,url,unsubscribeUrl}){
  const t=getTransport();if(!t)return{skipped:true};
  return t.sendMail({from:from(),to,subject:`Back in stock: ${productName}`,text:`${productName} is available again. Shop now: ${url}\nStop these stock alerts: ${unsubscribeUrl}`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Back in stock</h2><p>${esc(productName)} is available again.</p><p><a href="${esc(url)}" style="background:#292722;color:#fff;padding:14px 20px;text-decoration:none">View the piece</a></p><p style="font-size:12px"><a href="${esc(unsubscribeUrl)}">Stop these stock alerts</a></p></div>`});
}
export async function sendCartReminder(to,{name,url,unsubscribeUrl}){
  const t=getTransport();if(!t)return{skipped:true};
  return t.sendMail({from:from(),to,subject:'Your VIMUHET bag is waiting',text:`Hello ${name}, your saved VIMUHET bag is still available to review: ${url}\nStop cart reminders: ${unsubscribeUrl}`,html:`<div style="font-family:Arial;background:#f5efe4;padding:32px;color:#292722"><h1 style="font-family:Georgia">VIMUHET ✳</h1><h2>Your bag is still here.</h2><p>Hello ${esc(name)}, your saved bag is waiting if you would like to take another look.</p><p><a href="${esc(url)}" style="background:#292722;color:#fff;padding:14px 20px;text-decoration:none">View my bag</a></p><p style="font-size:12px"><a href="${esc(unsubscribeUrl)}">Stop cart reminders</a></p></div>`});
}
