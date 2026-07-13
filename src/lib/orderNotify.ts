import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { ADMIN_EMAILS } from '../types';
import { OrderData, buildOrderEmailText } from './orderExport';
import { syncOrderToSheet } from './google';
import { getAccessToken } from './firebase';
import { getSettingsSnapshot } from './settingsCache';


async function sendWeb3Form(accessKey: string, payload: Record<string, string>) {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: accessKey, ...payload }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Email 發送失敗');
}

export async function notifyOrderPlaced(order: OrderData): Promise<{ emailSent: boolean; message: string }> {
  const settings = getSettingsSnapshot();
  const accessKey = settings.web3formsAccessKey || import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '';
  const adminEmail = settings.adminEmail || ADMIN_EMAILS[0];
  const storeName = settings.storeName || '滷味小哥';

  await addDoc(collection(db, 'notifications'), {
    type: 'new_order',
    orderId: order.id,
    title: `新訂單 #${order.id.slice(0, 8)}`,
    body: buildOrderEmailText(order, true),
    read: false,
    createdAt: new Date().toISOString(),
  });

  let emailSent = false;
  const orderDetail = buildOrderEmailText(order, true);

  if (accessKey) {
    try {
      await sendWeb3Form(accessKey, {
        subject: `🛒【${storeName}】新訂單 #${order.id.slice(0, 8)} 金額 $${order.total}`,
        from_name: order.customerName,
        email: order.customerEmail || adminEmail,
        phone: order.customerPhone,
        message: orderDetail,
        botcheck: '',
      });
      emailSent = true;
    } catch (e) {
      console.warn('商家 Email 失敗:', e);
    }

    if (order.customerEmail) {
      try {
        await sendWeb3Form(accessKey, {
          subject: `✅【${storeName}】訂單確認 #${order.id.slice(0, 8)}`,
          from_name: storeName,
          email: order.customerEmail,
          name: order.customerName,
          message: buildOrderEmailText(order, false),
          botcheck: '',
        });
      } catch (e) {
        console.warn('客戶 Email 失敗:', e);
      }
    }
  }

  const token = getAccessToken();
  if (token && settings.spreadsheetId) {
    try { await syncOrderToSheet(token, settings.spreadsheetId, order); } catch (e) { console.warn(e); }
  }

  if (emailSent) {
    return { emailSent: true, message: '訂單已成立！Email 通知已寄出給商家與客戶。' };
  }
  return {
    emailSent: false,
    message: '訂單已成立！請至後台「網站設定」填入 Web3Forms 金鑰以啟用 Email 通知。',
  };
}
