/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Trash2,
  ChevronRight,
  Languages,
  Type as TypeIcon,
  Zap,
  BookOpen,
  Settings2,
  Loader2,
  Check,
  RotateCcw,
  BarChart3,
  History as HistoryIcon,
  FileText,
  Download,
  Share2,
  Clock,
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { checkGrammar } from './services/grammarService';
import { Suggestion, GrammarCheckResult } from './types';
import { jsPDF } from 'jspdf';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HistoryItem {
  id: string;
  text: string;
  timestamp: number;
  summary: string;
}

export default function App() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [tone, setTone] = useState('Professional');
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'analytics' | 'alternatives'>('suggestions');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('lumina_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (text: string, summary: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp: Date.now(),
      summary
    };
    const updatedHistory = [newItem, ...history].slice(0, 10);
    setHistory(updatedHistory);
    localStorage.setItem('lumina_history', JSON.stringify(updatedHistory));
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const data = await checkGrammar(text, tone);
      setResult(data);
      saveToHistory(text, data.summary);
      setActiveTab('suggestions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (!result) return;

    const newText = text.slice(0, suggestion.startIndex) +
      suggestion.replacement +
      text.slice(suggestion.endIndex);

    setText(newText);

    const diff = suggestion.replacement.length - suggestion.original.length;
    const updatedSuggestions = result.suggestions
      .filter(s => s.id !== suggestion.id)
      .map(s => {
        if (s.startIndex > suggestion.startIndex) {
          return {
            ...s,
            startIndex: s.startIndex + diff,
            endIndex: s.endIndex + diff
          };
        }
        return s;
      });

    setResult({
      ...result,
      suggestions: updatedSuggestions
    });

    if (activeSuggestionId === suggestion.id) {
      setActiveSuggestionId(null);
    }
  };

  const applyAllSuggestions = () => {
    if (!result) return;
    setText(result.correctedText);
    setResult({
      ...result,
      suggestions: []
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  const loadFromHistory = (item: HistoryItem) => {
    setText(item.text);
    setShowHistory(false);
    setResult(null);
  };

  const applyAlternative = (altText: string) => {
    setText(altText);
    setResult(null); // Clear result since text changed significantly
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'grammar': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'spelling': return 'bg-red-100 text-red-700 border-red-200';
      case 'punctuation': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'style': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'grammar': return <CheckCircle2 className="w-4 h-4" />;
      case 'spelling': return <AlertCircle className="w-4 h-4" />;
      case 'punctuation': return <TypeIcon className="w-4 h-4" />;
      case 'style': return <Sparkles className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const renderToneBar = (label: string, value: number, color: string) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );

  const exportToPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text("Lumina AI - Grammar Report", 10, 10);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    doc.text(`Tone: ${result.detectedTone}`, 10, 20);
    doc.text(`Grammar Score: ${result.grammarScore}%`, 10, 30);
    doc.text(`Readability Score: ${result.analytics.readabilityScore}`, 10, 40);

    doc.setFont("helvetica", "bold");
    doc.text("Original Text:", 10, 50);
    doc.setFont("helvetica", "normal");
    const splitOriginal = doc.splitTextToSize(result.originalText, 180);
    doc.text(splitOriginal, 10, 60);

    let nextY = 60 + (splitOriginal.length * 5) + 10;

    doc.setFont("helvetica", "bold");
    doc.text("Corrected Text:", 10, nextY);
    doc.setFont("helvetica", "normal");
    const splitCorrected = doc.splitTextToSize(result.correctedText, 180);
    doc.text(splitCorrected, 10, nextY + 10);

    doc.save("lumina-ai-report.pdf");
  };

  const exportToWord = () => {
    if (!result) return;

    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Lumina AI Report</title></head>
      <body>
        <h1>Lumina AI - Grammar Report</h1>
        <p><strong>Tone:</strong> ${result.detectedTone}</p>
        <p><strong>Grammar Score:</strong> ${result.grammarScore}%</p>
        <p><strong>Readability Score:</strong> ${result.analytics.readabilityScore}</p>
        
        <h2>Original Text</h2>
        <p>${result.originalText.replace(/\n/g, '<br>')}</p>
        
        <h2>Corrected Text</h2>
        <p>${result.correctedText.replace(/\n/g, '<br>')}</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lumina-ai-report.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Lumina <span className="text-indigo-600">AI</span></h1>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn("flex items-center gap-2 transition-colors", showHistory ? "text-indigo-600" : "hover:text-slate-900")}
            >
              <HistoryIcon className="w-4 h-4" />
              History
            </button>
            <a href="#" className="hover:text-slate-900 transition-colors">Plagiarism</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Tone Detector</a>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full transition-colors">
              Log in
            </button>
            <button className="text-sm font-medium bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all shadow-sm">
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-indigo-600" />
                    Recent Checks
                  </h3>
                  <button onClick={() => setHistory([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-full py-4 text-center">No history yet. Start checking your text!</p>
                  ) : (
                    history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(item.timestamp).toLocaleDateString()}</span>
                          <Clock className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 line-clamp-2 mb-1">{item.text}</p>
                        <p className="text-xs text-slate-400 line-clamp-1 italic">{item.summary}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Editor Section */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[550px]">
              {/* Toolbar */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tone:</span>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="w-[130px] h-8 bg-white border-slate-200">
                        <SelectValue placeholder="Tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                        <SelectItem value="Academic">Academic</SelectItem>
                        <SelectItem value="Creative">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Clear text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative flex-1 p-6">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your text here to check for grammar, spelling, and style improvements..."
                  className="w-full h-full min-h-[400px] resize-none focus:outline-none text-lg leading-relaxed text-slate-700 placeholder:text-slate-300"
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{text.length} chars</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{text.trim() ? Math.ceil(text.trim().split(/\s+/).length / 200) : 0} min read</span>
                  </div>
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !text.trim()}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all shadow-md",
                    isAnalyzing || !text.trim()
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      Check Grammar
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Sidebar / Suggestions & Analytics Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[550px]">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                    activeTab === 'suggestions'
                      ? "text-indigo-600 border-indigo-600"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  Suggestions
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                    activeTab === 'analytics'
                      ? "text-indigo-600 border-indigo-600"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('alternatives')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                    activeTab === 'alternatives'
                      ? "text-indigo-600 border-indigo-600"
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  Alternatives
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <AnimatePresence mode="wait">
                  {activeTab === 'suggestions' ? (
                    <motion.div
                      key="suggestions-tab"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Issues Found
                          {result && result.suggestions.length > 0 && (
                            <span className="ml-2 bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded-full">
                              {result.suggestions.length}
                            </span>
                          )}
                        </h2>
                        {result && result.suggestions.length > 1 && (
                          <button
                            onClick={applyAllSuggestions}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                          >
                            Fix All
                          </button>
                        )}
                      </div>

                      {!result && !isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <BookOpen className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-400 text-sm max-w-[200px]">
                            Enter text and click "Check Grammar" to see suggestions.
                          </p>
                        </div>
                      )}

                      {isAnalyzing && (
                        <div className="space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-slate-50 rounded-xl h-24 w-full" />
                          ))}
                        </div>
                      )}

                      {result && result.suggestions.length === 0 && !isAnalyzing && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                          </div>
                          <p className="text-slate-800 font-semibold mb-1">Looks Perfect!</p>
                          <p className="text-slate-400 text-sm">No issues found in your text.</p>
                        </div>
                      )}

                      {result && result.suggestions.map((suggestion) => (
                        <motion.div
                          key={suggestion.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "group p-4 rounded-xl border transition-all cursor-pointer",
                            activeSuggestionId === suggestion.id
                              ? "border-indigo-200 bg-indigo-50/30 shadow-sm"
                              : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                          )}
                          onClick={() => setActiveSuggestionId(suggestion.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5",
                              getSuggestionColor(suggestion.type)
                            )}>
                              {getSuggestionIcon(suggestion.type)}
                              {suggestion.type}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                applySuggestion(suggestion);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="line-through text-slate-400">{suggestion.original}</span>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                              <span className="font-bold text-indigo-600">{suggestion.replacement}</span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{suggestion.explanation}</p>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : activeTab === 'analytics' ? (
                    <motion.div
                      key="analytics-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      {!result ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <BarChart3 className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-400 text-sm max-w-[200px]">
                            Analyze your text to see detailed writing insights.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Scores Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="text-2xl font-bold text-indigo-600 mb-1">{result.grammarScore}</div>
                              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grammar Score</h3>
                            </div>
                            <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="text-2xl font-bold text-emerald-600 mb-1">{result.analytics.readabilityScore}</div>
                              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Readability</h3>
                            </div>
                          </div>

                          {/* Detected Tone */}
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Languages className="w-4 h-4 text-indigo-600" />
                              <span className="text-sm font-bold text-slate-800">{result.detectedTone}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detected Tone</p>
                          </div>

                          {/* Tone Profile */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <BrainCircuit className="w-3.5 h-3.5" />
                              Tone Profile
                            </h3>
                            <div className="space-y-4">
                              {renderToneBar('Formal', result.analytics.toneProfile.formal, 'bg-indigo-500')}
                              {renderToneBar('Confident', result.analytics.toneProfile.confident, 'bg-blue-500')}
                              {renderToneBar('Friendly', result.analytics.toneProfile.friendly, 'bg-emerald-500')}
                              {renderToneBar('Optimistic', result.analytics.toneProfile.optimistic, 'bg-amber-500')}
                            </div>
                          </div>

                          {/* Vocabulary & Keywords */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vocabulary</h4>
                              <p className="text-sm font-bold text-slate-800">{result.analytics.vocabularyLevel}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Read Time</h4>
                              <p className="text-sm font-bold text-slate-800">{result.analytics.readingTimeMinutes} min</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Keywords</h3>
                            <div className="flex flex-wrap gap-2">
                              {result.analytics.topKeywords.map((kw, i) => (
                                <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="alternatives-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      {!result ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <RotateCcw className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="text-slate-400 text-sm max-w-[200px]">
                            Analyze your text to see alternative versions.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Alternative Versions</h2>
                            <p className="text-xs text-slate-400 mt-1">Choose a different style for your entire text.</p>
                          </div>
                          {result.alternativeVersions.map((alt, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {alt.label}
                                </span>
                                <button
                                  onClick={() => applyAlternative(alt.text)}
                                  className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                                >
                                  Apply <Check className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 italic">
                                "{alt.text}"
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {result && (
                <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Summary
                    </h3>
                    <div className="flex gap-2">
                      <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Share2 className="w-3.5 h-3.5" /></button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-500" /> Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={exportToWord} className="cursor-pointer flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" /> Export as Word
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic">
                    "{result.summary}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-slate-50 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Advanced Writing Intelligence</h2>
            <p className="text-slate-500">Lumina AI uses state-of-the-art language models to provide deep insights into your writing style and impact.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                icon: <BrainCircuit className="w-6 h-6 text-indigo-500" />,
                title: "Deep Analysis",
                desc: "Goes beyond grammar to analyze tone, confidence, and formality levels."
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-emerald-500" />,
                title: "Readability",
                desc: "Understand how easy your text is to read with industry-standard metrics."
              },
              {
                icon: <HistoryIcon className="w-6 h-6 text-amber-500" />,
                title: "History",
                desc: "Keep track of your previous checks and improvements over time."
              },
              {
                icon: <Zap className="w-6 h-6 text-blue-500" />,
                title: "Fast & Secure",
                desc: "Your data is processed instantly and never stored on our servers permanently."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-slate-800">Lumina AI</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900">Terms of Service</a>
            <a href="#" className="hover:text-slate-900">Contact</a>
          </div>
          <p className="text-sm text-slate-400">© 2026 Lumina AI. All rights reserved.</p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}} />
    </div>
  );
}
