import JSZip from 'jszip';
import mammoth from 'mammoth';

export interface ParsedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  text: string;
  base64?: string;
  slideCount?: number;
  wordCount?: number;
}

export async function parseUploadedFile(file: File): Promise<ParsedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  let extractedText = '';
  let base64: string | undefined = undefined;
  let slideCount: number | undefined = undefined;

  const arrayBuffer = await file.arrayBuffer();

  try {
    if (extension === 'pdf') {
      // For PDF, convert to base64 for native Gemini multimodal document processing
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
      extractedText = `[Documento PDF: ${file.name} - ${Math.round(file.size / 1024)} KB listo para análisis multimodal]`;
    } else if (extension === 'pptx') {
      // PowerPoint OpenXML format
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter(filename => /^ppt\/slides\/slide\d+\.xml$/i.test(filename))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)![0], 10);
          const numB = parseInt(b.match(/\d+/)![0], 10);
          return numA - numB;
        });

      slideCount = slideFiles.length;
      const slideTexts: string[] = [];

      for (let i = 0; i < slideFiles.length; i++) {
        const slideXml = await zip.files[slideFiles[i]].async('string');
        // Extract text nodes <a:t>Content</a:t>
        const matches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g) || [];
        const cleanSlideContent = matches
          .map(m => m.replace(/<\/?a:t[^>]*>/g, '').trim())
          .filter(t => t.length > 0)
          .join(' ');

        if (cleanSlideContent) {
          slideTexts.push(`--- Diapositiva ${i + 1} ---\n${cleanSlideContent}`);
        }
      }

      extractedText = slideTexts.join('\n\n');
      if (!extractedText.trim()) {
        extractedText = `Presentación de PowerPoint: ${file.name} (${slideCount} diapositivas)`;
      }
    } else if (extension === 'ppt') {
      // Legacy binary PPT - extract text strings from binary stream
      extractedText = extractPrintableStrings(arrayBuffer);
      if (!extractedText || extractedText.length < 50) {
        extractedText = `Presentación PPT (formato binario): ${file.name}. Extraído contenido general.`;
      }
    } else if (extension === 'docx') {
      // Word document
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value || '';
    } else if (extension === 'doc') {
      // Legacy binary DOC - extract text strings
      extractedText = extractPrintableStrings(arrayBuffer);
      if (!extractedText || extractedText.length < 50) {
        extractedText = `Documento DOC clásico: ${file.name}.`;
      }
    } else {
      // Plain text, markdown, csv, etc.
      const textDecoder = new TextDecoder('utf-8');
      extractedText = textDecoder.decode(arrayBuffer);
    }
  } catch (err: any) {
    console.warn(`Error parsing file ${file.name}:`, err);
    extractedText = `Archivo: ${file.name} (${extension.toUpperCase()}). Contenido procesado como referencia de estudio.`;
  }

  const wordCount = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;

  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type || `application/${extension}`,
    extension,
    text: extractedText,
    base64,
    slideCount,
    wordCount,
  };
}

function extractPrintableStrings(buffer: ArrayBuffer, minLength = 4): string {
  const bytes = new Uint8Array(buffer);
  const strings: string[] = [];
  let currentString = '';

  for (let i = 0; i < bytes.length; i++) {
    const charCode = bytes[i];
    // Printable ASCII or common accented characters
    if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13 || charCode > 160) {
      currentString += String.fromCharCode(charCode);
    } else {
      if (currentString.length >= minLength && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{2,}/.test(currentString)) {
        strings.push(currentString.trim());
      }
      currentString = '';
    }
  }

  if (currentString.length >= minLength) {
    strings.push(currentString.trim());
  }

  return strings.join('\n');
}
