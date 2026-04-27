import React, { useState, useRef, ChangeEvent } from 'react';
import { 
  FileText, Image as ImageIcon, FileSpreadsheet, ArrowRight,
  UploadCloud, Download, Loader2, AlertCircle, CheckCircle2,
  File, Zap
} from 'lucide-react';
import { cn } from './lib/utils';
import {
  convertExcelToPdf,
  convertPdfToExcel,
  convertImageToPdf,
  convertWordToPdf,
  convertWordToImage
} from './lib/converters';

type ConversionType = 'excel-to-pdf' | 'pdf-to-excel' | 'image-to-pdf' | 'word-to-pdf' | 'word-to-image';

interface ConversionTool {
  id: ConversionType;
  name: string;
  description: string;
  iconSrc: React.ElementType;
  iconDest: React.ElementType;
  accept: string;
}

const TOOLS: ConversionTool[] = [
  { id: 'excel-to-pdf', name: 'Excel to PDF', description: 'Convert spreadsheets to PDF documents', iconSrc: FileSpreadsheet, iconDest: FileText, accept: '.xlsx,.xls,.csv' },
  { id: 'pdf-to-excel', name: 'PDF to Excel', description: 'Extract tabular data from PDF to Excel', iconSrc: FileText, iconDest: FileSpreadsheet, accept: '.pdf' },
  { id: 'image-to-pdf', name: 'Image to PDF', description: 'Convert images to PDF documents', iconSrc: ImageIcon, iconDest: FileText, accept: 'image/*' },
  { id: 'word-to-pdf', name: 'Word to PDF', description: 'Convert Word documents to PDF', iconSrc: FileText, iconDest: FileText, accept: '.docx' },
  { id: 'word-to-image', name: 'Word to Image', description: 'Convert Word documents to Images', iconSrc: FileText, iconDest: ImageIcon, accept: '.docx' }
];

export default function App() {
  const [activeTool, setActiveTool] = useState<ConversionType>('excel-to-pdf');
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTool = TOOLS.find(t => t.id === activeTool)!;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
    setResultUrl(null);
    setError(null);
  };

  const selectTool = (toolId: ConversionType) => {
    setActiveTool(toolId);
    setFile(null);
    setResultUrl(null);
    setError(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const getOutputFilename = (originalName: string, destType: string) => {
    const withoutExt = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
    return `${withoutExt}-converted.${destType}`;
  };

  const handleConvert = async () => {
    if (!file) return;
    
    setIsConverting(true);
    setError(null);
    setResultUrl(null);

    try {
      let resultBlob: Blob;
      let outputExt = 'pdf';

      switch (activeTool) {
        case 'excel-to-pdf':
          resultBlob = await convertExcelToPdf(file);
          break;
        case 'pdf-to-excel':
          resultBlob = await convertPdfToExcel(file);
          outputExt = 'xlsx';
          break;
        case 'image-to-pdf':
          resultBlob = await convertImageToPdf(file);
          break;
        case 'word-to-pdf':
          resultBlob = await convertWordToPdf(file);
          break;
        case 'word-to-image':
          resultBlob = await convertWordToImage(file);
          outputExt = 'png';
          break;
        default:
          throw new Error('Unknown tool selected');
      }

      const url = URL.createObjectURL(resultBlob);
      setResultUrl(url);
      setResultName(getOutputFilename(file.name, outputExt));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-900">
      {/* Header Navigation */}
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">DocuShift</span>
        </div>
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <span className="text-blue-600">Converter</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full shadow-md shadow-blue-200 hover:bg-blue-700 transition-colors">Start Now</button>
        </div>
      </nav>

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-12 gap-6 p-4 md:p-8">
        
        {/* Left Side: Upload & Core Tool */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="mb-2">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-800">
              {currentTool.name}
            </h2>
            <p className="text-slate-500 text-lg">
              {currentTool.description} securely directly in your browser.
            </p>
          </div>

          <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 md:p-12 transition-all flex flex-col justify-center min-h-[400px]">
            {!file && !resultUrl && (
              <div 
                className="flex flex-col items-center justify-center text-center cursor-pointer group h-full py-12"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <UploadCloud className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Select files to convert</h2>
                <p className="text-slate-500 mb-8">or drag and drop them here</p>
                <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-colors pointer-events-none">
                  Choose File
                </button>
                <p className="mt-6 text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Supported formats: {currentTool.accept}
                </p>
              </div>
            )}

            {file && !resultUrl && (
              <div className="text-center flex flex-col items-center justify-center h-full py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-2xl mb-6">
                  <File className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-1 text-slate-800">{file.name}</h3>
                <p className="text-slate-500 text-sm mb-8">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={reset}
                    disabled={isConverting}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={isConverting}
                    className="px-8 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5" />
                        Converting...
                      </>
                    ) : (
                      'Start Conversion'
                    )}
                  </button>
                </div>
              </div>
            )}

            {resultUrl && (
              <div className="text-center flex flex-col items-center justify-center h-full py-12">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6 relative">
                  <CheckCircle2 className="h-12 w-12 text-green-500 relative z-10" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">Conversion Complete!</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm">
                  Your document has been successfully converted.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                  >
                    Convert Another
                  </button>
                  <a
                    href={resultUrl}
                    download={resultName!}
                    className="px-8 py-2.5 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100 transition-colors flex items-center gap-2 justify-center text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </a>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-8 p-4 bg-red-50 text-red-800 rounded-xl flex items-start gap-3 border border-red-100 text-left">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              className="hidden"
              accept={currentTool.accept}
            />
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
             {TOOLS.map(tool => (
               <div 
                 key={tool.id} 
                 onClick={() => selectTool(tool.id)}
                 className={cn(
                   "bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center gap-2 cursor-pointer transition-all text-center justify-center hover:shadow-md",
                   activeTool === tool.id ? "border-blue-500 ring-1 ring-blue-500/50" : "border-slate-100 hover:border-slate-300"
                 )}
               >
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded flex items-center gap-1",
                    activeTool === tool.id ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-600"
                  )}>
                    {tool.name}
                  </span>
               </div>
             ))}
          </div>
        </div>

        {/* Right Side: Sidebar */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">How it works</h3>
            <div className="space-y-4 text-sm text-slate-600 font-medium">
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                 <p>Select a tool from the quick presets.</p>
               </div>
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                 <p>Upload your file securely.</p>
               </div>
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                 <p>Let DocuShift handle the conversion.</p>
               </div>
               <div className="flex items-start gap-3">
                 <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                 <p>Download your new output file immediately.</p>
               </div>
            </div>
            
            {activeTool === 'pdf-to-excel' && (
              <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
                <span className="font-bold flex items-center gap-1 mb-2"><Zap className="w-3 h-3"/> AI Powered</span>
                This conversion securely uses the Gemini API to intelligently extract tables and data structures into Excel format.
              </div>
            )}
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-900/10">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Features</p>
                 <h4 className="text-xl font-bold">Free Forever</h4>
               </div>
               <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold tracking-wider">100%</div>
             </div>
             <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6">Local conversions in browser for most document types without leaving your device.</p>
             <div className="w-full bg-white/10 h-1.5 rounded-full mb-6 overflow-hidden">
               <div className="bg-blue-500 h-full w-full"></div>
             </div>
          </div>
        </div>

      </main>
      
      {/* Footer Status Bar */}
      <footer className="h-10 px-4 md:px-8 flex items-center justify-between bg-white border-t border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-auto">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>All Systems Operational</span>
          <span className="text-slate-200 hidden md:inline">|</span>
          <span className="hidden md:inline">Client-side Processing</span>
        </div>
        <div className="flex gap-4">
          <span className="text-blue-600">{activeTool.replace(/-/g, ' ')}</span>
        </div>
      </footer>
    </div>
  );
}
