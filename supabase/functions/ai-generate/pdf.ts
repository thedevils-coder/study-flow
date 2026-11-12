import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

function wrap(text: string, width = 92) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildStudyPdf(title: string, markdown: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  let pageNumber = 1;

  const footer = () => {
    page.drawText(`Study Flow  ·  ${pageNumber}`, {
      x: margin,
      y: 28,
      size: 9,
      font: regular,
      color: rgb(0.4, 0.4, 0.45),
    });
  };

  const ensure = (needed: number) => {
    if (y - needed < 48) {
      footer();
      page = pdf.addPage([pageWidth, pageHeight]);
      pageNumber += 1;
      y = pageHeight - margin;
    }
  };

  const paint = (text: string, options: { size: number; font: typeof bold; gap?: number }) => {
    for (const line of wrap(text, options.size >= 16 ? 42 : 88)) {
      ensure(options.size + 6);
      page.drawText(line, {
        x: margin,
        y,
        size: options.size,
        font: options.font,
        color: rgb(0.08, 0.07, 0.16),
      });
      y -= options.size + (options.gap ?? 6);
    }
  };

  paint(title || 'Study Flow notes', { size: 20, font: bold, gap: 14 });

  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      y -= 8;
      continue;
    }
    if (line.startsWith('# ')) {
      y -= 8;
      paint(line.slice(2), { size: 16, font: bold, gap: 10 });
      continue;
    }
    if (line.startsWith('## ')) {
      paint(line.slice(3), { size: 13, font: bold, gap: 8 });
      continue;
    }
    if (line.startsWith('|')) {
      paint(line.replace(/\|/g, '  ').trim(), { size: 10, font: regular, gap: 4 });
      continue;
    }
    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) {
      paint(`${numbered[1]}. ${numbered[2]}`, { size: 11, font: regular });
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      paint(`• ${line.slice(2)}`, { size: 11, font: regular });
      continue;
    }
    paint(line.replace(/\*\*/g, ''), { size: 11, font: regular });
  }

  footer();
  return await pdf.save();
}
