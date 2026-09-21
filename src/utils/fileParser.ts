import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker if in browser
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch {
    // Fallback if worker cannot be initialized
  }
}

export interface ConverterLink {
  name: string;
  url: string;
  description: string;
  recommended?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  isCorrupted: boolean;
  isEmpty: boolean;
  isUnsupported: boolean;
  status: 'valid' | 'corrupted' | 'empty' | 'unsupported' | 'warning';
  title: string;
  message: string;
  details?: string;
  suggestedAction?: string;
  fixGuide?: string[];
  safeSize: number;
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
  validationStatus?: 'valid' | 'warning' | 'corrupted' | 'empty';
  validationMessage?: string;
}

export const SUPPORTED_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'txt', 'md', 'rtf', 'odt', 'odp', 'ods', 'csv', 'png', 'jpg', 'jpeg', 'webp'];

/**
 * Validates a file BEFORE or DURING reading to detect zero-byte files,
 * corrupt binary headers, empty unreadable text streams, or encrypted locks.
 */
export async function validateDocumentFile(file: File): Promise<FileValidationResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const size = file.size || 0;

  // 1. Check for 0 byte / empty files
  if (size === 0) {
    return {
      isValid: false,
      isCorrupted: false,
      isEmpty: true,
      isUnsupported: false,
      status: 'empty',
      title: 'Archivo completamente vacío (0 bytes)',
      message: `El archivo "${file.name}" no contiene datos (tamaño: 0 bytes).`,
      details: 'El archivo subido está en blanco o se descargó de manera incompleta.',
      suggestedAction: 'Verifica que el archivo no esté vacío en tu dispositivo antes de volver a adjuntarlo.',
      fixGuide: [
        'Abre el archivo en tu computadora para confirmar que tenga contenido visible.',
        'Si lo descargaste del campus virtual o WhatsApp, vuelve a descargarlo.',
        'Guarda una nueva copia desde Word, PowerPoint o Acrobat Reader.'
      ],
      safeSize: size,
    };
  }

  // 2. Read first bytes (magic numbers) to detect corruption
  try {
    const headerSlice = await file.slice(0, Math.min(size, 8192)).arrayBuffer();
    const headerBytes = new Uint8Array(headerSlice);

    if (headerBytes.length === 0) {
      return {
        isValid: false,
        isCorrupted: true,
        isEmpty: true,
        isUnsupported: false,
        status: 'corrupted',
        title: 'Documento dañado o ilegible',
        message: `El archivo "${file.name}" no pudo ser leído por el navegador.`,
        details: 'El flujo de bytes está corrupto o bloqueado por el sistema de archivos.',
        suggestedAction: 'Guarda el archivo nuevamente con otro nombre y vuelve a subirlo.',
        safeSize: size,
      };
    }

    // PDF Magic number: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    if (extension === 'pdf') {
      const isPdfHeader = 
        headerBytes.length >= 4 && 
        headerBytes[0] === 0x25 && 
        headerBytes[1] === 0x50 && 
        headerBytes[2] === 0x44 && 
        headerBytes[3] === 0x46;

      if (!isPdfHeader) {
        // Maybe someone renamed an .exe, .html or corrupt download to .pdf
        const latin1 = new TextDecoder('latin1').decode(headerBytes.slice(0, 100));
        const isHtmlError = /<!DOCTYPE html|<html|<head|<script/i.test(latin1);
        
        return {
          isValid: false,
          isCorrupted: true,
          isEmpty: false,
          isUnsupported: false,
          status: 'corrupted',
          title: 'Archivo PDF dañado o encabezado inválido',
          message: `"${file.name}" no es un documento PDF válido o su cabecera está dañada.`,
          details: isHtmlError 
            ? 'El archivo parece ser una página de error HTML descargada en lugar del PDF real (común en campus virtuales que requieren inicio de sesión).' 
            : 'Falta la firma estándar %PDF- en el archivo.',
          suggestedAction: isHtmlError
            ? 'Inicia sesión en tu aula virtual y descarga el documento PDF directamente.'
            : 'Abre el archivo en un lector de PDF y guárdalo como una copia nueva.',
          fixGuide: [
            'Abre el archivo original en tu visor de PDF (Adobe Acrobat, Chrome, etc.).',
            'Haz clic en "Guardar como..." o "Imprimir en PDF" para generar una copia limpia y válida.',
            'Vuelve a cargar la nueva copia generada.'
          ],
          safeSize: size,
        };
      }
    }

    // PPTX / DOCX Zip magic number: PK (0x50, 0x4B)
    if (extension === 'pptx' || extension === 'docx' || extension === 'odt' || extension === 'odp') {
      const isZipHeader = 
        headerBytes.length >= 2 && 
        headerBytes[0] === 0x50 && 
        headerBytes[1] === 0x4B;

      if (!isZipHeader) {
        return {
          isValid: false,
          isCorrupted: true,
          isEmpty: false,
          isUnsupported: false,
          status: 'corrupted',
          title: `Documento .${extension.toUpperCase()} corrupto`,
          message: `El archivo "${file.name}" no tiene la estructura de paquete Office OpenXML válida.`,
          details: 'El archivo está truncado, dañado o renombrado desde una extensión no compatible.',
          suggestedAction: 'Abre el archivo en Microsoft Office / Google Docs y expórtalo como PDF o DOCX/PPTX nuevo.',
          fixGuide: [
            'Abre la presentación o documento en Word / PowerPoint / Google Docs.',
            'Exporta o descarga el archivo en formato PDF.',
            'Sube el PDF generado para un procesamiento óptimo.'
          ],
          safeSize: size,
        };
      }
    }

  } catch (err: any) {
    return {
      isValid: false,
      isCorrupted: true,
      isEmpty: false,
      isUnsupported: false,
      status: 'corrupted',
      title: 'Error de acceso al archivo local',
      message: `No se pudo leer el archivo "${file.name}": ${err?.message || 'Error de I/O local'}.`,
      suggestedAction: 'Comprueba los permisos del archivo o cópialo a otra carpeta antes de subirlo.',
      safeSize: size,
    };
  }

  return {
    isValid: true,
    isCorrupted: false,
    isEmpty: false,
    isUnsupported: false,
    status: 'valid',
    title: 'Archivo verificado correctamente',
    message: `El documento "${file.name}" tiene una estructura válida y lista para analizar.`,
    safeSize: size,
  };
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
      // 1. Convert to base64 for native multimodal AI processing
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);

      // 2. Extract real readable text from PDF streams and printable text
      const pdfText = await extractTextFromPdf(arrayBuffer, file.name);
      extractedText = pdfText || `[Documento PDF: ${file.name} - ${Math.round(file.size / 1024)} KB listo para análisis multimodal]`;
    } else if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      // Convert image to base64 for direct vision processing
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binary);
      extractedText = `[Imagen: ${file.name} - Lista para análisis visual mediante el modelo multimodal Gemini]`;
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

/**
 * Extracts readable text, definitions, headings, and equations from a PDF document buffer
 * using pdfjs-dist with fallback to stream parsing.
 */
async function extractTextFromPdf(buffer: ArrayBuffer, fileName: string): Promise<string> {
  // 1. First attempt with pdfjs-dist for complete page-by-page text
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter((s: string) => s.trim().length > 0);

      if (pageStrings.length > 0) {
        pageTexts.push(`--- Diapositiva / Página ${i} ---\n` + pageStrings.join(' '));
      }
    }

    if (pageTexts.length > 0) {
      const fullText = pageTexts.join('\n\n').trim();
      if (fullText.length > 30) {
        return fullText;
      }
    }
  } catch (pdfJsErr) {
    console.warn(`Extracción con pdfjs falló para ${fileName}, usando fallback:`, pdfJsErr);
  }

  // 2. Fallback stream parser
  try {
    const bytes = new Uint8Array(buffer);
    const latin1Decoder = new TextDecoder('latin1');
    const rawContent = latin1Decoder.decode(bytes);

    const extractedChunks: string[] = [];

    // Direct extraction of PDF text operators: (Text) Tj and [(Text)] TJ
    const tjMatches = rawContent.match(/\(([^()]{2,300})\)\s*Tj/gi) || [];
    for (const tm of tjMatches) {
      const inner = tm.replace(/^\(/, '').replace(/\)\s*Tj$/i, '').trim();
      const cleaned = cleanPdfString(inner);
      if (cleaned.length > 2 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(cleaned)) {
        extractedChunks.push(cleaned);
      }
    }

    const arrayMatches = rawContent.match(/\[(.*?)\]\s*TJ/gi) || [];
    for (const am of arrayMatches) {
      const innerParen = am.match(/\(([^()]+)\)/g) || [];
      const combined = innerParen
        .map(p => cleanPdfString(p.replace(/[()]/g, '')))
        .filter(s => s.length > 0)
        .join(' ')
        .trim();
      if (combined.length > 2 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(combined)) {
        extractedChunks.push(combined);
      }
    }

    // Extract Document Metadata (Title, Subject, Author, Outlines)
    const metaMatches = rawContent.match(/\/(Title|Subject|Author|Keywords)\s*\(([^()]{2,200})\)/gi) || [];
    for (const mm of metaMatches) {
      const val = mm.replace(/^\/(Title|Subject|Author|Keywords)\s*\(/i, '').replace(/\)$/, '').trim();
      const cleaned = cleanPdfString(val);
      if (cleaned.length > 3) {
        extractedChunks.unshift(cleaned);
      }
    }

    // Extract text inside Begin Text / End Text (BT ... ET) blocks
    const btMatches = rawContent.match(/BT[\r\n]+([\s\S]*?)[\r\n]+ET/g) || [];
    for (const bt of btMatches.slice(0, 80)) {
      const parens = bt.match(/\(([^()]{2,200})\)/g) || [];
      const btText = parens
        .map(p => cleanPdfString(p.slice(1, -1)))
        .filter(s => s.length > 1 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(s))
        .join(' ')
        .trim();
      if (btText.length > 5) {
        extractedChunks.push(btText);
      }
    }

    // If operator/metadata extraction yielded sufficient text
    const operatorText = extractedChunks.join(' ').replace(/\s+/g, ' ').trim();
    if (operatorText.length > 120) {
      return `[Documento PDF: ${fileName}]\n\n${operatorText}`;
    }

    return `[Documento PDF: ${fileName} - Escaneado o basado en imágenes. Listo para análisis visual y de contenido mediante el modelo de visión multimodal]`;
  } catch (err) {
    console.warn(`Extracción de texto para PDF ${fileName}:`, err);
    return `[Documento PDF: ${fileName} listo para análisis multimodal]`;
  }
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\([()\\])/g, '$1')
    .trim();
}
