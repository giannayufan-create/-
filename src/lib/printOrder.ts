/** 開啟可列印的廚房／出貨單（繁中） */
export function printOrderSlip(order: any, storeName = '滷味小哥') {
  const statusMap: Record<string, string> = {
    pending: '待處理',
    processing: '處理中',
    processed: '已完成',
    cancelled: '已取消',
  };
  const items = (order.items || [])
    .map(
      (i: any) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${escapeHtml(i.name)}</td><td style="text-align:center;padding:6px 0;border-bottom:1px solid #eee">${i.quantity}</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #eee">$${(i.price || 0) * (i.quantity || 0)}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>訂單 ${order.id?.slice(0, 8) || ''}</title>
<style>
  body{font-family:"Microsoft JhengHei","PingFang TC",sans-serif;padding:24px;color:#222;max-width:420px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#666;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  .total{font-size:18px;font-weight:bold;margin-top:12px;text-align:right}
  .note{margin-top:16px;padding:10px;background:#f7f3ee;border-radius:8px;font-size:13px}
  @media print{button{display:none}}
</style></head><body>
  <h1>${escapeHtml(storeName)} · 出貨單</h1>
  <p class="muted">#${escapeHtml(String(order.id || '').slice(0, 10))} · ${statusMap[order.status] || order.status || ''} · ${order.createdAt ? new Date(order.createdAt).toLocaleString('zh-TW') : ''}</p>
  <p><strong>客戶</strong> ${escapeHtml(order.customerName || '')}　${escapeHtml(order.customerPhone || '')}</p>
  <p><strong>地址</strong> ${escapeHtml(order.shippingAddress || '')}</p>
  <p><strong>配送</strong> ${escapeHtml(order.deliveryDate || '')} ${escapeHtml(order.deliveryTime || '')}　${escapeHtml(order.deliveryMethod || '')}</p>
  <p><strong>付款</strong> ${escapeHtml(order.paymentMethod || '')}</p>
  <table><thead><tr><th style="text-align:left">品項</th><th>數量</th><th style="text-align:right">小計</th></tr></thead><tbody>${items}</tbody></table>
  <p class="total">合計 $${order.total ?? 0}</p>
  ${order.adminNote ? `<div class="note"><strong>內部備註</strong><br>${escapeHtml(order.adminNote)}</div>` : ''}
  <p style="margin-top:24px"><button onclick="window.print()">列印</button></p>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=480,height=700');
  if (!w) {
    alert('請允許彈出視窗以列印訂單');
    return;
  }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
