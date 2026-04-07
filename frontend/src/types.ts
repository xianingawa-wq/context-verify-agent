export type ContractStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';
export type AuditIssueType = 'risk' | 'suggestion' | 'compliance';
export type AuditIssueSeverity = 'high' | 'medium' | 'low' | 'info';
export type AuditIssueStatus = 'pending' | 'accepted' | 'rejected';

export interface Contract {
  id: string;
  title: string;
  type: string;
  status: ContractStatus;
  updatedAt: string;
  author: string;
  content: string;
}

export interface SummaryStats {
  pendingCount: number;
  complianceRate: number;
  highRiskCount: number;
  averageReviewDurationHours: number;
  totalContracts: number;
}

export interface AuditIssue {
  id: string;
  type: AuditIssueType;
  severity: AuditIssueSeverity;
  message: string;
  suggestion: string;
  location?: string;
  status?: AuditIssueStatus;
  startIndex?: number;
  endIndex?: number;
}

export interface ReviewSummary {
  contract_type: string;
  overall_risk: AuditIssueSeverity;
  risk_count: number;
}

export interface ReviewResult {
  summary: ReviewSummary;
  reportOverview: string;
  keyFindings: string[];
  nextActions: string[];
  issues: AuditIssue[];
  generatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  type: 'scan' | 'issue_decision' | 'chat' | 'import';
  title: string;
  description: string;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface ContractListResponse {
  items: Contract[];
  total: number;
}

export interface ContractDetailResponse {
  contract: Contract;
  latestReview: ReviewResult | null;
  chatMessages: ChatMessage[];
}

export interface ScanResponse {
  contract: Contract;
  latestReview: ReviewResult;
  historyCount: number;
}

export interface ChatResponse {
  intent: string;
  toolUsed: string;
  assistantMessage: ChatMessage;
  messages: ChatMessage[];
  latestReview: ReviewResult | null;
}
