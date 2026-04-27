import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';

async function renderHtmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = 'white';
    container.style.color = 'black';
    container.style.padding = '20px';
    
    // Add a class for global CSS targetting if needed, but inline styles are safer
    container.innerHTML = html;
    document.body.appendChild(container);

    // Minor delay to ensure styles and fonts are applied
    setTimeout(() => {
      html2canvas(container, { scale: 2, useCORS: true })
        .then(canvas => {
          document.body.removeChild(container);
          resolve(canvas);
        })
        .catch(err => {
          document.body.removeChild(container);
          reject(err);
        });
    }, 100);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function convertExcelToPdf(file: File): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Basic HTML rendering of the spreadsheet
  let html = XLSX.utils.sheet_to_html(worksheet);
  // Add some basic styling to the generated table
  html = `<style>table { border-collapse: collapse; width: 100%; font-family: sans-serif; font-size: 12px; } th, td { border: 1px solid #ccc; padding: 4px 8px; }</style><div>${html}</div>`;
  
  const canvas = await renderHtmlToCanvas(html);
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  return pdf.output('blob');
}

export async function convertPdfToExcel(file: File): Promise<Blob> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Cannot perform PDF to Excel conversion.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const arrayBuffer = await file.arrayBuffer();
  const base64Pdf = arrayBufferToBase64(arrayBuffer);
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        parts: [
          {
            text: 'You are an expert data extraction assistant. Extract all tables, lists, and structured tabular data from the attached PDF document. Format the output STRICTLY as raw CSV text. Do not include markdown code block formatting (like ```csv), do not include any conversational text, explanations, or titles. Just output the raw, valid CSV data with a header row followed by the data rows.'
          },
          {
            inlineData: {
              data: base64Pdf,
               mimeType: 'application/pdf'
            }
          }
        ]
      }
    ],
    config: {
      temperature: 0.1, // Keep it deterministic
    }
  });

  let csvText = response.text || '';
  
  // Clean up potential markdown if the model hallucinated it
  if (csvText.startsWith('```')) {
    csvText = csvText.replace(/```(?:csv)?\n?/i, '').replace(/```\n?$/i, '');
  }
  
  if (!csvText.trim()) {
      throw new Error("No tabular data could be extracted from this PDF.");
  }

  const workbook = XLSX.read(csvText.trim(), { type: 'string' });
  const excelArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function convertImageToPdf(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const pdf = new jsPDF(img.width > img.height ? 'l' : 'p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        let targetWidth = img.width;
        let targetHeight = img.height;
        let ratio = targetWidth / targetHeight;

        if (targetWidth > pdfWidth) {
           targetWidth = pdfWidth;
           targetHeight = targetWidth / ratio;
        }

        if (targetHeight > pdfHeight) {
           targetHeight = pdfHeight;
           targetWidth = targetHeight * ratio;
        }
        
        const x = (pdfWidth - targetWidth) / 2;
        const y = (pdfHeight - targetHeight) / 2;

        pdf.addImage(img, 'JPEG', x, y, targetWidth, targetHeight);
        resolve(pdf.output('blob'));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function convertWordToHtmlCanvas(file: File): Promise<HTMLCanvasElement> {
   const arrayBuffer = await file.arrayBuffer();
   const result = await mammoth.convertToHtml({ arrayBuffer });
   const html = `<div style="font-family: sans-serif; line-height: 1.5;">${result.value}</div>`;
   return await renderHtmlToCanvas(html);
}

export async function convertWordToPdf(file: File): Promise<Blob> {
  const canvas = await convertWordToHtmlCanvas(file);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  return pdf.output('blob');
}

export async function convertWordToImage(file: File): Promise<Blob> {
  const canvas = await convertWordToHtmlCanvas(file);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, 'image/png');
  });
}
