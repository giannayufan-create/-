import { format } from 'date-fns';
import { CartItem } from '../types';

export interface OrderData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  billingAddress: string;
  shippingAddress: string;
  deliveryDate?: string;
  deliveryTime?: string;
  items: CartItem[];
  total: number;
  createdAt: string;
}

export function buildOrderCsv(order: OrderData): string {
  const rows = [
    ['訂單編號', order.id],
    ['下單時間', format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')],
    ['客戶姓名', order.customerName],
    ['聯絡電話', order.customerPhone],
    ['Email', order.customerEmail || ''],
    ['送貨地址', order.shippingAddress],
    ['配送日期', order.deliveryDate || '—'],
    ['配送時間', order.deliveryTime || '—'],
    ['', ''],
    ['項次', '商品名稱', '單價', '數量', '小計'],
    ...order.items.map((item, i) => [
      String(i + 1),
      item.name,
      String(item.price),
      String(item.quantity),
      String(item.price * item.quantity),
    ]),
    ['', '', '', '總計', String(order.total)],
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function downloadOrderCsv(order: OrderData) {
  const csv = buildOrderCsv(order);
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `訂單_${order.id.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildOrderEmailText(order: OrderData, forAdmin: boolean): string {
  const lines = [
    forAdmin ? '【管理員通知】您有一筆新訂單' : '【訂單確認】感謝您的訂購',
    '',
    `訂單編號：#${order.id.slice(0, 8)}`,
    `下單時間：${format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm')}`,
    `客戶姓名：${order.customerName}`,
    `聯絡電話：${order.customerPhone}`,
    `Email：${order.customerEmail || '—'}`,
    `送貨地址：${order.shippingAddress}`,
    `配送日期：${order.deliveryDate || '—'}`,
    `配送時間：${order.deliveryTime || '—'}`,
    '',
    '── 訂購明細 ──',
    ...order.items.map((item, i) =>
      `${i + 1}. ${item.name}  ×  ${item.quantity} 份  @ $${item.price}  =  $${item.price * item.quantity}`
    ),
    '',
    `總計金額：$${order.total}`,
    '',
    forAdmin ? '請至管理後台處理此訂單。' : '我們將盡快為您備貨出貨，如有問題請來電聯繫。',
  ];
  return lines.join('\n');
}

export function downloadAdminOrdersCsv(orders: any[], filename: string) {
  if (!orders.length) return;
  const STATUS: Record<string, string> = { pending: '待處理', processing: '處理中', processed: '已完成', cancelled: '已取消' };
  const headers = ['訂單編號', '狀態', '下單時間', '配送日期', '配送時間', '客戶', '電話', 'Email', '地址', '商品明細', '總計'];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    STATUS[o.status] || o.status,
    format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm'),
    o.deliveryDate || '',
    o.deliveryTime || '',
    o.customerName,
    o.customerPhone,
    o.customerEmail || '',
    o.shippingAddress,
    (o.items || []).map((i: any) => `${i.name}×${i.quantity}`).join('、'),
    String(o.total),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function downloadOrdersListCsv(orders: OrderData[], filename: string) {
  if (!orders.length) return;
  const headers = ['訂單編號', '下單時間', '配送日期', '配送時間', '客戶', '電話', '地址', '商品明細', '總計'];
  const rows = orders.map((o) => [
    o.id.slice(0, 8),
    format(new Date(o.createdAt), 'yyyy/MM/dd HH:mm'),
    o.deliveryDate || '',
    o.deliveryTime || '',
    o.customerName,
    o.customerPhone,
    o.shippingAddress,
    o.items.map((i) => `${i.name}×${i.quantity}`).join('、'),
    String(o.total),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
