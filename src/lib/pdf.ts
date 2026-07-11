import jsPDF from 'jspdf';

export function generateReceiptPDF(orderData: any): string {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text('Order Receipt', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Order ID: ${orderData.id}`, 20, 30);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 40);
  
  let y = 60;
  doc.setFontSize(14);
  doc.text('Items:', 20, y);
  y += 10;
  
  doc.setFontSize(12);
  orderData.items.forEach((item: any) => {
    doc.text(`${item.quantity}x ${item.name}`, 20, y);
    doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 150, y);
    y += 10;
  });
  
  y += 10;
  doc.setFontSize(16);
  doc.text(`Total: $${orderData.total.toFixed(2)}`, 20, y);
  
  // Output as data URI, strip the 'data:application/pdf;filename=generated.pdf;base64,' part
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}
