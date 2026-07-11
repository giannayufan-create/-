// Google Sheets API Wrapper
export async function syncOrderToSheet(accessToken: string, spreadsheetId: string, orderData: any) {
  if (!spreadsheetId) return;

  // We write to "Orders" sheet (or Sheet1 by default)
  // Data: OrderId, Date, CustomerEmail, Total, Items
  const range = 'Orders!A:E';
  
  const values = [
    [
      orderData.id,
      new Date().toISOString(),
      orderData.customerEmail,
      orderData.total,
      orderData.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')
    ]
  ];

  try {
    // First, check if the sheet "Orders" exists by attempting to get it.
    // In a robust implementation we'd create it if it doesn't, but here we append and hope it exists.
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });
    
    if (!res.ok) {
      console.error('Failed to sync to Sheets', await res.text());
    }
  } catch (error) {
    console.error('Sheets Sync Error:', error);
  }
}

// Gmail API Wrapper
export async function sendOrderEmail(accessToken: string, toEmail: string, orderData: any, pdfBase64: string) {
  const boundary = 'foo_bar_baz';
  
  const emailLines = [
    `To: ${toEmail}`,
    `Subject: Your Order Confirmation #${orderData.id}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    `Thank you for your order! Your total is $${orderData.total}.`,
    'Please find your receipt attached.',
    '',
    `--${boundary}`,
    'Content-Type: application/pdf; name="receipt.pdf"',
    'Content-Disposition: attachment; filename="receipt.pdf"',
    'Content-Transfer-Encoding: base64',
    '',
    pdfBase64, // Already base64 encoded by jspdf
    '',
    `--${boundary}--`
  ];

  const emailRaw = emailLines.join('\r\n');
  const encodedEmail = btoa(emailRaw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });
    
    if (!res.ok) {
      console.error('Failed to send email', await res.text());
    }
  } catch (error) {
    console.error('Gmail Send Error:', error);
  }
}
