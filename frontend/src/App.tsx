import React, { startTransition, useDeferredValue, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
} from 'lucide-react';

import { cn } from '@/src/lib/utils';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'review'>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const navigateToReview = (id: string) => {
    startTransition(() => {
      setSelectedContractId(id);
      setCurrentPage('review');
    });
  };

  const navigateToDashboard = () => {
    startTransition(() => {
      setCurrentPage('dashboard');
    });
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-xl tracking-tight">SmartAudit</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="工作台"
            active={currentPage === 'dashboard'}
            onClick={navigateToDashboard}
          />
          <NavItem icon={<FileText size={20} />} label="合同库" active={false} />
          <NavItem icon={<CheckCircle2 size={20} />} label="已审核" active={false} />
          <NavItem icon={<AlertCircle size={20} />} label="风险预警" active={false} />
          <NavItem icon={<Clock size={20} />} label="待处理" active={false} />
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <NavItem icon={<Settings size={20} />} label="系统设置" active={false} />
          <NavItem icon={<LogOut size={20} />} label="退出登录" active={false} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索合同、项目或人员..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-sm font-medium">张经理</p>
                <p className="text-xs text-slate-500">法务部总监</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
                <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {currentPage === 'dashboard' ? (
            <Dashboard onReviewContract={navigateToReview} searchQuery={deferredSearchQuery} />
          ) : (
            <Review contractId={selectedContractId} onBack={navigateToDashboard} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
        active
          ? 'bg-blue-50 text-blue-600 shadow-sm shadow-blue-100/50'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight className="ml-auto" size={16} />}
    </button>
  );
}
