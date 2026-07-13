import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { ADMIN_EMAILS } from '../types';
import { OrderData, buildOrderEmailText } from './orderExport';
import { syncOrderToSheet } from './google';
import { getAccessToken } from './firebase';
import { loadSettings } from './settingsCache';

export async function sendWeb3Form(accessKey: string, payload: Record<string, string>) {
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ access_key: accessKey.trim(), ...payload }),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Email 服務回應異常 (${res.status})`);
  }
  if (data?.success !== true) {
    throw new Error(data?.message || data?.body?.message || `Email 發送失敗 (${res.status})`);
  }
}

export async function testOrderEmail(accessKey: string, adminEmail: string, storeName: string) {
  await sendWeb3Form(accessKey, {
    subject: `【${storeName}】Email 測試信`,
    name: '系統測試',
    email: adminEmail,
    message: '這是一封測試信。若您收到此信，代表 Web3Forms 設定正確，之後有新訂單時會寄信到此信箱。',
  });
}

export async function notifyOrderPlaced(order: OrderData): Promise<{ emailSent: boolean; message: string }> {
  const settings = await loadSettings(true);
  const accessKey = (settings.web3formsAccessKey || import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '').trim();
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

  const token = getAccessToken();
  if (token && settings.spreadsheetId) {
    try { await syncOrderToSheet(token, settings.spreadsheetId, order); } catch (e) { console.warn(e); }
  }

  if (!accessKey) {
    return {
      emailSent: false,
      message: '訂單已成立！請至後台「前台與設定」填入 Web3Forms 金鑰以啟用 Email 通知。',
    };
  }

  const orderDetail = buildOrderEmailText(order, true);
  try {
    await sendWeb3Form(accessKey, {
      subject: `🛒【${storeName}】新訂單 #${order.id.slice(0, 8)} 金額 $${order.total}`,
      name: order.customerName,
      email: order.customerEmail || adminEmail,
      phone: order.customerPhone,
      message: orderDetail,
    });
    return {
      emailSent: true,
      message: '訂單已成立！通知信已寄至商家信箱，請至後台查看訂單通知。',
    };
  } catch (e: any) {
    console.warn('商家 Email 失敗:', e);
    return {
      emailSent: false,
      message: `訂單已成立！但 Email 通知失敗：${e?.message || '未知錯誤'}。請確認 Web3Forms 金鑰正確、已點擊啟用信，並檢查垃圾郵件匣。`,
    };
  }
}
