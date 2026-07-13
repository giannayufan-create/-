import { format } from 'date-fns';

export async function syncOrderToSheet(accessToken: string, spreadsheetId: string, orderData: any) {
  if (!spreadsheetId) return;

  const range = 'Orders!A:H';
  const values = [[
    orderData.id,
    format(new Date(orderData.createdAt), 'yyyy/MM/dd HH:mm'),
    orderData.customerName,
    orderData.customerPhone,
    orderData.customerEmail,
    orderData.shippingAddress,
    orderData.items.map((i: any) => `${i.name}×${i.quantity}`).join('、'),
    orderData.total,
  ]];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
  if (!res.ok) console.error('試算表同步失敗', await res.text());
}
