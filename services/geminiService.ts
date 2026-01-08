
import { createWorker, Worker, PSM } from 'tesseract.js';
import { FOOTBALL_TRIVIA, QuestionData } from "../constants";

let workerPromise: Promise<Worker> | null = null;

/**
 * Singleton-like worker initialization.
 */
const getWorker = async () => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO_OSD,
      });
      return worker;
    })();
  }
  return workerPromise;
};

/**
 * Enhanced matching algorithm with keyword prioritizing.
 */
const findBestMatch = (ocrText: string): QuestionData | null => {
  if (!ocrText || ocrText.length < 5) return null;

  // Stop words to ignore
  const stopWords = new Set(['the', 'is', 'a', 'an', 'in', 'of', 'to', 'and', 'for', 'with', 'on', 'at', 'by', 'which', 'was', 'were', 'who', 'what', 'year', 'many', 'has', 'how', 'top', 'league', 'premier']);

  const clean = (s: string) => 
    s.toLowerCase()
     .replace(/[^a-z0-9 ]/g, ' ')
     .split(/\s+/)
     .filter(w => w.length >= 2 && !stopWords.has(w));

  const inputWords = clean(ocrText);
  if (inputWords.length < 2) return null;

  let bestMatch: QuestionData | null = null;
  let maxScore = 0;

  for (const item of FOOTBALL_TRIVIA) {
    const targetWords = clean(item.question);
    const matches = targetWords.filter(w => inputWords.includes(w));
    
    // Weighted score: favor longer keyword matches
    const score = matches.length / targetWords.length;
    
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
    
    // Process image
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
    return null;
  }
};
