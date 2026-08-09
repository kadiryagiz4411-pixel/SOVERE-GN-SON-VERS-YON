import jsPDF from 'jspdf';

interface CVSection {
  title: string;
  content: string;
}

interface ExportOptions {
  fileName?: string;
  photoDataUrl?: string | null;
  fullName?: string;
  isPaid?: boolean;
  type?: 'cv' | 'proposal';
  email?: string;
  phone?: string;
  location?: string;
}

// Sovereign brand colors
const GOLD = { r: 218, g: 165, b: 32 };
const DARK = { r: 15, g: 15, b: 15 };
const CHARCOAL = { r: 25, g: 25, b: 25 };
const WHITE = { r: 255, g: 255, b: 255 };
const GRAY = { r: 160, g: 160, b: 160 };
const LIGHT_GOLD = { r: 245, g: 230, b: 180 };

function parseCVSections(cvText: string): CVSection[] {
  const sections: CVSection[] = [];
  const lines = cvText.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.trim() === '---') continue;
    const trimmed = line.trim();
    const isHeader = trimmed === trimmed.toUpperCase() &&
                     trimmed.length > 2 &&
                     trimmed.length < 50 &&
                     !trimmed.startsWith('-') &&
                     /[A-Z]/.test(trimmed);

    if (isHeader) {
      if (currentTitle || currentContent.length > 0) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = trimmed;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle || currentContent.length > 0) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }

  return sections.filter(s => s.content.length > 0);
}

// ========== PDF EXPORT ==========

function drawDarkBackground(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  // Full dark background
  doc.setFillColor(DARK.r, DARK.g, DARK.b);
  doc.rect(0, 0, pw, ph, 'F');
  // Gold left border
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, 0, 3, ph, 'F');
  // Gold right border
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(pw - 3, 0, 3, ph, 'F');
  // Gold top line
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, 0, pw, 1.5, 'F');
  // Gold bottom line
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(0, ph - 1.5, pw, 1.5, 'F');
}

function drawCVHeader(doc: jsPDF, opts: ExportOptions): number {
  const pw = doc.internal.pageSize.getWidth();
  const headerH = 48;

  // Dark header area with slightly lighter shade
  doc.setFillColor(CHARCOAL.r, CHARCOAL.g, CHARCOAL.b);
  doc.rect(3, 1.5, pw - 6, headerH, 'F');

  // Gold separator under header
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(3, headerH + 1.5, pw - 6, 1, 'F');

  // LEFT SIDE: Name and contact info
  const leftX = 15;
  let nameY = 14;

  // Name
  const displayName = opts.fullName || '';
  if (displayName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
    doc.text(displayName.toUpperCase(), leftX, nameY);
    nameY += 7;
  }

  // Contact info line
  const contactParts: string[] = [];
  if (opts.email) contactParts.push(opts.email);
  if (opts.phone) contactParts.push(opts.phone);
  if (opts.location) contactParts.push(opts.location);
  
  if (contactParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text(contactParts.join('  |  '), leftX, nameY);
    nameY += 6;
  }

  // Brand label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  const brandText = opts.type === 'proposal' ? 'SOVEREIGN · PROPOSAL' : 'SOVEREIGN · CV';
  doc.text(brandText, leftX, nameY);
  nameY += 5;

  // Date
  doc.setFontSize(6.5);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), leftX, nameY);

  // RIGHT SIDE: Photo
  if (opts.photoDataUrl) {
    try {
      const photoSize = 28;
      const photoX = pw - 15 - photoSize;
      const photoY = 6;
      // Gold border frame
      doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
      doc.setLineWidth(1);
      doc.rect(photoX - 1, photoY - 1, photoSize + 2, photoSize + 2);
      doc.addImage(opts.photoDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
    } catch {
      // Photo failed, skip
    }
  }

  return headerH + 6;
}

function drawPageFooter(doc: jsPDF, showWatermark: boolean, pageNum: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Gold line above footer
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.3);
  doc.line(15, ph - 14, pw - 15, ph - 14);

  // Page number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
  doc.text(`${pageNum}`, pw / 2, ph - 8, { align: 'center' });

  // Watermark for free users (when they've used their 3 free premium downloads)
  if (showWatermark) {
    doc.setFontSize(6.5);
    doc.setTextColor(GRAY.r, GRAY.g, GRAY.b);
    doc.text('Generated by Sovereign · sovereignapp.pro', 15, ph - 8);
  }

  // Gold S brand mark
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('S', pw - 15, ph - 8);
}

function renderSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  // Gold diamond bullet
  doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
  doc.rect(margin, y - 2.5, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.text(title, margin + 6, y);
  y += 2;

  // Gold underline
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 55, y);
  y += 5;

  return y;
}

function renderContentLines(
  doc: jsPDF,
  lines: string[],
  startY: number,
  margin: number,
  maxWidth: number,
  showWatermark: boolean,
  pageNum: { value: number }
): number {
  let y = startY;
  const pw = doc.internal.pageSize.getWidth();

  for (const line of lines) {
    if (!line.trim()) {
      y += 3;
      continue;
    }

    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
    const text = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line.trim();
    const indent = isBullet ? margin + 6 : margin;

    if (isBullet) {
      doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
      doc.circle(margin + 2, y - 1, 0.7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(LIGHT_GOLD.r, LIGHT_GOLD.g, LIGHT_GOLD.b);

    const wrapped = doc.splitTextToSize(text, maxWidth - (isBullet ? 8 : 0));
    for (const wLine of wrapped) {
      if (y > 272) {
        drawPageFooter(doc, showWatermark, pageNum.value);
        doc.addPage();
        pageNum.value++;
        drawDarkBackground(doc);
        y = 18;
      }
      doc.text(wLine, indent, y);
      y += 4.2;
    }
    y += 1;
  }

  return y;
}

export function exportCVAsPDF(cvText: string, fileName = 'cv', options?: Partial<ExportOptions>) {
  const opts: ExportOptions = { fileName, type: 'cv', isPaid: false, ...options };
  const doc = new jsPDF();
  const sections = parseCVSections(cvText);
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pw - margin * 2;
  const pageNum = { value: 1 };
  const showWatermark = !opts.isPaid;

  // Page 1
  drawDarkBackground(doc);
  let y = drawCVHeader(doc, opts);
  y += 4;

  for (const section of sections) {
    if (y > 255) {
      drawPageFooter(doc, showWatermark, pageNum.value);
      doc.addPage();
      pageNum.value++;
      drawDarkBackground(doc);
      y = 18;
    }

    if (section.title) {
      y = renderSectionTitle(doc, section.title, y, margin);
    }

    const contentLines = section.content.split('\n');
    y = renderContentLines(doc, contentLines, y, margin, maxWidth, showWatermark, pageNum);
    y += 4;
  }

  drawPageFooter(doc, showWatermark, pageNum.value);
  doc.save(`${opts.fileName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportProposalAsPDF(proposalText: string, fileName = 'proposal', options?: Partial<ExportOptions>) {
  const opts: ExportOptions = { fileName, type: 'proposal', isPaid: false, ...options };
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pw - margin * 2;
  const pageNum = { value: 1 };
  const showWatermark = !opts.isPaid;

  drawDarkBackground(doc);
  let y = drawCVHeader(doc, opts);
  y += 4;

  const paragraphs = proposalText.split('\n');
  for (const para of paragraphs) {
    if (!para.trim()) {
      y += 3;
      continue;
    }

    const isBold = para.trim() === para.trim().toUpperCase() && para.trim().length > 2 && para.trim().length < 60 && /[A-Z]/.test(para.trim());

    if (isBold) {
      if (y > 255) {
        drawPageFooter(doc, showWatermark, pageNum.value);
        doc.addPage();
        pageNum.value++;
        drawDarkBackground(doc);
        y = 18;
      }
      y += 3;
      y = renderSectionTitle(doc, para.trim(), y, margin);
      continue;
    }

    const isBullet = para.trim().startsWith('-') || para.trim().startsWith('•');
    const text = isBullet ? para.trim().replace(/^[-•]\s*/, '') : para.trim();
    const indent = isBullet ? margin + 6 : margin;

    if (isBullet) {
      doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
      doc.circle(margin + 2, y - 1, 0.7, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(LIGHT_GOLD.r, LIGHT_GOLD.g, LIGHT_GOLD.b);

    const wrapped = doc.splitTextToSize(text, maxWidth - (isBullet ? 8 : 0));
    for (const line of wrapped) {
      if (y > 272) {
        drawPageFooter(doc, showWatermark, pageNum.value);
        doc.addPage();
        pageNum.value++;
        drawDarkBackground(doc);
        y = 18;
      }
      doc.text(line, indent, y);
      y += 4.5;
    }
    y += 1;
  }

  drawPageFooter(doc, showWatermark, pageNum.value);
  doc.save(`${opts.fileName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ========== DOCX EXPORTS ==========

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildDocxParagraphs(sections: CVSection[]): string {
  let xml = '';

  for (const section of sections) {
    if (section.title) {
      xml += `<w:p>
        <w:pPr>
          <w:spacing w:before="240" w:after="60"/>
          <w:shd w:val="clear" w:color="auto" w:fill="1A1A1A"/>
          <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="DAA520"/></w:pBdr>
        </w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="DAA520"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${escapeXml(section.title)}</w:t></w:r>
      </w:p>`;
    }

    const lines = section.content.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;

      const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
      const text = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line.trim();

      if (isBullet) {
        xml += `<w:p>
          <w:pPr>
            <w:spacing w:after="40"/>
            <w:shd w:val="clear" w:color="auto" w:fill="0F0F0F"/>
            <w:ind w:left="360" w:hanging="180"/>
          </w:pPr>
          <w:r><w:rPr><w:color w:val="DAA520"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">&#x25C6;  </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="F5E6B4"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
        </w:p>`;
      } else {
        xml += `<w:p>
          <w:pPr>
            <w:spacing w:after="60"/>
            <w:shd w:val="clear" w:color="auto" w:fill="0F0F0F"/>
          </w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="F5E6B4"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
        </w:p>`;
      }
    }
  }
  return xml;
}

function buildDocxHeader(opts: ExportOptions): string {
  const name = opts.fullName ? escapeXml(opts.fullName) : '';
  const brandLabel = opts.type === 'proposal' ? 'SOVEREIGN \u00B7 PROPOSAL' : 'SOVEREIGN \u00B7 CV';

  let headerXml = '';

  // Name on dark background
  if (name) {
    headerXml += `<w:p>
      <w:pPr>
        <w:shd w:val="clear" w:color="auto" w:fill="191919"/>
        <w:spacing w:before="0" w:after="0"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/><w:color w:val="FFFFFF"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${name}</w:t></w:r>
    </w:p>`;
  }

  // Contact info
  const contactParts: string[] = [];
  if (opts.email) contactParts.push(opts.email);
  if (opts.phone) contactParts.push(opts.phone);
  if (opts.location) contactParts.push(opts.location);
  if (contactParts.length > 0) {
    headerXml += `<w:p>
      <w:pPr>
        <w:shd w:val="clear" w:color="auto" w:fill="191919"/>
        <w:spacing w:before="0" w:after="0"/>
      </w:pPr>
      <w:r><w:rPr><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="A0A0A0"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${escapeXml(contactParts.join('  |  '))}</w:t></w:r>
    </w:p>`;
  }

  // Gold brand line
  headerXml += `<w:p>
    <w:pPr>
      <w:shd w:val="clear" w:color="auto" w:fill="191919"/>
      <w:spacing w:before="60" w:after="60"/>
    </w:pPr>
    <w:r><w:rPr><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="DAA520"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>${brandLabel}</w:t></w:r>
  </w:p>`;

  // Gold separator
  headerXml += `<w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="DAA520"/></w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="0F0F0F"/>
      <w:spacing w:before="0" w:after="200"/>
    </w:pPr>
  </w:p>`;

  return headerXml;
}

function buildDocxFooter(showWatermark: boolean): string {
  let footer = `<w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="DAA520"/></w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="0F0F0F"/>
      <w:spacing w:before="400"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r><w:rPr><w:sz w:val="14"/><w:szCs w:val="14"/><w:color w:val="DAA520"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>S O V E R E I G N</w:t></w:r>
  </w:p>`;

  if (showWatermark) {
    footer += `<w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:shd w:val="clear" w:color="auto" w:fill="0F0F0F"/>
      </w:pPr>
      <w:r><w:rPr><w:sz w:val="12"/><w:szCs w:val="12"/><w:color w:val="666666"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t>Generated by Sovereign (Free) \u00B7 sovereignapp.pro</w:t></w:r>
    </w:p>`;
  }

  return footer;
}

async function generateDOCX(content: string, opts: ExportOptions) {
  const sections = parseCVSections(content);
  const headerXml = buildDocxHeader(opts);
  const bodyXml = buildDocxParagraphs(sections);
  const footerXml = buildDocxFooter(!opts.isPaid);

  // Full dark background for entire document
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
${headerXml}
${bodyXml}
${footerXml}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
  <w:pgBorders w:offsetFrom="page">
    <w:top w:val="single" w:sz="12" w:space="24" w:color="DAA520"/>
    <w:left w:val="single" w:sz="12" w:space="24" w:color="DAA520"/>
    <w:bottom w:val="single" w:sz="12" w:space="24" w:color="DAA520"/>
    <w:right w:val="single" w:sz="12" w:space="24" w:color="DAA520"/>
  </w:pgBorders>
</w:sectPr>
</w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rels);
  zip.file('word/document.xml', docXml);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opts.fileName}-${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportCVAsDOCX(cvText: string, fileName = 'cv', options?: Partial<ExportOptions>) {
  await generateDOCX(cvText, { fileName, type: 'cv', isPaid: false, ...options });
}

export async function exportProposalAsDOCX(proposalText: string, fileName = 'proposal', options?: Partial<ExportOptions>) {
  await generateDOCX(proposalText, { fileName, type: 'proposal', isPaid: false, ...options });
}
