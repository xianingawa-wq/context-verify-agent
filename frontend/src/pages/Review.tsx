import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  History,
  Info,
  MessageSquare,
  Paperclip,
  Save,
  Send,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import {
  getWorkbenchContractDetail,
  getWorkbenchHistory,
  scanWorkbenchContract,
  sendWorkbenchChatMessage,
  updateWorkbenchIssueStatus,
} from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import type {
  AuditIssue,
  AuditIssueStatus,
  ChatMessage,
  Contract,
  ContractStatus,
  HistoryItem,
  ReviewResult,
} from '@/src/types';

export default function Review({
  contractId,
  onBack,
}: {
  contractId: string | null;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'ai' | 'chat' | 'history'>('ai');
  const [contract, setContract] = useState<Contract | null>(null);
  const [latestReview, setLatestReview] = useState<ReviewResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingIssueId, setPendingIssueId] = useState<string | null>(null);
  const [autoScanAttempted, setAutoScanAttempted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!contractId) {
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [detail, history] = await Promise.all([
          getWorkbenchContractDetail(contractId),
          getWorkbenchHistory(contractId),
        ]);
        if (cancelled) {
          return;
        }
        setContract(detail.contract);
        setLatestReview(detail.latestReview);
        setChatMessages(detail.chatMessages);
        setHistoryItems(history);
        setAutoScanAttempted(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : '加载合同详情失败。');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [contractId]);

  useEffect(() => {
    if (!contractId || !contract || latestReview || autoScanAttempted || loading) {
      return;
    }
    setAutoScanAttempted(true);
    void handleAiScan();
  }, [autoScanAttempted, contract, contractId, latestReview, loading]);

  async function refreshHistory(currentContractId: string) {
    try {
      const nextHistory = await getWorkbenchHistory(currentContractId);
      setHistoryItems(nextHistory);
    } catch {
      // Ignore secondary refresh errors to keep the main workflow responsive.
    }
  }

  async function handleAiScan() {
    if (!contractId) {
      return;
    }

    setIsAiScanning(true);
    setError(null);
    try {
      const response = await scanWorkbenchContract(contractId);
      setContract(response.contract);
      setLatestReview(response.latestReview);
      await refreshHistory(contractId);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : '执行 AI 扫描失败。');
    } finally {
      setIsAiScanning(false);
    }
  }

  async function handleIssueStatus(issueId: string, status: AuditIssueStatus) {
    if (!contractId) {
      return;
    }

    setPendingIssueId(issueId);
    setError(null);
    try {
      const nextReview = await updateWorkbenchIssueStatus(contractId, issueId, status);
      setLatestReview(nextReview);
      const detail = await getWorkbenchContractDetail(contractId);
      setContract(detail.contract);
      await refreshHistory(contractId);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : '更新风险状态失败。');
    } finally {
      setPendingIssueId(null);
    }
  }

  async function handleSendMessage() {
    if (!contractId || !inputMessage.trim()) {
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const response = await sendWorkbenchChatMessage(contractId, inputMessage.trim());
      setInputMessage('');
      setChatMessages(response.messages);
      if (response.latestReview) {
        setLatestReview(response.latestReview);
      }
      const detail = await getWorkbenchContractDetail(contractId);
      setContract(detail.contract);
      await refreshHistory(contractId);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : '发送消息失败。');
    } finally {
      setIsSending(false);
    }
  }

  const issues = latestReview?.issues ?? [];
  const pendingIssues = issues.filter((issue) => issue.status === 'pending');

  if (!contractId) {
    return <EmptyState onBack={onBack} message="请先从工作台选择一份合同。" />;
  }

  if (loading) {
    return <EmptyState onBack={onBack} message="正在加载合同详情..." />;
  }

  if (!contract) {
    return <EmptyState onBack={onBack} message={error ?? '未找到该合同。'} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h2 className="font-bold text-slate-900">{contract.title}</h2>
          <span className={cn('px-2 py-0.5 text-xs font-bold rounded', statusPillClassName(contract.status))}>
            {statusLabel(contract.status)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <History size={18} />
            操作历史
          </button>
          <button
            onClick={() => void handleAiScan()}
            disabled={isAiScanning}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60"
          >
            <Save size={18} />
            {isAiScanning ? '扫描中...' : '重新扫描'}
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-600/10">
            <Send size={18} />
            提交审核
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-8 flex justify-center">
          <div className="w-full max-w-4xl bg-white shadow-xl shadow-slate-200/50 border border-slate-200 rounded-lg min-h-[1000px] p-12 font-serif leading-relaxed text-slate-800">
            {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
            <DocumentContent content={contract.content} />
          </div>
        </div>

        <aside className="w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="flex border-b border-slate-100 shrink-0">
            <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Zap size={16} />} label="智能扫描" />
            <TabButton
              active={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare size={16} />}
              label="深度对话"
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={<History size={16} />}
              label="操作历史"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'ai' && (
              <div className="flex-1 overflow-auto p-6 space-y-6">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap size={20} fill="currentColor" />
                      <span className="font-bold">AI 实时监控</span>
                    </div>
                    <button
                      onClick={() => void handleAiScan()}
                      disabled={isAiScanning}
                      className="rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/20 disabled:opacity-60"
                    >
                      {isAiScanning ? '扫描中' : '重新扫描'}
                    </button>
                  </div>
                  <p className="text-sm text-blue-100 mb-6">
                    当前识别到 {pendingIssues.length} 个待处理风险点。你可以直接处理建议，或切换到对话页继续追问。
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox
                      label="高风险"
                      value={pendingIssues.filter((issue) => issue.severity === 'high').length.toString()}
                      color="bg-red-400/20 text-red-200"
                    />
                    <StatBox
                      label="中风险"
                      value={pendingIssues.filter((issue) => issue.severity === 'medium').length.toString()}
                      color="bg-amber-400/20 text-amber-200"
                    />
                    <StatBox
                      label="建议"
                      value={pendingIssues.filter((issue) => issue.severity === 'low' || issue.severity === 'info').length.toString()}
                      color="bg-blue-400/20 text-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      风险清单
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{pendingIssues.length}</span>
                    </h3>
                    {latestReview && <span className="text-xs text-slate-400">最近扫描：{formatDateTime(latestReview.generatedAt)}</span>}
                  </div>

                  <AnimatePresence mode="popLayout">
                    {pendingIssues.map((issue, index) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.08 }}
                        className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <SeverityIcon severity={issue.severity} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {issueTypeLabel(issue.type)}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">{issue.location ?? '全文'}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 mb-1">{issue.message}</h4>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">{issue.suggestion}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => void handleIssueStatus(issue.id, 'accepted')}
                            disabled={pendingIssueId === issue.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                          >
                            <Check size={14} />
                            采纳建议
                          </button>
                          <button
                            onClick={() => void handleIssueStatus(issue.id, 'rejected')}
                            disabled={pendingIssueId === issue.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                          >
                            <X size={14} />
                            忽略
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {pendingIssues.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 px-6">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">当前没有待处理风险</h4>
                      <p className="text-sm text-slate-500">你可以继续深度对话，或者重新发起一次合同扫描。</p>
                      <button onClick={() => setActiveTab('chat')} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                        进入深度对话
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                <div className="flex-1 overflow-auto p-6 space-y-6">
                  {chatMessages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      还没有对话记录，可以直接向 AI 追问合同风险、法条依据或修改建议。
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col max-w-[85%]',
                          msg.role === 'user' ? 'ml-auto items-end' : 'items-start',
                        )}
                      >
                        <div
                          className={cn(
                            'p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none',
                          )}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
                    <button
                      onClick={() => setInputMessage('请结合当前合同，给我争议解决条款的修改建议。')}
                      className="whitespace-nowrap text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 bg-slate-100 rounded-lg"
                    >
                      争议解决建议
                    </button>
                    <button
                      onClick={() => setInputMessage('请解释当前主体信息相关的合规风险。')}
                      className="whitespace-nowrap text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 bg-slate-100 rounded-lg"
                    >
                      主体合规风险
                    </button>
                    <button
                      onClick={() => setInputMessage('请告诉我付款条款应该怎么改更稳妥。')}
                      className="whitespace-nowrap text-xs font-bold text-slate-500 hover:text-blue-600 px-2 py-1 bg-slate-100 rounded-lg"
                    >
                      付款条款优化
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      value={inputMessage}
                      onChange={(event) => setInputMessage(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                      placeholder="向 AI 提问关于合同的任何问题..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none min-h-[100px]"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600">
                        <Paperclip size={18} />
                      </button>
                      <button
                        onClick={() => void handleSendMessage()}
                        disabled={!inputMessage.trim() || isSending}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ArrowUp size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex-1 overflow-auto p-6 space-y-4">
                {historyItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-400 py-12">
                    <History size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">暂无操作历史</p>
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <span className="text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DocumentContent({ content }: { content: string }) {
  return (
    <div className="whitespace-pre-wrap">
      {content.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-4" />;
        }
        if (index === 0) {
          return (
            <h1 key={index} className="text-3xl font-bold mb-8 text-center text-slate-900">
              {trimmed}
            </h1>
          );
        }
        if (/^第[一二三四五六七八九十百零]+条/.test(trimmed)) {
          return (
            <h2 key={index} className="text-xl font-bold mt-8 mb-4 text-slate-900">
              {trimmed}
            </h2>
          );
        }
        return (
          <p key={index} className="mb-4">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

function EmptyState({ onBack, message }: { onBack: () => void; message: string }) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm text-slate-600">{message}</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          返回工作台
        </button>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-1 py-4 text-[10px] font-bold transition-all border-b-2',
        active ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={cn('p-2 rounded-xl text-center', color)}>
      <p className="text-[10px] font-bold opacity-80">{label}</p>
      <p className="text-lg font-black leading-none mt-1">{value}</p>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: AuditIssue['severity'] }) {
  if (severity === 'high') {
    return <ShieldAlert size={14} className="text-red-500" />;
  }
  if (severity === 'medium') {
    return <AlertCircle size={14} className="text-amber-500" />;
  }
  if (severity === 'low') {
    return <Info size={14} className="text-blue-500" />;
  }
  return <Info size={14} className="text-slate-400" />;
}

function issueTypeLabel(type: AuditIssue['type']) {
  if (type === 'risk') {
    return '法律风险';
  }
  if (type === 'compliance') {
    return '合规问题';
  }
  return '修改建议';
}

function statusLabel(status: ContractStatus) {
  const labels = {
    pending: '待处理',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
  };
  return labels[status];
}

function statusPillClassName(status: ContractStatus) {
  const classNames = {
    pending: 'bg-slate-100 text-slate-600',
    reviewing: 'bg-blue-50 text-blue-600',
    approved: 'bg-emerald-50 text-emerald-600',
    rejected: 'bg-red-50 text-red-600',
  };
  return classNames[status];
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
