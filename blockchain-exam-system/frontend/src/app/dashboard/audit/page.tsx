'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface AuditLog {
  id: number;
  paper: {
    id: string;
    exam: {
      id: string;
      name: string;
    };
    original_filename: string;
  };
  user: {
    id: number;
    username: string;
    role: string;
  };
  action: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, any>;
  created_at: string;
}

const actionLabels: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  upload: { label: '上传', color: 'bg-blue-100 text-blue-700', icon: DocumentArrowUpIcon },
  encrypt: { label: '加密', color: 'bg-purple-100 text-purple-700', icon: LockClosedIcon },
  chain: { label: '上链', color: 'bg-indigo-100 text-indigo-700', icon: CubeIcon },
  view: { label: '查看', color: 'bg-gray-100 text-gray-700', icon: EyeIcon },
  download: { label: '下载', color: 'bg-green-100 text-green-700', icon: ArrowDownTrayIcon },
  decrypt: { label: '解密', color: 'bg-orange-100 text-orange-700', icon: LockOpenIcon },
};

export default function AuditPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'coe') {
      router.push('/dashboard');
      return;
    }
    fetchLogs();
  }, [user, router]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams/audit-logs/', {
        params: {
          action: actionFilter || undefined,
          date: dateFilter || undefined,
        },
      });
      const data = response.data;
      setLogs(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'coe') {
      fetchLogs();
    }
  }, [actionFilter, dateFilter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.paper?.exam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm);
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">审计日志</h1>
          <p className="mt-1 text-sm text-gray-500">查看所有试卷操作记录</p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户、考试名称或IP地址..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有操作</option>
              {Object.entries(actionLabels).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-500">总记录</div>
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
        </div>
        {Object.entries(actionLabels).map(([action, { label, color }]) => {
          const count = logs.filter((l) => l.action === action).length;
          return (
            <div key={action} className="bg-white rounded-lg shadow px-4 py-3">
              <div className="text-sm text-gray-500">{label}</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Logs List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>暂无审计日志</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => {
              const actionInfo = actionLabels[log.action] || {
                label: log.action,
                color: 'bg-gray-100 text-gray-700',
                icon: ClipboardDocumentListIcon,
              };
              const IconComponent = actionInfo.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="hover:bg-gray-50">
                  <div
                    className="px-6 py-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${actionInfo.color}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {log.user.username}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionInfo.color}`}
                            >
                              {actionInfo.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.paper?.exam?.name || '未知考试'} - {log.paper?.original_filename || '未知文件'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-900">{formatDate(log.created_at)}</div>
                        <div className="text-sm text-gray-500">{log.ip_address || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">用户角色:</span>
                          <span className="ml-2 text-gray-900">{log.user.role}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">试卷ID:</span>
                          <span className="ml-2 text-gray-900 font-mono text-xs">
                            {log.paper?.id || '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">IP地址:</span>
                          <span className="ml-2 text-gray-900">{log.ip_address || '-'}</span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="col-span-full">
                            <span className="text-gray-500">详细信息:</span>
                            <pre className="mt-1 p-2 bg-white rounded border text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.user_agent && (
                          <div className="col-span-full">
                            <span className="text-gray-500">User Agent:</span>
                            <div className="mt-1 text-xs text-gray-600 break-all">
                              {log.user_agent}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
