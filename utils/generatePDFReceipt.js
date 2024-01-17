import PDFDocument from 'pdfkit';
import fs from 'fs';

const generatePDFReceipt = async (order) => {
  const pdfPath = `./receipts/receipt_${order.receipt}.pdf`;

  const pdfDoc = new PDFDocument();
  pdfDoc.pipe(fs.createWriteStream(pdfPath));

  // Customize the content of the PDF receipt
  pdfDoc.fontSize(12).text(`Order ID: ${order.receipt}`);
  pdfDoc.fontSize(12).text(`Amount: ${order.amount / 100} ${order.currency}`);
  // ... add more details as needed ...

  pdfDoc.end();

  return {
    filename: 'receipt.pdf',
    path: pdfPath,
  };
};

export default generatePDFReceipt;