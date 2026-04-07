import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';

import { getWorkbenchContracts, getWorkbenchSummary } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';
import type { Contract, ContractStatus, SummaryStats } from '@/src/types';

const EMPTY_SUMMARY: SummaryStats = {
  pendingCount: 0,
  complianceRate: 0,
  highRiskCount: 0,
  averageReviewDurationHours: 0,
  totalContracts: 0,
};

export default function Dashboard({
  onReviewContract,
  searchQuery,
}: {
  onReviewContract: (id: string) => void;
  searchQuery: string;
}) {
  const [summary, setSummary] = useState<SummaryStats>(EMPTY_SUMMARY);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryResponse, contractsResponse] = await Promise.all([
          getWorkbenchSummary(),
          getWorkbenchContracts(searchQuery),
        ]);
        if (cancelled) {
          return;
        }
        setSummary(summaryResponse);
        setContracts(contractsResponse.items);
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : '加载合同工作台失败。');
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
  }, [searchQuery]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">欢迎回来，张经理</h1>
          <p className="text-slate-500 mt-1">
            当前共有 <span className="font-bold text-slate-900">{summary.totalContracts}</span> 份合同，
            其中 <span className="text-red-500 font-bold">{summary.highRiskCount}</span> 项高风险待处理。
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25"
        >
          <Plus size={20} />
          <span>新建校审任务</span>
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="待校审"
          value={summary.pendingCount.toString()}
          caption={`${summary.totalContracts} 份合同总数`}
          icon={<FileText className="text-blue-600" />}
          tone="blue"
        />
        <StatCard
          title="合规率"
          value={`${summary.complianceRate.toFixed(1)}%`}
          caption="基于已生成的审查结果"
          icon={<ShieldCheck className="text-emerald-600" />}
          tone="emerald"
        />
        <StatCard
          title="高风险项"
          value={summary.highRiskCount.toString()}
          caption="仍处于待处理状态"
          icon={<AlertTriangle className="text-amber-600" />}
          tone="amber"
        />
        <StatCard
          title="平均耗时"
          value={`${summary.averageReviewDurationHours.toFixed(1)}h`}
          caption="从创建到最近一次审查"
          icon={<ArrowUpRight className="text-violet-600" />}
          tone="violet"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">近期合同任务</h2>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
              <Filter size={16} />
              筛选
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
              <Download size={16} />
              导出
            </button>
          </div>
        </div>

        {error ? (
          <div className="px-6 py-10 text-sm text-red-600 bg-red-50 border-t border-red-100">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">合同名称</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">提交人</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRow />
                ) : contracts.length === 0 ? (
                  <EmptyRow />
                ) : (
                  contracts.map((contract, index) => (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onReviewContract(contract.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                            <FileText size={20} />
                          </div>
                          <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {contract.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{contract.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={contract.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                            <img src={`https://picsum.photos/seed/${contract.author}/40/40`} alt="" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-sm text-slate-600">{contract.author}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{contract.updatedAt}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">当前显示 {contracts.length} 份合同</p>
          <div className="text-xs text-slate-400">点击任意合同进入校审工作台</div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  caption,
  icon,
  tone,
}: {
  title: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
  const toneClassNames = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', toneClassNames[tone])}>{icon}</div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        <p className="text-xs text-slate-400 mt-2">{caption}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const config = {
    pending: { label: '待处理', className: 'bg-slate-100 text-slate-600' },
    reviewing: { label: '审核中', className: 'bg-blue-100 text-blue-600' },
    approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
    rejected: { label: '已驳回', className: 'bg-red-100 text-red-600' },
  };

  const { label, className } = config[status];

  return <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold', className)}>{label}</span>;
}

function LoadingRow() {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
        正在加载合同列表...
      </td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
        当前没有符合条件的合同。
      </td>
    </tr>
  );
}
