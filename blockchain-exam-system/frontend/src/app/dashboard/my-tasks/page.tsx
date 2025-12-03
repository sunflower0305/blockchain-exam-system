'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi } from '@/lib/api';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  CalendarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Exam {
  id: string;
  name: string;
  subject: {
    id: number;
    name: string;
    code: string;
  };
  batch: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  notes: string;
  papers: Array<{
    id: string;
    version: number;
    status: string;
    created_at: string;
  }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700', icon: DocumentTextIcon },
  requesting: { label: '待出题', color: 'bg-yellow-100 text-yellow-700', icon: ClockIcon },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-700', icon: CheckCircleIcon },
  approved: { label: '已批准', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  encrypted: { label: '已加密', color: 'bg-purple-100 text-purple-700', icon: CheckCircleIcon },
  ready: { label: '待考试', color: 'bg-indigo-100 text-indigo-700', icon: ClockIcon },
  ongoing: { label: '考试中', color: 'bg-red-100 text-red-700', icon: ExclamationTriangleIcon },
  finished: { label: '已结束', color: 'bg-gray-100 text-gray-700', icon: CheckCircleIcon },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-700', icon: CheckCircleIcon },
};

export default function MyTasksPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const data = await examApi.getExams();
      setExams(data.results || data);
    } catch (error: any) {
      toast.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (filter === 'pending') {
      return exam.status === 'requesting';
    }
    if (filter === 'submitted') {
      return ['submitted', 'approved', 'encrypted', 'ready'].includes(exam.status);
    }
    return true;
  });

  const pendingCount = exams.filter((e) => e.status === 'requesting').length;
  const submittedCount = exams.filter((e) => ['submitted', 'approved'].includes(e.status)).length;

  if (!user?.sm2_public_key) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-yellow-800">请先生成密钥</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  您需要先生成SM2密钥对才能上传试卷。
                </p>
                <Link
                  href="/dashboard/keys"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors"
                >
                  前往生成密钥
                </Link>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">我的任务</h1>
            <p className="mt-1 text-sm text-slate-500">
              查看分配给您的出题任务
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-xl">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-slate-500">全部任务</p>
                <p className="text-2xl font-bold text-slate-900">{exams.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-slate-500">待出题</p>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-slate-500">已提交</p>
                <p className="text-2xl font-bold text-slate-900">{submittedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'pending', label: '待出题' },
            { key: 'submitted', label: '已提交' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">暂无任务</h3>
            <p className="mt-2 text-sm text-slate-500">
              {filter === 'pending' ? '没有待出题的任务' : '没有分配给您的任务'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExams.map((exam) => {
              const status = statusConfig[exam.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              const canUpload = exam.status === 'requesting';

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-slate-900">{exam.name}</h3>
                        <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', status.color)}>
                          <StatusIcon className="h-3.5 w-3.5 mr-1" />
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div className="flex items-center">
                          <AcademicCapIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.subject?.name || '未知科目'}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.exam_date}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.start_time} - {exam.end_time}</span>
                        </div>
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>批次: {exam.batch}</span>
                        </div>
                      </div>

                      {exam.notes && (
                        <p className="mt-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">
                          备注: {exam.notes}
                        </p>
                      )}

                      {exam.papers && exam.papers.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-slate-500">
                            已上传 {exam.papers.length} 份试卷
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {canUpload ? (
                        <Link
                          href={`/dashboard/upload?exam=${exam.id}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                        >
                          <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                          上传试卷
                        </Link>
                      ) : (
                        <span className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-500 rounded-xl">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          已处理
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
