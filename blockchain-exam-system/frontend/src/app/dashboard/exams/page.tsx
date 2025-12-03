'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi } from '@/lib/api';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'requesting', label: '请求中' },
  { value: 'submitted', label: '已提交' },
  { value: 'approved', label: '已批准' },
  { value: 'encrypted', label: '已加密' },
  { value: 'ready', label: '待考试' },
  { value: 'ongoing', label: '考试中' },
  { value: 'finished', label: '已结束' },
];

export default function ExamsPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadExams();
  }, [statusFilter]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const data = await examApi.getExams(params);
      setExams(data.results || data || []);
    } catch (error) {
      console.error('加载考试列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; color: string; bgColor: string }> = {
      draft: { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100' },
      requesting: { label: '请求中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
      submitted: { label: '已提交', color: 'text-blue-600', bgColor: 'bg-blue-100' },
      approved: { label: '已批准', color: 'text-green-600', bgColor: 'bg-green-100' },
      encrypted: { label: '已加密', color: 'text-purple-600', bgColor: 'bg-purple-100' },
      ready: { label: '待考试', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
      ongoing: { label: '考试中', color: 'text-red-600', bgColor: 'bg-red-100' },
      finished: { label: '已结束', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    };
    return config[status] || { label: status, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const filteredExams = exams.filter((exam) =>
    exam.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.batch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedExams = filteredExams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredExams.length / pageSize);

  const canCreateExam = user?.role === 'admin' || user?.role === 'coe';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">考试管理</h1>
            <p className="mt-1 text-sm text-slate-500">
              管理所有考试信息，包括创建、分配和审批
            </p>
          </div>
          {canCreateExam && (
            <Link
              href="/dashboard/exams/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              创建考试
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索考试名称、科目、批次..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Exams List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm text-slate-500">加载中...</p>
            </div>
          ) : paginatedExams.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        考试信息
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        科目
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        考试时间
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        负责教师
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedExams.map((exam) => {
                      const statusConfig = getStatusConfig(exam.status);
                      return (
                        <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-slate-900">{exam.name}</div>
                                <div className="text-xs text-slate-500">{exam.batch}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">{exam.subject_name || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-sm text-slate-600">
                              <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                              {exam.exam_date}
                            </div>
                            <div className="flex items-center text-xs text-slate-500 mt-1">
                              <ClockIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                              {exam.start_time} - {exam.end_time}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-600">
                              {exam.assigned_teacher_name || '未分配'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={clsx(
                              'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                              statusConfig.bgColor,
                              statusConfig.color
                            )}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/exams/${exam.id}`}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="查看详情"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </Link>
                              {canCreateExam && (
                                <Link
                                  href={`/dashboard/exams/${exam.id}/edit`}
                                  className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="编辑"
                                >
                                  <PencilSquareIcon className="h-5 w-5" />
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    共 {filteredExams.length} 条记录，第 {currentPage} / {totalPages} 页
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center">
              <DocumentTextIcon className="h-16 w-16 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">暂无考试</h3>
              <p className="mt-2 text-sm text-slate-500">
                {searchTerm || statusFilter
                  ? '没有找到匹配的考试，请调整筛选条件'
                  : '还没有创建任何考试'}
              </p>
              {canCreateExam && !searchTerm && !statusFilter && (
                <Link
                  href="/dashboard/exams/create"
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  创建第一个考试
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
