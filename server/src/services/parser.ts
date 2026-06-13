const { PDFParse } = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as fs from 'fs';

export class ResumeParserService {
  /**
   * Parses PDF file and returns clean text content
   */
  static async parsePDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    return result.text;
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
