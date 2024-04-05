import PDFDocument from 'pdfkit';
import fs from 'fs';
import sharp from 'sharp';
import path from 'path';

const generatePDFReceipt = async (order) => {
  const pdfPath = `./receipts/receipt_${order.receipt}.pdf`;
  const pdfDoc = new PDFDocument({ margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  pdfDoc.pipe(fs.createWriteStream(pdfPath));

  // Add header
  // const __dirname = path.dirname(new URL(import.meta.url).pathname);
  // const logoFilePath = path.resolve(__dirname, './Logo.webp');
  // const logoBuffer = await sharp(logoFilePath).toBuffer();
  // pdfDoc.image(logoBuffer, 50, 20, { width: 100 });

  // const imgUrl = '../assets/logo left.png';

  // pdfDoc.image(imgUrl, 50, 20, {
  //   align: 'left',
  // })

  pdfDoc.fontSize(18).text('IndiaMUN', 170, 40);

  // Define the position and dimensions of the box
  const boxX = 50;
  const boxY = 100;
  const boxWidth = 400;
  const boxHeight = 200;

  // Draw the box
  pdfDoc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

  // Add text inside the box
  pdfDoc.text('This is text inside the box', boxX + 20, boxY + 40);

  // Add order details
  pdfDoc.fontSize(14).text(`Order ID: ${order.receipt}`, 50, 100);
  pdfDoc.fontSize(14).text(`Amount: ${order.amount / 100} ${order.currency}`, 50, 120);

  // ... (rest of the code)

  // Add footer
  const footerText = 'Thank you for your business!';
  pdfDoc.fontSize(10).text(footerText, 50, pdfDoc.page.height - 50, { align: 'center' });

  pdfDoc.end();
  return { filename: 'receipt.pdf', path: pdfPath };
};

export default generatePDFReceipt;