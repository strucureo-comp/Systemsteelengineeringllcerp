import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  getPDFSettings, 
  type PDFSettings
} from './pdf-settings';
import { 
  hexToRgb, 
  amountInWords, 
  formatCurrency, 
  formatCurrencyRaw,
  logoToBase64, 
  getCurrentRunTimestamp 
} from './pdf-utils';

// --- TYPES ---
type AnyRecord = any; 

// --- CONSTANTS ---
const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - (PAGE_MARGIN * 2);

// --- SHARED HELPERS ---

const setupDocument = () => {
  const doc = new jsPDF({ 
    orientation: 'portrait', 
    unit: 'mm', 
    format: 'a4' 
  });
  return doc;
};

const drawCompanyStamp = async (doc: jsPDF, yPos: number, settings: PDFSettings) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  
  const stampX = PAGE_MARGIN;
  
  // Draw signature image if exists
  if (settings.authorizedSignature) {
    try {
      const sigData = await logoToBase64(settings.authorizedSignature);
      // Place signature above or near the stamp text
      doc.addImage(sigData, 'PNG', stampX, yPos - 15, 35, 15);
    } catch (e) {
      console.warn("Signature load failed", e);
    }
  }

  doc.text(settings.companyName, stampX, yPos);
  
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(settings.companyAddress, 100);
  doc.text(addressLines, stampX, yPos + 4);
  
  const trnY = yPos + 4 + (addressLines.length * 3.5);
  doc.text(`TRN: ${settings.companyTRN}`, stampX, trnY);
  
  return trnY + 5;
};

const drawHeader = async (doc: jsPDF, title: string, settings: PDFSettings, record: AnyRecord, docType: string) => {
  // 1. LOGO: Centered at top
  const logoSize = 30;
  if (settings.logoUrl) {
    try {
      const logoData = await logoToBase64(settings.logoUrl);
      const centerX = (PAGE_WIDTH - logoSize) / 2;
      doc.addImage(logoData, 'PNG', centerX, PAGE_MARGIN, logoSize, logoSize); 
    } catch (e) {
      console.warn("Logo load failed", e);
    }
  }

  // 2. COMPANY INFO: Top Left
  let yPos = PAGE_MARGIN + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  
  const addressLines = doc.splitTextToSize(settings.companyAddress, 70);
  doc.text(addressLines, PAGE_MARGIN, yPos);
  yPos += (addressLines.length * 3);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`TRN: ${settings.companyTRN}`, PAGE_MARGIN, yPos);
  
  const infoStartY = PAGE_MARGIN + logoSize + 10;

  // --- TOP RIGHT: Title & Doc Info ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, PAGE_WIDTH - PAGE_MARGIN - titleWidth, PAGE_MARGIN + 8);

  const infoBoxY = PAGE_MARGIN + 15;
  const infoBoxWidth = 85;
  const infoBoxX = PAGE_WIDTH - PAGE_MARGIN - infoBoxWidth;
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.1);
  doc.rect(infoBoxX, infoBoxY, infoBoxWidth, 40);

  doc.setFontSize(8);
  const leftX = infoBoxX + 2;
  const rightX = infoBoxX + 38;
  let infoY = infoBoxY + 5;
  const lineHeight = 4.5;

  const labels: any[] = [];
  const values: any[] = [];

  if (docType === 'PO') {
    labels.push('P.O. No', 'P.O. Type', 'Project', 'Date', 'ETA', 'Quotation No', 'Rev No', 'Rev Date');
    values.push(record.number, record.type || 'Standard', record.project || '-', record.date, record.expectedDate, record.quotationRef, record.revNo, record.revDate);
  } else if (docType === 'INVOICE') {
    labels.push('Invoice No', 'Date', 'Due Date', 'Payment Terms', 'Project', 'PO Ref');
    values.push(record.number, record.date, record.dueDate, record.paymentTerms || settings.defaultPaymentTerms, record.project || '-', record.poRef);
  } else if (docType === 'QUOTATION') {
    labels.push('Quotation No', 'Date', 'Valid Until', 'Rev No', 'Rev Date');
    values.push(record.number, record.date, record.validUntil, record.revNo, record.revDate);
  } else if (docType === 'DN') {
    labels.push('DN No', 'Date', 'Order Ref', 'Method', 'Vehicle/Courier');
    values.push(record.number, record.date, record.orderRef || record.poRef, record.deliveryMethod, record.vehicleDetails || record.vehicleNumber);
  } else if (docType === 'BILL') {
    labels.push('Bill No', 'Date', 'Supplier Ref', 'Due Date');
    values.push(record.number, record.date, record.supplierRef, record.dueDate);
  } else if (docType === 'VOUCHER') {
    labels.push('Voucher No', 'Date', 'Method', 'Ref No');
    values.push(record.number, record.date, record.paymentMethod, record.reference);
  }

  labels.forEach((label, i) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', leftX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.text(String(values[i] || ''), rightX, infoY);
    infoY += lineHeight;
  });

  return Math.max(infoStartY, infoY + 5);
};

const drawRecipientBlock = (doc: jsPDF, yPos: number, leftTitle: string, rightTitle: string, leftData: any, rightData: any) => {
  const boxHeight = 35;
  const boxWidth = (CONTENT_WIDTH / 2) - 2;
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(PAGE_MARGIN, yPos, boxWidth, boxHeight);
  doc.rect(PAGE_MARGIN + boxWidth + 4, yPos, boxWidth, boxHeight);

  const fillBox = (x: number, title: string, data: any) => {
    let currY = yPos + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, x + 2, currY);
    currY += 5;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    if (data?.name) {
      doc.setFont('helvetica', 'bold');
      doc.text(data.name, x + 2, currY);
      doc.setFont('helvetica', 'normal');
      currY += 4;
    }
    
    if (data?.address) {
      const lines = doc.splitTextToSize(data.address, boxWidth - 4);
      doc.text(lines, x + 2, currY);
      currY += (lines.length * 3.5);
    }
    
    if (data?.trn) { doc.text(`TRN: ${data.trn}`, x + 2, currY); currY += 3.5; }
    // VENDOR PHONE: Unicode symbol \u260E
    if (data?.phone) { doc.text(`\u260E ${data.phone}`, x + 2, currY); currY += 3.5; }
    if (data?.email) { doc.text(`Email: ${data.email}`, x + 2, currY); }
  };

  fillBox(PAGE_MARGIN, leftTitle, leftData);
  fillBox(PAGE_MARGIN + boxWidth + 4, rightTitle, rightData);

  return yPos + boxHeight + 5;
};

const drawFooter = (doc: jsPDF, settings: PDFSettings, record: AnyRecord) => {
  const pageCount = doc.getNumberOfPages();
  const timestamp = getCurrentRunTimestamp();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = PAGE_HEIGHT - 12;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(PAGE_MARGIN, footerY - 4, PAGE_WIDTH - PAGE_MARGIN, footerY - 4);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    
    // Line 1: 4 Zones
    const zoneWidth = CONTENT_WIDTH / 4;
    doc.text(`RUN: ${timestamp}`, PAGE_MARGIN, footerY);
    doc.text(`Page ${i} / ${pageCount}`, PAGE_MARGIN + zoneWidth, footerY);
    doc.text(`Operator: ${record.createdBy || 'Admin'}`, PAGE_MARGIN + (zoneWidth * 2), footerY);
    doc.text(`Created: ${record.date} | User: ${record.createdBy || 'Admin'}`, PAGE_WIDTH - PAGE_MARGIN, footerY, { align: 'right' });
    
    // Line 2: Auditor Approved
    doc.text("Auditor Approved", PAGE_WIDTH / 2, footerY + 4, { align: 'center' });
    
    // Line 3: Computer generated disclaimer
    doc.text("This is a computer-generated document. No signature is required", PAGE_WIDTH / 2, footerY + 8, { align: 'center' });
  }
};

const drawTerms = (doc: jsPDF, finalY: number, settings: PDFSettings) => {
  if (finalY > 200) {
    doc.addPage();
    finalY = PAGE_MARGIN + 10;
  } else {
    finalY += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('TERMS & CONDITIONS:', PAGE_MARGIN, finalY);
  finalY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  settings.termsAndConditions.forEach((term, index) => {
    if (index === 7) { // Clause 8: Horizontal Row
      doc.setFont('helvetica', 'bold');
      const rowText = "Mode of Transport: N/A   |   Warranty: N/A   |   Make: N/A   |   Origin: N/A";
      doc.text(rowText, PAGE_MARGIN, finalY);
      doc.setFont('helvetica', 'normal');
      finalY += 4;
    } else {
      const text = `${index + 1}. ${term}`;
      const splitText = doc.splitTextToSize(text, CONTENT_WIDTH);
      doc.text(splitText, PAGE_MARGIN, finalY);
      finalY += (splitText.length * 3.5);
    }
  });
  
  return finalY;
};

const drawSignatories = (doc: jsPDF, finalY: number, settings: PDFSettings) => {
  if (finalY > 230) {
    doc.addPage();
    finalY = PAGE_MARGIN + 20;
  } else {
    finalY += 10;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("Buyer contact:", PAGE_MARGIN, finalY);
  doc.text("Store Incharge:", PAGE_WIDTH / 2, finalY);
  finalY += 15;

  const colWidth = CONTENT_WIDTH / 4;
  const roles = [
    { name: settings.signatories.procurement, role: 'Procurement' },
    { name: settings.signatories.procurementManager, role: 'Procurement Manager' },
    { name: settings.signatories.vicePresident, role: 'Vice President' },
    { name: settings.signatories.ceo, role: 'CEO' }
  ];

  roles.forEach((signer, i) => {
    const x = PAGE_MARGIN + (i * colWidth);
    doc.setDrawColor(0, 0, 0);
    doc.line(x, finalY, x + colWidth - 5, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(signer.name, x, finalY - 2);
    
    // SIGNATORY BLOCK: 12mm blank space
    doc.setFont('helvetica', 'bold');
    doc.text(signer.role, x, finalY + 12); 
  });
  
  return finalY + 20;
};

const drawFinancialSummary = (doc: jsPDF, record: AnyRecord, settings: PDFSettings, finalY: number) => {
  const currency = settings.currency;
  
  // Amount in Words
  const amountWords = amountInWords(record.total, currency);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(amountWords, PAGE_MARGIN, finalY + 5);
  
  // CONTACT PERSON FIELD
  doc.setFont('helvetica', 'normal');
  doc.text("Contact Person: ___________________________", PAGE_MARGIN, finalY + 12);
  
  const rightX = PAGE_WIDTH - PAGE_MARGIN;
  let currY = finalY;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Untaxed Amount:", rightX - 40, currY, { align: 'right' });
  doc.text(formatCurrency(record.subtotal || 0, currency), rightX, currY, { align: 'right' });
  currY += 5;
  
  doc.text(settings.taxLabel, rightX - 40, currY, { align: 'right' });
  doc.text(formatCurrency(record.taxAmount || 0, currency), rightX, currY, { align: 'right' });
  currY += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text("Total:", rightX - 40, currY, { align: 'right' });
  doc.text(formatCurrency(record.total || 0, currency), rightX, currY, { align: 'right' });
  
  return currY + 15;
};

// --- MAIN GENERATORS ---

export const generateSalesInvoicePDF = async (invoice: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "TAX INVOICE", settings, invoice, 'INVOICE');
  startY = drawRecipientBlock(doc, startY, "BILL TO", "SHIP TO", invoice, invoice);
  
  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'Project', 'Date Req.', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.items?.map((item: any, i: number) => [
      i + 1, item.description, invoice.project || '-', invoice.date, item.unit || 'EA', item.quantity, 
      formatCurrencyRaw(item.unitPrice, settings.currency), 
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  finalY = drawFinancialSummary(doc, invoice, settings, finalY);
  
  // Stamp before footer on page 1
  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  
  drawFooter(doc, settings, invoice);
  doc.save(`Invoice_${invoice.number}.pdf`);
};

export const generatePurchaseOrderPDF = async (purchaseOrder: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "CONFIRMATORY PURCHASE ORDER", settings, purchaseOrder, 'PO');
  const vendor = { name: purchaseOrder.supplierName, address: purchaseOrder.supplierAddress, phone: purchaseOrder.supplierPhone, trn: purchaseOrder.supplierVat };
  startY = drawRecipientBlock(doc, startY, "VENDOR", "SHIP TO", vendor, { name: settings.companyName, address: settings.companyAddress });
  
  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'Project', 'Remarks', 'Date Req.', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: purchaseOrder.items?.map((item: any, i: number) => [
      i + 1, `${item.itemCode ? `[${item.itemCode}]\n` : ''}${item.description}`, purchaseOrder.project || '-', item.remarks || '', purchaseOrder.expectedDate, item.unit || 'EA', item.quantity,
      formatCurrencyRaw(item.unitPrice, settings.currency),
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  finalY = drawFinancialSummary(doc, purchaseOrder, settings, finalY);
  finalY = drawTerms(doc, finalY, settings);
  
  // Stamp
  await drawCompanyStamp(doc, PAGE_HEIGHT - 45, settings);
  
  drawSignatories(doc, finalY, settings);
  drawFooter(doc, settings, purchaseOrder);
  doc.save(`PO_${purchaseOrder.number}.pdf`);
};

export const generateProformaInvoicePDF = async (proforma: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "PROFORMA INVOICE", settings, proforma, 'QUOTATION');
  startY = drawRecipientBlock(doc, startY, "BILL TO", "SHIP TO", proforma, proforma);
  
  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: proforma.items?.map((item: any, i: number) => [
      i + 1, item.description, item.unit || 'EA', item.quantity, 
      formatCurrencyRaw(item.unitPrice, settings.currency),
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  drawFinancialSummary(doc, proforma, settings, finalY);
  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, proforma);
  doc.save(`Proforma_${proforma.number}.pdf`);
};

export const generateQuotationPDF = async (quotation: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "QUOTATION", settings, quotation, 'QUOTATION');
  startY = drawRecipientBlock(doc, startY, "QUOTED TO", "DELIVER TO", quotation, quotation);

  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: quotation.items?.map((item: any, i: number) => [
      i + 1, item.description, item.unit || 'EA', item.quantity,
      formatCurrencyRaw(item.unitPrice, settings.currency),
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  finalY = drawFinancialSummary(doc, quotation, settings, finalY);
  finalY = drawTerms(doc, finalY, settings);
  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, quotation);
  doc.save(`Quotation_${quotation.number}.pdf`);
};

// Create a quotation PDF document for preview (without saving)
export const createQuotationDoc = async (quotation: any, _client?: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "QUOTATION", settings, quotation, 'QUOTATION');
  startY = drawRecipientBlock(doc, startY, "QUOTED TO", "DELIVER TO", quotation, quotation);

  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: quotation.items?.map((item: any, i: number) => [
      i + 1, item.description, item.unit || 'EA', item.quantity,
      formatCurrencyRaw(item.unitPrice, settings.currency),
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  finalY = drawFinancialSummary(doc, quotation, settings, finalY);
  finalY = drawTerms(doc, finalY, settings);
  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, quotation);

  return doc;
};

export const generateDeliveryNotePDF = async (deliveryNote: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "DELIVERY NOTE", settings, deliveryNote, 'DN');
  
  const recipientData = {
    name: deliveryNote.customerName,
    address: deliveryNote.customerAddress,
    phone: deliveryNote.customerContact
  };
  
  startY = drawRecipientBlock(doc, startY, "DELIVER TO / RECIPIENT", "SITE DETAILS / LOGISTICS", recipientData, {
      name: deliveryNote.courierName || 'In-House Delivery',
      address: `Origin: ${deliveryNote.warehouseOrigin || 'Main Warehouse'}\nMethod: ${deliveryNote.deliveryMethod || 'Vehicle'}\nVehicle: ${deliveryNote.vehicleDetails || 'Standard'}`
  });
  
  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'SKU', 'Description', 'UOM', 'Qty Delivered', 'Weight/Size']],
    body: deliveryNote.items?.map((item: any, i: number) => [
      i + 1, item.sku || '-', item.description, item.unit || 'PCS', item.quantity, 
      `${item.weight || ''}${item.weight && item.size ? ' / ' : ''}${item.size || ''}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 4: { halign: 'center', fontStyle: 'bold' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Package Info Section
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text("PACKAGE INFORMATION:", PAGE_MARGIN, finalY);
  finalY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Parcels: ${deliveryNote.parcelCount || 1}  |  Total Weight: ${deliveryNote.totalWeight || '-'}  |  Dimensions: ${deliveryNote.dimensions || '-'}`, PAGE_MARGIN, finalY);
  finalY += 8;

  if (deliveryNote.specialInstructions) {
      doc.setFont('helvetica', 'bold');
      doc.text("SPECIAL INSTRUCTIONS:", PAGE_MARGIN, finalY);
      finalY += 4;
      doc.setFont('helvetica', 'normal');
      const instLines = doc.splitTextToSize(deliveryNote.specialInstructions, CONTENT_WIDTH);
      doc.text(instLines, PAGE_MARGIN, finalY);
      finalY += (instLines.length * 4) + 5;
  }

  // Acknowledgement Block
  if (finalY > 230) { doc.addPage(); finalY = PAGE_MARGIN + 10; }
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(PAGE_MARGIN, finalY, CONTENT_WIDTH, 35);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const ackSettings = settings.acknowledgement || { title: 'RECEIVER ACKNOWLEDGEMENT', signatureLabel: "Receiver's Signature / Stamp", nameLabel: 'Receiver Name', dateLabel: 'Date & Time' };
  doc.text(ackSettings.title, PAGE_WIDTH / 2, finalY + 6, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text("Received the above goods in good condition.", PAGE_MARGIN + 5, finalY + 12);
  
  doc.line(PAGE_MARGIN + 5, finalY + 25, PAGE_MARGIN + 60, finalY + 25);
  doc.text(ackSettings.signatureLabel, PAGE_MARGIN + 5, finalY + 28);
  
  doc.line(PAGE_WIDTH / 2, finalY + 25, (PAGE_WIDTH / 2) + 40, finalY + 25);
  if (deliveryNote.receiverName) {
      doc.setFont('helvetica', 'bold');
      doc.text(deliveryNote.receiverName, PAGE_WIDTH / 2, finalY + 24);
      doc.setFont('helvetica', 'normal');
  }
  doc.text(ackSettings.nameLabel, PAGE_WIDTH / 2, finalY + 28);
  
  doc.line(PAGE_WIDTH - PAGE_MARGIN - 45, finalY + 25, PAGE_WIDTH - PAGE_MARGIN - 5, finalY + 25);
  doc.setFont('helvetica', 'bold');
  doc.text(deliveryNote.date || new Date().toLocaleDateString(), PAGE_WIDTH - PAGE_MARGIN - 45, finalY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(ackSettings.dateLabel, PAGE_WIDTH - PAGE_MARGIN - 45, finalY + 28);

  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, deliveryNote);
  doc.save(`DN_${deliveryNote.number}.pdf`);
};

export const generatePurchaseBillPDF = async (purchaseBill: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  const primaryRgb = hexToRgb(settings.primaryColor) || { r: 0, g: 0, b: 0 };

  let startY = await drawHeader(doc, "PURCHASE BILL", settings, purchaseBill, 'BILL');
  const vendor = { name: purchaseBill.supplierName, address: purchaseBill.supplierAddress, phone: purchaseBill.supplierPhone, trn: purchaseBill.supplierVat };
  startY = drawRecipientBlock(doc, startY, "SUPPLIER", "BILL TO", vendor, { name: settings.companyName, address: settings.companyAddress });
  
  autoTable(doc, {
    startY: startY,
    head: [['SL.No', 'Description', 'UOM', 'Qty', 'Unit Price', 'Amount']],
    body: purchaseBill.items?.map((item: any, i: number) => [
      i + 1, item.description, item.unit || 'EA', item.quantity,
      formatCurrencyRaw(item.unitPrice, settings.currency),
      formatCurrencyRaw(item.total, settings.currency)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b] },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  drawFinancialSummary(doc, purchaseBill, settings, finalY);
  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, purchaseBill);
  doc.save(`Bill_${purchaseBill.number}.pdf`);
};

export const generatePaymentVoucherPDF = async (paymentVoucher: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  let startY = await drawHeader(doc, "PAYMENT VOUCHER", settings, paymentVoucher, 'VOUCHER');
  
  const boxY = startY + 10;
  doc.setDrawColor(0, 0, 0);
  doc.rect(PAGE_MARGIN, boxY, CONTENT_WIDTH, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Paid To:", PAGE_MARGIN + 2, boxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(paymentVoucher.payeeName || '', PAGE_MARGIN + 30, boxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text("Amount:", PAGE_MARGIN + 2, boxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(paymentVoucher.amount, settings.currency), PAGE_MARGIN + 30, boxY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text("In Words:", PAGE_MARGIN + 2, boxY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(amountInWords(paymentVoucher.amount, settings.currency), PAGE_MARGIN + 30, boxY + 22);
  
  let sigY = boxY + 60;
  doc.text("Prepared By", PAGE_MARGIN, sigY);
  doc.text("Approved By", PAGE_WIDTH / 2, sigY, { align: 'center' });
  doc.text("Received By", PAGE_WIDTH - PAGE_MARGIN, sigY, { align: 'right' });
  doc.line(PAGE_MARGIN, sigY - 2, PAGE_MARGIN + 40, sigY - 2);
  doc.line((PAGE_WIDTH / 2) - 20, sigY - 2, (PAGE_WIDTH / 2) + 20, sigY - 2);
  doc.line(PAGE_WIDTH - PAGE_MARGIN - 40, sigY - 2, PAGE_WIDTH - PAGE_MARGIN, sigY - 2);

  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, paymentVoucher);
  doc.save(`PV_${paymentVoucher.number}.pdf`);
};

export const generateReceiptVoucherPDF = async (receiptVoucher: any) => {
  const settings = getPDFSettings();
  const doc = setupDocument();
  let startY = await drawHeader(doc, "RECEIPT VOUCHER", settings, receiptVoucher, 'VOUCHER');
  
  const boxY = startY + 10;
  doc.setDrawColor(0, 0, 0);
  doc.rect(PAGE_MARGIN, boxY, CONTENT_WIDTH, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text("Received From:", PAGE_MARGIN + 2, boxY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptVoucher.customerName || '', PAGE_MARGIN + 35, boxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.text("Amount:", PAGE_MARGIN + 2, boxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(receiptVoucher.amount, settings.currency), PAGE_MARGIN + 35, boxY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text("In Words:", PAGE_MARGIN + 2, boxY + 22);
  doc.setFont('helvetica', 'normal');
  doc.text(amountInWords(receiptVoucher.amount, settings.currency), PAGE_MARGIN + 35, boxY + 22);

  let sigY = boxY + 60;
  doc.text("Prepared By", PAGE_MARGIN, sigY);
  doc.text("Approved By", PAGE_WIDTH / 2, sigY, { align: 'center' });
  doc.text("Received By", PAGE_WIDTH - PAGE_MARGIN, sigY, { align: 'right' });
  doc.line(PAGE_MARGIN, sigY - 2, PAGE_MARGIN + 40, sigY - 2);
  doc.line((PAGE_WIDTH / 2) - 20, sigY - 2, (PAGE_WIDTH / 2) + 20, sigY - 2);
  doc.line(PAGE_WIDTH - PAGE_MARGIN - 40, sigY - 2, PAGE_WIDTH - PAGE_MARGIN, sigY - 2);

  await drawCompanyStamp(doc, PAGE_HEIGHT - 35, settings);
  drawFooter(doc, settings, receiptVoucher);
  doc.save(`RV_${receiptVoucher.number}.pdf`);
};

// ============= ALIASES FOR BACKWARD COMPATIBILITY =============
export const generateInvoicePDF = (invoice: any, _client?: any, _project?: any) => generateSalesInvoicePDF(invoice);
export const generateInvoicePDFLegacy = (invoice: any, _client?: any, _project?: any) => generateSalesInvoicePDF(invoice);
export const generateQuotationPDFLegacy = (quotation: any, _client?: any) => generateQuotationPDF(quotation);
