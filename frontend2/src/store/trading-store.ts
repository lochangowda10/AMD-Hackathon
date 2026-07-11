import { create } from 'zustand';

export type AgentDecision = 'BUY' | 'SELL' | 'WAIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PanelType = 'dashboard' | 'agents' | 'voice' | 'vision' | 'simulator' | 'portfolio' | 'journal' | 'psychology' | 'whatif' | 'memory' | 'explainability';

export interface AgentResult {
  agent: string;
  decision: AgentDecision;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

export interface OrchestratorResult {
  finalDecision: AgentDecision;
  overallConfidence: number;
  agentResults: AgentResult[];
  fusionReasoning: string;
  riskLevel: RiskLevel;
  actionableAdvice: string[];
  explanation: {
    score: number;
    reasons: string[];
    risks: string[];
  };
}

export interface SimulationParams {
  capital: number;
  riskPercent: number;
  tradeCount: number;
  winRate: number;
  rewardToRisk: number;
}

export interface SimulationResult {
  expectedProfit: number;
  expectedLoss: number;
  bestCase: number;
  worstCase: number;
  expectedCAGR: number;
  maxDrawdown: number;
  riskOfRuin: number;
  distribution: { profit: number; probability: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: Date;
}

interface TradingStore {
  // Navigation
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;

  // Agent Analysis
  analysisLoading: boolean;
  analysisResult: OrchestratorResult | null;
  setAnalysisLoading: (loading: boolean) => void;
  setAnalysisResult: (result: OrchestratorResult | null) => void;

  // Voice
  voiceInput: string;
  voiceResponse: string;
  isRecording: boolean;
  isSpeaking: boolean;
  setVoiceInput: (input: string) => void;
  setVoiceResponse: (response: string) => void;
  setIsRecording: (recording: boolean) => void;
  setIsSpeaking: (speaking: boolean) => void;

  // Vision
  visionLoading: boolean;
  visionResult: string | null;
  setVisionLoading: (loading: boolean) => void;
  setVisionResult: (result: string | null) => void;

  // Simulation
  simLoading: boolean;
  simResult: SimulationResult | null;
  setSimLoading: (loading: boolean) => void;
  setSimResult: (result: SimulationResult | null) => void;

  // Psychology
  psychologyMessages: ChatMessage[];
  psychologyLoading: boolean;
  addPsychologyMessage: (message: ChatMessage) => void;
  setPsychologyLoading: (loading: boolean) => void;

  // Chat (Copilot)
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  addChatMessage: (message: ChatMessage) => void;
  setChatLoading: (loading: boolean) => void;

  // Analysis query
  analysisQuery: string;
  setAnalysisQuery: (query: string) => void;
}

export const useTradingStore = create<TradingStore>((set) => ({
  activePanel: 'dashboard',
  setActivePanel: (panel) => set({ activePanel: panel }),

  analysisLoading: false,
  analysisResult: null,
  setAnalysisLoading: (loading) => set({ analysisLoading: loading }),
  setAnalysisResult: (result) => set({ analysisResult: result }),

  voiceInput: '',
  voiceResponse: '',
  isRecording: false,
  isSpeaking: false,
  setVoiceInput: (input) => set({ voiceInput: input }),
  setVoiceResponse: (response) => set({ voiceResponse: response }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),

  visionLoading: false,
  visionResult: null,
  setVisionLoading: (loading) => set({ visionLoading: loading }),
  setVisionResult: (result) => set({ visionResult: result }),

  simLoading: false,
  simResult: null,
  setSimLoading: (loading) => set({ simLoading: loading }),
  setSimResult: (result) => set({ simResult: result }),

  psychologyMessages: [],
  psychologyLoading: false,
  addPsychologyMessage: (message) =>
    set((state) => ({ psychologyMessages: [...state.psychologyMessages, message] })),
  setPsychologyLoading: (loading) => set({ psychologyLoading: loading }),

  chatMessages: [],
  chatLoading: false,
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatLoading: (loading) => set({ chatLoading: loading }),

  analysisQuery: '',
  setAnalysisQuery: (query) => set({ analysisQuery: query }),
}));