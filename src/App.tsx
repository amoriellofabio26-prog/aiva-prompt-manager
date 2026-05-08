import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  History, 
  Copy, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronRight,
  FileText,
  Clock,
  Search,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
const Logo = () => {
  const [error, setError] = React.useState(false);

  if (error) {
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1.5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 5L90 85H10L50 5Z" fill="#3B82F6" />
        <path d="M50 15L80 75H20L50 15Z" fill="#1D4ED8" />
        <circle cx="50" cy="45" r="10" fill="white" fillOpacity="0.9" />
        <circle cx="35" cy="70" r="6" fill="white" fillOpacity="0.8" />
        <circle cx="65" cy="70" r="6" fill="white" fillOpacity="0.8" />
        <line x1="50" y1="45" x2="35" y2="70" stroke="white" strokeWidth="2" />
        <line x1="50" y1="45" x2="65" y2="70" stroke="white" strokeWidth="2" />
        <circle cx="50" cy="45" r="4" fill="#3B82F6" />
      </svg>
    );
  }

  return (
    <img 
      src="https://storage.googleapis.com/test-prod-api-studio-build-user-uploads/tho7xclwg3rinzs6qg7ca2/6e4d2932-9449-43c2-8785-056586326778/input_file_0.png" 
      alt="AIVA Logo" 
      className="w-full h-full object-contain" 
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
};

// Types
interface PromptData {
  name: string;
  versao: number;
  data: string;
  promptAtualizado: string;
  promptDiaAnterior: string;
  logAlteracoes: string;
}

interface BackupData {
  id: string;
  backup: string;
  versao: number;
  data: string;
  prompt: string;
  log: string;
}

const BackupCard = ({ 
  backup, 
  idx, 
  onClick, 
  onDelete 
}: { 
  backup: BackupData, 
  idx: number, 
  onClick: () => void, 
  onDelete: (e: React.MouseEvent, id: string) => void,
  key?: React.Key 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.02 }}
    onClick={onClick}
    className="group bg-[#141414] border border-[#252525] hover:border-blue-500/30 rounded-2xl p-6 transition-all cursor-pointer shadow-xl shadow-black/20 relative"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
            backup.backup.toUpperCase().includes('CÉREBRO') ? 'bg-purple-500/10 text-purple-500' :
            backup.backup.toUpperCase().includes('CRITÉRIOS DE AVANÇO') ? 'bg-blue-500/10 text-blue-500' :
            backup.backup.toUpperCase().includes('PAUSAR AGENTE') ? 'bg-orange-500/10 text-orange-500' :
            'bg-emerald-500/10 text-emerald-500'
          }`}>
            {backup.backup.replace('#', '')}
          </span>
          <span className="text-[10px] font-mono text-blue-500 font-bold">v{backup.versao.toFixed(1)}</span>
        </div>
        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
          <Clock className="w-3 h-3" />
          {new Date(backup.data).toLocaleString('pt-BR')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => onDelete(e, backup.id)}
          className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
          title="Excluir Backup"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#252525] flex items-center justify-center text-gray-600 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
    
    <div className="bg-[#0a0a0a] rounded-xl p-4 h-24 overflow-hidden relative border border-[#252525]/50">
      <p className="text-[11px] text-gray-400 font-mono leading-relaxed italic line-clamp-3">"{backup.prompt}"</p>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
    </div>

    <div className="mt-4 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
      <p className="text-[10px] text-gray-500 italic line-clamp-1">{backup.log || 'Sem log de alteração'}</p>
    </div>
  </motion.div>
);

export default function App() {
  const [promptAtual, setPromptAtual] = useState<PromptData | null>(null);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [novoPrompt, setNovoPrompt] = useState('');
  const [logAlteracoes, setLogAlteracoes] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'step1' | 'step2' | 'step3' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backupIdToDelete, setBackupIdToDelete] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [promptToRestore, setPromptToRestore] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor');
  const [copied, setCopied] = useState<string | null>(null);
  const [category, setCategory] = useState('#INFORMAÇÕES ADICIONAIS');
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null);
  const [globalBackups, setGlobalBackups] = useState<BackupData[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('Todos');

  const categories = ['#CÉREBRO', '#CRITÉRIOS DE AVANÇO', '#INFORMAÇÕES ADICIONAIS', '#PAUSAR AGENTE'];

  // Fetch initial data
  useEffect(() => {
    fetchData();
    // Auto-sync every 60s
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [category]);

  // Auto-save to sessionStorage
  useEffect(() => {
    const draft = sessionStorage.getItem(`aiva_draft_${category}`);
    if (draft) setNovoPrompt(draft);
    const draftLog = sessionStorage.getItem(`aiva_log_draft_${category}`);
    if (draftLog) setLogAlteracoes(draftLog);
  }, [category]);

  useEffect(() => {
    sessionStorage.setItem(`aiva_draft_${category}`, novoPrompt);
    sessionStorage.setItem(`aiva_log_draft_${category}`, logAlteracoes);
  }, [novoPrompt, logAlteracoes, category]);

  const fetchData = async (forcePromptUpdate = false) => {
    try {
      setLoading(true);
      const [promptRes, backupsRes, allBackupsRes] = await Promise.all([
        fetch(`/api/prompt?category=${encodeURIComponent(category)}`),
        fetch(`/api/backups?category=${encodeURIComponent(category)}`),
        fetch('/api/all-backups')
      ]);

      if (!promptRes.ok || !backupsRes.ok || !allBackupsRes.ok) {
        const pErr = await promptRes.json();
        const bErr = await backupsRes.json();
        const abErr = await allBackupsRes.json();
        throw new Error(pErr.error || bErr.error || abErr.error || 'Erro ao carregar dados do Notion');
      }

      const promptData = await promptRes.json();
      const backupsData = await backupsRes.json();
      const allBackupsData = await allBackupsRes.json();
      
      setPromptAtual(promptData);
      setBackups(Array.isArray(backupsData) ? backupsData : []);
      setGlobalBackups(Array.isArray(allBackupsData) ? allBackupsData : []);
      
      // Se o prompt atualizado estiver vazio (novo fluxo), usa o dia anterior como base
      const basePrompt = promptData.promptAtualizado || promptData.promptDiaAnterior;
      
      // Se forcePromptUpdate for true, limpamos o rascunho para forçar o carregamento do que veio do Notion
      if (forcePromptUpdate) {
        sessionStorage.removeItem(`aiva_draft_${category}`);
        setNovoPrompt('');
      } else if (!novoPrompt) {
        // Mantemos o novo prompt vazio por padrão, conforme solicitado
        setNovoPrompt('');
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setErrorMessage(err.message);
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDeleteBackup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBackupIdToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteBackup = async () => {
    if (!backupIdToDelete) return;

    try {
      setLoading(true);
      setShowDeleteModal(false);
      const res = await fetch(`/api/backups/${backupIdToDelete}?category=${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.success) {
        // Forçamos a atualização do prompt no editor para refletir a reversão feita no servidor
        await fetchData(true);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
      setBackupIdToDelete(null);
    }
  };

  const handleSave = async () => {
    setSavingState('step1');
    setShowConfirmModal(false);

    try {
      // Step 1: Simulating data fetch (already done but following flow)
      await new Promise(r => setTimeout(r, 800));
      
      setSavingState('step2');
      // Step 2: Creating backup
      await new Promise(r => setTimeout(r, 800));

      setSavingState('step3');
      // Step 3: Updating
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          novoPrompt, 
          logDeAlteracoes: logAlteracoes,
          category 
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setSavingState('success');
        setTimeout(() => {
          setSavingState('idle');
          fetchData();
          setLogAlteracoes('');
          setNovoPrompt(''); // Limpa o novo prompt após salvar
        }, 3000);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      setSavingState('error');
      setErrorMessage(err.message);
      setTimeout(() => setSavingState('idle'), 5000);
    }
  };

  const handleRestore = (prompt: string) => {
    setPromptToRestore(prompt);
    setShowRestoreModal(true);
  };

  const confirmRestore = () => {
    if (promptToRestore) {
      setNovoPrompt(promptToRestore);
      setActiveTab('editor');
    }
    setShowRestoreModal(false);
    setPromptToRestore(null);
    setSelectedBackup(null);
  };

  const hasChanges = promptAtual?.promptDiaAnterior !== novoPrompt;

  const filteredHistory = globalBackups.filter(backup => {
    const matchesSearch = backup.backup.toLowerCase().includes(historySearch.toLowerCase()) || 
                         backup.log.toLowerCase().includes(historySearch.toLowerCase()) ||
                         backup.prompt.toLowerCase().includes(historySearch.toLowerCase());
    
    // Robust category matching
    const backupTitle = backup.backup.trim().toUpperCase();
    const filterCat = historyFilter.replace('#', '').trim().toUpperCase();
    const matchesFilter = historyFilter === 'Todos' || 
                         backupTitle.includes(filterCat);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-gray-400 font-mono animate-pulse">Iniciando AIVA Prompt Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-bottom border-[#252525] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <Logo />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">AIVA Prompt Manager</h1>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">Workspace Edition</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#141414] border border-[#252525] px-3 py-1.5 rounded-full">
              <span className="text-[10px] uppercase font-bold text-gray-500">Versão Atual</span>
              <span className="text-sm font-mono text-blue-400 font-bold">v{(promptAtual?.versao ?? 0).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#141414] border border-[#252525] px-3 py-1.5 rounded-full">
              <span className="text-[10px] uppercase font-bold text-gray-500">Status</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${errorMessage ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                <span className={`text-xs font-medium ${errorMessage ? 'text-red-400' : 'text-green-400'}`}>
                  {errorMessage ? 'Erro de Conexão' : 'Ativo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      <AnimatePresence>
        {errorMessage && savingState !== 'error' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/20 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>
                  <span className="font-bold">Atenção:</span> {errorMessage}. 
                  Verifique as configurações do Notion nos Secrets.
                </p>
              </div>
              <button 
                onClick={() => { setErrorMessage(''); fetchData(); }}
                className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider"
              >
                Tentar Novamente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Tabs */}
      <div className="md:hidden flex border-b border-[#252525]">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'editor' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
        >
          Editor
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}
        >
          Histórico
        </button>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 mt-6">
        <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#252525] w-fit">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Editor de Prompts
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Histórico Global
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'editor' && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Editor */}
              <div className="lg:col-span-8 space-y-8">
                {/* Category Selector */}
                <section className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    Selecione o Prompt para Editar
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setCategory(cat);
                          setNovoPrompt('');
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          category === cat 
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                            : 'bg-[#141414] border-[#252525] text-gray-500 hover:border-gray-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Block 1: Current Prompt */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      📌 Prompt Atual ({category})
                    </label>
                    <button 
                      onClick={() => handleCopy(promptAtual?.promptDiaAnterior || '', 'current')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copied === 'current' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied === 'current' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 font-mono text-sm text-gray-400 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {promptAtual?.promptDiaAnterior || 'Nenhum prompt salvo.'}
                  </div>
                </section>

                {/* Block 2: New Prompt */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Novo Prompt ({category})
                    </label>
                    <div className="flex items-center gap-4">
                      {hasChanges && (
                        <span className="text-[10px] font-bold text-orange-500 flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          Alterações não salvas
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-gray-500">
                        {novoPrompt.length} caracteres
                      </span>
                      <button 
                        onClick={() => handleCopy(novoPrompt, 'new')}
                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copied === 'new' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {copied === 'new' ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                  <textarea 
                    value={novoPrompt}
                    onChange={(e) => setNovoPrompt(e.target.value)}
                    placeholder="Cole ou escreva o novo prompt aqui..."
                    className="w-full min-h-[400px] bg-[#141414] border border-[#252525] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl p-6 font-mono text-sm text-white placeholder:text-gray-700 transition-all resize-none leading-relaxed"
                  />
                </section>

                {/* Block 3: Log */}
                <section className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Log de Alterações
                  </label>
                  <textarea 
                    value={logAlteracoes}
                    onChange={(e) => setLogAlteracoes(e.target.value)}
                    placeholder="Descreva o que mudou nesta versão..."
                    className="w-full min-h-[120px] bg-[#141414] border border-[#252525] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl p-4 text-sm text-white placeholder:text-gray-700 transition-all resize-none"
                  />
                </section>

                {/* Info Panel */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Resumo da Atualização
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-gray-500">Backup (Aba Backups)</p>
                      <ul className="text-xs space-y-1.5 text-gray-400">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Prompt da Versão: Cópia do atual</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Log: {logAlteracoes || '(Vazio)'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Versão: v{(promptAtual?.versao ?? 0).toFixed(1)}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-bold text-gray-500">Base Principal (Aba Prompts)</p>
                      <ul className="text-xs space-y-1.5 text-gray-400">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Prompt Dia Anterior: Seu novo texto</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Prompt Atualizado: (Limpo após envio)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500" />
                          <span>Versão: v{(promptAtual?.versao ?? 0).toFixed(1)} → v{((promptAtual?.versao ?? 0) + 0.1).toFixed(1)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-center pt-4 pb-12">
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!novoPrompt || savingState !== 'idle'}
                    className={`
                      relative group px-12 py-5 rounded-2xl font-bold text-lg transition-all duration-300
                      ${!novoPrompt 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/40 hover:shadow-blue-600/40'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {savingState === 'idle' && (
                        <>
                          <Save className="w-6 h-6" />
                          <span>⚡ SALVAR E ATUALIZAR VERSÃO</span>
                        </>
                      )}
                      {savingState === 'step1' && (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>⏳ Buscando dados atuais...</span>
                        </>
                      )}
                      {savingState === 'step2' && (
                        <>
                          <History className="w-6 h-6 animate-pulse" />
                          <span>📦 Criando backup v{(promptAtual?.versao ?? 0).toFixed(1)}...</span>
                        </>
                      )}
                      {savingState === 'step3' && (
                        <>
                          <RotateCcw className="w-6 h-6 animate-spin" />
                          <span>✏️ Atualizando para v{((promptAtual?.versao ?? 0) + 0.1).toFixed(1)}...</span>
                        </>
                      )}
                      {savingState === 'success' && (
                        <>
                          <CheckCircle2 className="w-6 h-6" />
                          <span>✅ Versão {((promptAtual?.versao ?? 0) + 0.1).toFixed(1)} salva!</span>
                        </>
                      )}
                      {savingState === 'error' && (
                        <>
                          <AlertCircle className="w-6 h-6" />
                          <span>❌ Erro: {errorMessage}</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Column: History (Quick View) */}
              <div className="lg:col-span-4 space-y-6 hidden lg:block">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Histórico Recente
                  </h2>
                </div>
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {backups.slice(0, 5).map((backup, idx) => (
                    <div 
                      key={backup.id || idx}
                      onClick={() => setSelectedBackup(backup)}
                      className="group bg-[#141414] border border-[#252525] rounded-xl p-4 cursor-pointer hover:border-blue-500/30 transition-all relative"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-bold text-white line-clamp-1">{backup.backup}</p>
                        <button
                          onClick={(e) => handleDeleteBackup(e, backup.id)}
                          className="p-1 rounded bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-blue-500">v{(backup.versao ?? 0).toFixed(1)}</span>
                        <span className="text-[10px] text-gray-500">{new Date(backup.data).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setActiveTab('history')}
                    className="w-full py-3 text-xs font-bold text-gray-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
                  >
                    Ver Histórico Completo →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    Histórico Global de Backups
                  </h2>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Acompanhe todas as versões de todos os prompts</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input 
                      type="text"
                      placeholder="Buscar no histórico..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="w-full bg-[#141414] border border-[#252525] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-gray-600 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-[#141414] border border-[#252525] p-1 rounded-xl">
                    <button
                      onClick={() => fetchData()}
                      disabled={loading}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all disabled:opacity-50"
                      title="Sincronizar Agora"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="w-px h-4 bg-[#252525] mx-1" />
                    {['Todos', ...categories].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setHistoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          historyFilter === cat 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {cat === 'Todos' ? 'Todos' : cat.replace('#', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {categories.map((cat) => {
                  const colorClass = 
                    cat.includes('CÉREBRO') ? 'bg-purple-500' :
                    cat.includes('CRITÉRIOS DE AVANÇO') ? 'bg-blue-500' :
                    cat.includes('PAUSAR AGENTE') ? 'bg-orange-500' :
                    'bg-emerald-500';

                  if (historyFilter !== 'Todos' && historyFilter !== cat) return null;

                  return (
                    <div key={cat} className="space-y-6">
                      <div className="flex items-center gap-2 px-2">
                        <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{cat}</h3>
                      </div>
                      <div className="space-y-4">
                        {filteredHistory
                          .filter(b => b.backup.toUpperCase().includes(cat.replace('#', '')))
                          .map((backup, idx) => (
                            <BackupCard 
                              key={backup.id || idx} 
                              backup={backup} 
                              idx={idx} 
                              onClick={() => setSelectedBackup(backup)} 
                              onDelete={handleDeleteBackup}
                            />
                          ))}
                      </div>
                    </div>
                  );
                })}

                {filteredHistory.length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-[#141414] border border-[#252525] rounded-2xl flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-500">Nenhum backup encontrado</p>
                      <p className="text-xs text-gray-600">Tente ajustar seus filtros ou termo de busca.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#141414] border border-[#252525] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-blue-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white">Confirmar Atualização?</h3>
                  <p className="text-sm text-gray-400">
                    Uma nova versão <span className="text-blue-400 font-bold">v{((promptAtual?.versao ?? 0) + 0.1).toFixed(1)}</span> será criada e o backup da versão atual será salvo.
                  </p>
                </div>

                <div className="bg-[#0a0a0a] border border-[#252525] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Versão Atual:</span>
                    <span className="text-white font-mono">v{(promptAtual?.versao ?? 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Nova Versão:</span>
                    <span className="text-blue-400 font-bold font-mono">v{((promptAtual?.versao ?? 0) + 0.1).toFixed(1)}</span>
                  </div>
                  <div className="border-t border-[#252525] pt-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Log de Alterações:</p>
                    <p className="text-xs text-gray-300 italic line-clamp-2">
                      {logAlteracoes || 'Nenhum log informado.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    ✅ Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#141414] border border-[#252525] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white">Excluir Backup?</h3>
                  <p className="text-sm text-gray-400">
                    Tem certeza que deseja excluir este backup? O prompt atual será revertido para a versão anterior.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteBackup}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showRestoreModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRestoreModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#141414] border border-[#252525] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto">
                  <RotateCcw className="w-8 h-8 text-blue-500" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-white">Restaurar Prompt?</h3>
                  <p className="text-sm text-gray-400">
                    Deseja restaurar este prompt para o editor? (Isso não salvará no Sheets ainda)
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowRestoreModal(false)}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-[#1a1a1a] text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmRestore}
                    className="flex-1 py-4 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Restaurar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBackup(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#141414] border border-[#252525] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#252525] flex items-center justify-between bg-[#1a1a1a]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <History className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{selectedBackup.backup}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono text-blue-400 font-bold">v{(selectedBackup.versao ?? 0).toFixed(1)}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(selectedBackup.data).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      handleDeleteBackup(e, selectedBackup.id);
                      setSelectedBackup(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Backup
                  </button>
                  <button 
                    onClick={() => setSelectedBackup(null)}
                    className="p-2 hover:bg-[#252525] rounded-full text-gray-400 transition-colors"
                  >
                    <RotateCcw className="w-5 h-5 rotate-45" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      Prompt Completo
                    </label>
                    <button 
                      onClick={() => handleCopy(selectedBackup.prompt, 'backup-detail')}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copied === 'backup-detail' ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {copied === 'backup-detail' ? 'Copiado!' : 'Copiar Prompt'}
                    </button>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#252525] rounded-2xl p-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedBackup.prompt}
                  </div>
                </section>

                <section className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Log de Alterações Completo
                  </label>
                  <div className="bg-[#0a0a0a] border border-[#252525] rounded-2xl p-6 text-sm text-gray-400 italic leading-relaxed">
                    {selectedBackup.log || 'Nenhum log registrado para esta versão.'}
                  </div>
                </section>
              </div>

              <div className="p-6 bg-[#1a1a1a] border-t border-[#252525] flex gap-4">
                <button 
                  onClick={() => {
                    handleRestore(selectedBackup.prompt);
                    setSelectedBackup(null);
                  }}
                  className="flex-1 py-4 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar para o Editor
                </button>
                <button 
                  onClick={() => setSelectedBackup(null)}
                  className="px-8 py-4 rounded-xl font-bold text-sm bg-[#252525] text-gray-300 hover:text-white transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #252525;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b82f6;
        }
      `}</style>
    </div>
  );
}
