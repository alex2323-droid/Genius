import JSZip from 'jszip';
import mammoth from 'mammoth';

export interface ConverterLink {
  name: string;
  url: string;
  description: string;
  recommended?: boolean;
}

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
  isObsolete?: boolean;
  obsoleteReason?: string;
}

export const OBSOLETE_EXTENSIONS = ['doc', 'ppt', 'xls', 'rtf', 'odt', 'odp', 'ods', 'wps', 'pages', 'key'];

export function isObsoleteFormat(extension: string): boolean {
  return OBSOLETE_EXTENSIONS.includes(extension.toLowerCase());
}

export function getConverterLinks(extension: string): ConverterLink[] {
  const ext = extension.toLowerCase();

  if (ext === 'doc') {
    return [
      {
        name: 'CloudConvert',
        url: 'https://cloudconvert.com/doc-to-pdf',
        description: 'Conversor gratuito de Word antiguo (.doc) a PDF sin límite restrictivo de tamaño',
        recommended: true,
      },
      {
        name: 'PDF Pequeño (Smallpdf)',
        url: 'https://smallpdf.com/es/word-a-pdf',
        description: 'Herramienta rápida y gratuita para transformar documentos DOC a PDF al instante',
      },
    ];
  }

  if (ext === 'ppt') {
    return [
      {
        name: 'CloudConvert',
        url: 'https://cloudconvert.com/ppt-to-pdf',
        description: 'Conversor gratuito de presentaciones PowerPoint (.ppt) a PDF con nitidez total',
        recommended: true,
      },
      {
        name: 'PDF Pequeño (Smallpdf)',
        url: 'https://smallpdf.com/es/ppt-a-pdf',
        description: 'Convierte tus diapositivas de PowerPoint a PDF de forma limpia y rápida',
      },
    ];
  }

  if (ext === 'rtf') {
    return [
      {
        name: 'CloudConvert',
        url: 'https://cloudconvert.com/rtf-to-pdf',
        description: 'Convierte archivos RTF a formato PDF limpio de forma gratuita',
        recommended: true,
      },
      {
        name: 'PDF Pequeño (Smallpdf)',
        url: 'https://smallpdf.com/es',
        description: 'Herramienta en línea gratuita para procesar y optimizar tus documentos a PDF',
      },
    ];
  }

  if (ext === 'odt' || ext === 'odp' || ext === 'ods') {
    return [
      {
        name: 'CloudConvert',
        url: `https://cloudconvert.com/${ext}-to-pdf`,
        description: `Convierte archivos OpenDocument (.${ext}) a PDF con fidelidad y gratis`,
        recommended: true,
      },
      {
        name: 'PDF Pequeño (Smallpdf)',
        url: 'https://smallpdf.com/es',
        description: 'Herramienta en línea gratuita para transformar tus documentos a PDF',
      },
    ];
  }

  // Fallback general converter (CloudConvert and PDF Pequeño)
  return [
    {
      name: 'CloudConvert',
      url: 'https://cloudconvert.com/document-converter',
      description: 'Conversor universal en la nube, gratuito y compatible con más de 200 formatos a PDF',
      recommended: true,
    },
    {
      name: 'PDF Pequeño (Smallpdf)',
      url: 'https://smallpdf.com/es',
      description: 'Suite en línea gratuita para convertir y optimizar archivos a formato PDF limpio',
    },
  ];
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

  const isObsolete = isObsoleteFormat(extension);
  let obsoleteReason: string | undefined = undefined;
  if (isObsolete) {
    if (extension === 'doc') {
      obsoleteReason = 'Formato Word binario antiguo (97-2003). Puede omitir fórmulas o esquemas.';
    } else if (extension === 'ppt') {
      obsoleteReason = 'Formato PowerPoint binario antiguo (97-2003). Convierte a PDF para conservar gráficos vectoriales.';
    } else {
      obsoleteReason = `Formato .${extension.toUpperCase()} clásico. Recomendamos convertir a PDF para máxima precisión de la IA.`;
    }
  }

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
    isObsolete,
    obsoleteReason,
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
