
import { createWorker, PSM } from 'tesseract.js';
import { FOOTBALL_TRIVIA, QuestionData } from "../constants";

let workerPromise: any = null;

/**
 * Singleton-like worker initialization.
 * We use explicit CDN paths for the worker and core to ensure the browser 
 * doesn't block them due to MIME type (application/octet-stream) errors.
 */
const getWorker = async () => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core.wasm.js',
        logger: m => {
          if (m.status === 'recognizing text') console.debug(`OCR: ${Math.round(m.progress * 100)}%`);
        }
      });
      
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/? ',
      });
      return worker;
    })();
  }
  return workerPromise;
};

/**
 * Fuzzy matching algorithm to find the closest question in our local database.
 */
const findBestMatch = (ocrText: string): QuestionData | null => {
  if (!ocrText || ocrText.length < 5) return null;

  // Clean the raw text from common game UI fragments
  const cleanOCR = ocrText.toLowerCase()
    .replace(/question\s*:\s*\d+\/\d+/g, '')
    .replace(/score\s*:\s*[+\d,]+/g, '');

  const stopWords = new Set(['the', 'is', 'a', 'an', 'in', 'of', 'to', 'and', 'for', 'with', 'on', 'at', 'by', 'which', 'was', 'were', 'who', 'what', 'year', 'many', 'has', 'how', 'top', 'league', 'premier']);

  const getKeywords = (s: string) => 
    s.toLowerCase()
     .replace(/[^a-z0-9 ]/g, ' ')
     .split(/\s+/)
     .filter(w => w.length >= 2 && !stopWords.has(w));

  const inputKeywords = getKeywords(cleanOCR);
  if (inputKeywords.length < 2) return null;

  let bestMatch: QuestionData | null = null;
  let maxScore = 0;

  for (const item of FOOTBALL_TRIVIA) {
    const targetKeywords = getKeywords(item.question);
    const matches = targetKeywords.filter(w => inputKeywords.includes(w));
    
    // Similarity score based on keyword intersection
    const score = matches.length / targetKeywords.length;
    
    // Threshold: At least 25% match or 2 strong keywords
    if (score > maxScore && (score > 0.25 || matches.length >= 2)) {
      maxScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

export const analyzeQuestionImage = async (base64Image: string) => {
  try {
    const tesseractWorker = await getWorker();
    
    // Perform recognition
    const { data: { text } } = await tesseractWorker.recognize(`data:image/jpeg;base64,${base64Image}`);
    
    const match = findBestMatch(text);

    return {
      rawText: text,
      match: match ? {
        identifiedQuestion: match.question,
        officialAnswer: match.answer
      } : null
    };
  } catch (error) {
    console.error("Local Scan Error:", error);
    workerPromise = null; // Reset to allow retry
    return null;
  }
};
