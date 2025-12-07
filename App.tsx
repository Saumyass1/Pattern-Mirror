import React, { useState } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import AnalysisResultView from './components/AnalysisResultView';
import { UploadedFile, AnalysisState } from './types';
import { analyzePatterns } from './services/geminiService';
import { AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [journalText, setJournalText] = useState('');
  const [journalPhotos, setJournalPhotos] = useState<UploadedFile[]>([]);
  const [spacePhotos, setSpacePhotos] = useState<UploadedFile[]>([]);
  
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isLoading: false,
    error: null,
    result: null
  });

  const handleAnalyze = async () => {
    setAnalysisState({ isLoading: true, error: null, result: null });
    
    try {
      const jFiles = journalPhotos.map(f => f.file);
      const sFiles = spacePhotos.map(f => f.file);
      
      const result = await analyzePatterns(journalText, jFiles, sFiles);
      setAnalysisState({ isLoading: false, error: null, result });
    } catch (err: any) {
      setAnalysisState({ 
        isLoading: false, 
        error: err.message || "Something went wrong during analysis.", 
        result: null 
      });
    }
  };

  const isAnalyzeDisabled = (journalText.trim().length === 0 && journalPhotos.length === 0 && spacePhotos.length === 0) || analysisState.isLoading;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          
          {/* Left Panel: Inputs */}
          <div className="w-full lg:w-1/3 lg:min-w-[400px] space-y-8 h-fit lg:sticky lg:top-24">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 space-y-6">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Your Inputs</h2>
                <div className="space-y-2">
                  <label htmlFor="journal-text" className="block text-sm font-medium text-stone-700">
                    Journal Entries / Notes
                  </label>
                  <textarea
                    id="journal-text"
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value.slice(0, 10000))}
                    placeholder="Paste thoughts, recurring worries, dreams, or daily logs here..."
                    className="w-full h-48 p-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-800 focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none text-sm leading-relaxed"
                  />
                  <div className="flex justify-between text-xs text-stone-400">
                    <span>Be honest. It stays local until sent to AI.</span>
                    <span>{journalText.length}/10,000</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-6">
                <FileUpload 
                  label="Journal Photos (Handwritten)" 
                  files={journalPhotos} 
                  onFilesChange={setJournalPhotos} 
                />
              </div>

              <div className="border-t border-stone-100 pt-6">
                <FileUpload 
                  label="Room / Workspace Photos" 
                  files={spacePhotos} 
                  onFilesChange={setSpacePhotos} 
                />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzeDisabled}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md
                ${isAnalyzeDisabled 
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                  : 'bg-stone-800 text-stone-50 hover:bg-stone-900 hover:scale-[1.01] active:scale-[0.99] shadow-stone-300'
                }`}
            >
              {analysisState.isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting dots...
                </>
              ) : (
                <>
                  Analyze My Patterns
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {analysisState.error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>{analysisState.error}</p>
              </div>
            )}

            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100/50 text-xs text-blue-800 flex items-start gap-3">
               <ShieldCheck className="w-5 h-5 flex-shrink-0 text-blue-600/70" />
               <div className="opacity-80">
                  <p className="font-semibold mb-1">Privacy & Safety</p>
                  <p>This tool uses AI to analyze patterns. It is not a therapist. If you are in crisis, please contact a professional.</p>
               </div>
            </div>

          </div>

          {/* Right Panel: Results */}
          <div className="w-full lg:flex-1">
            {analysisState.result ? (
              <AnalysisResultView data={analysisState.result} />
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-stone-50/50 rounded-3xl border-2 border-dashed border-stone-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <SparklesIcon className="w-8 h-8 text-stone-300" />
                </div>
                <h3 className="text-xl font-serif font-bold text-stone-400 mb-2">Ready to Reflect</h3>
                <p className="text-stone-400 max-w-md">
                  Add your journal entries or photos on the left to uncover hidden patterns in your life, emotions, and environment.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper icon component for the empty state
const SparklesIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

export default App;
