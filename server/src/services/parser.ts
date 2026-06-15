import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as mammoth from 'mammoth';
import * as fs from 'fs';

export class ResumeParserService {
  /**
   * Parses PDF file and returns clean text content
   */
  static async parsePDF(filePath: string): Promise<string> {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = (textContent.items as any[]).filter((item: any) => 'str' in item && 'transform' in item);
      
      // Sort items: Y descending (top to bottom), X ascending (left to right)
      const sortedItems = [...items].sort((a: any, b: any) => {
        const yA = a.transform[5];
        const yB = b.transform[5];
        
        // Use a 5-unit vertical coordinate threshold to treat items as on the same visual line
        if (Math.abs(yA - yB) > 5) {
          return yB - yA;
        }
        return a.transform[4] - b.transform[4];
      });
      
      let pageText = "";
      let lastY = null;
      
      for (const item of sortedItems) {
        const currentY = item.transform[5];
        
        if (lastY !== null && Math.abs(lastY - currentY) > 5) {
          pageText += "\n";
        } else if (lastY !== null && item.str.trim() !== "") {
          // Add a space between items on the same line if they aren't already spaced
          if (!pageText.endsWith(" ") && !pageText.endsWith("\n") && !item.str.startsWith(" ")) {
            pageText += " ";
          }
        }
        
        pageText += item.str;
        lastY = currentY;
      }
      
      fullText += pageText + "\n";
    }
    
    return fullText;
  }

  /**
   * Parses DOCX file and returns text content
   */
  static async parseDOCX(filePath: string): Promise<string> {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  /**
   * Parses any supported resume file (PDF, DOCX) and returns plain text
   */
  static async parseFile(filePath: string): Promise<string> {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return this.parsePDF(filePath);
    } else if (ext === 'docx' || ext === 'doc') {
      return this.parseDOCX(filePath);
    } else {
      // Fallback to reading raw file as text if text-like
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
}
