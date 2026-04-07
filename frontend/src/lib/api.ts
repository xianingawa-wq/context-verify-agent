import type {
  AuditIssueStatus,
  ChatResponse,
  ContractDetailResponse,
  ContractListResponse,
  HistoryItem,
  ScanResponse,
  SummaryStats,
} from '@/src/types';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      // Ignore JSON parse failures and fall back to status text.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getWorkbenchSummary() {
  return request<SummaryStats>('/api/workbench/summary');
}

export function getWorkbenchContracts(search?: string) {
  const params = new URLSearchParams();
  if (search?.trim()) {
    params.set('search', search.trim());
  }
  const query = params.toString();
  return request<ContractListResponse>(`/api/workbench/contracts${query ? `?${query}` : ''}`);
}

export function getWorkbenchContractDetail(contractId: string) {
  return request<ContractDetailResponse>(`/api/workbench/contracts/${contractId}`);
}

export function scanWorkbenchContract(contractId: string, ourSide = '甲方') {
  const formData = new FormData();
  formData.set('our_side', ourSide);
  return request<ScanResponse>(`/api/workbench/contracts/${contractId}/scan`, {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function sendWorkbenchChatMessage(contractId: string, message: string) {
  return request<ChatResponse>(`/api/workbench/contracts/${contractId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function updateWorkbenchIssueStatus(
  contractId: string,
  issueId: string,
  status: AuditIssueStatus,
) {
  return request<ScanResponse['latestReview']>(
    `/api/workbench/contracts/${contractId}/issues/${issueId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    },
  );
}

export function getWorkbenchHistory(contractId: string) {
  return request<HistoryItem[]>(`/api/workbench/contracts/${contractId}/history`);
}
