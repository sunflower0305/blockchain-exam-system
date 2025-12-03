'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi, blockchainApi } from '@/lib/api';
import {
  DocumentTextIcon,
  ClockIcon,
  ShieldCheckIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Stats {
  totalExams: number;
  pendingExams: number;
  completedExams: number;
  approvedExams: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalExams: 0,
    pendingExams: 0,
    completedExams: 0,
    approvedExams: 0,
  });
  const [blockchainStatus, setBlockchainStatus] = useState<any>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const examsData = await examApi.getExams();
      const exams = examsData.results || examsData || [];
      setRecentExams(exams.slice(0, 6));
      setStats({
        totalExams: exams.length,
        pendingExams: exams.filter((e: any) => ['requesting', 'submitted'].includes(e.status)).length,
        completedExams: exams.filter((e: any) => e.status === 'finished').length,
        approvedExams: exams.filter((e: any) => ['approved', 'encrypted', 'ready'].includes(e.status)).length,
      });

      try {
        const status = await blockchainApi.getStatus();
        setBlockchainStatus(status);
      } catch {
        setBlockchainStatus({ blockchain: { connected: false } });
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const getRoleActions = () => {
    switch (user?.role) {
      case 'admin':
      case 'coe':
        return [
          { name: '创建考试', href: '/dashboard/exams/create', icon: DocumentTextIcon, color: 'bg-blue-500' },
          { name: '管理考试', href: '/dashboard/exams', icon: ClockIcon, color: 'bg-indigo-500' },
          { name: '用户管理', href: '/dashboard/users', icon: UserGroupIcon, color: 'bg-purple-500' },
          { name: '查看报告', href: '/dashboard/reports', icon: ChartBarIcon, color: 'bg-pink-500' },
        ];
      case 'teacher':
        return [
          { name: '我的任务', href: '/dashboard/my-tasks', icon: DocumentTextIcon, color: 'bg-blue-500' },
          { name: '上传试卷', href: '/dashboard/upload', icon: ArrowTrendingUpIcon, color: 'bg-green-500' },
          { name: '密钥管理', href: '/dashboard/keys', icon: ShieldCheckIcon, color: 'bg-yellow-500' },
          { name: '历史记录', href: '/dashboard/history', icon: CalendarDaysIcon, color: 'bg-purple-500' },
        ];
      case 'superintendent':
        return [
          { name: '待监考试', href: '/dashboard/exams', icon: ClockIcon, color: 'bg-blue-500' },
          { name: '解密试卷', href: '/dashboard/decrypt', icon: ShieldCheckIcon, color: 'bg-green-500' },
          { name: '密钥管理', href: '/dashboard/keys', icon: ShieldCheckIcon, color: 'bg-yellow-500' },
          { name: '操作记录', href: '/dashboard/history', icon: CalendarDaysIcon, color: 'bg-purple-500' },
        ];
      default:
        return [
          { name: '我的考试', href: '/dashboard/exams', icon: DocumentTextIcon, color: 'bg-blue-500' },
          { name: '个人设置', href: '/dashboard/settings', icon: ShieldCheckIcon, color: 'bg-gray-500' },
        ];
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 lg:p-8 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                {getGreeting()}，{user?.username}！
              </h1>
              <p className="mt-2 text-blue-100">
                欢迎使用区块链试卷加密系统，祝您工作顺利
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                <CubeTransparentIcon className="h-5 w-5 mr-2" />
                <span className="text-sm">
                  区块链状态：
                  {blockchainStatus?.blockchain?.connected ? (
                    <span className="ml-1 text-green-300">已连接</span>
                  ) : (
                    <span className="ml-1 text-red-300">未连接</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总考试数"
            value={stats.totalExams}
            icon={DocumentTextIcon}
            color="blue"
            loading={loading}
          />
          <StatCard
            title="待处理"
            value={stats.pendingExams}
            icon={ClockIcon}
            color="yellow"
            loading={loading}
          />
          <StatCard
            title="已批准"
            value={stats.approvedExams}
            icon={CheckCircleIcon}
            color="green"
            loading={loading}
          />
          <StatCard
            title="已完成"
            value={stats.completedExams}
            icon={ShieldCheckIcon}
            color="purple"
            loading={loading}
          />
        </div>

        {/* Quick Actions & Key Warning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {getRoleActions().map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="group flex flex-col items-center p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div className={clsx('p-3 rounded-xl text-white mb-3', action.color)}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                    {action.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Key Status / Notification */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">系统提示</h2>
            {!user?.sm2_public_key ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">密钥未生成</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      请先生成SM2密钥对，否则无法进行加解密操作
                    </p>
                    <Link
                      href="/dashboard/keys"
                      className="mt-3 inline-flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
                    >
                      立即生成 →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">密钥已就绪</h3>
                    <p className="mt-1 text-sm text-green-700">
                      SM2密钥对已生成，可正常使用加解密功能
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">区块链网络</span>
                <span className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  blockchainStatus?.blockchain?.connected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}>
                  {blockchainStatus?.blockchain?.connected ? '正常' : '离线'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-500">IPFS存储</span>
                <span className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  blockchainStatus?.ipfs?.connected
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                )}>
                  {blockchainStatus?.ipfs?.connected ? '正常' : '检测中'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Exams */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">最近考试</h2>
            <Link
              href="/dashboard/exams"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-slate-500">加载中...</p>
              </div>
            ) : recentExams.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      考试名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      科目
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      考试日期
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentExams.map((exam: any) => {
                    const statusConfig = getStatusConfig(exam.status);
                    return (
                      <tr key={exam.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{exam.name}</div>
                          <div className="text-xs text-slate-500">{exam.batch}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {exam.subject_name || exam.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {exam.exam_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx(
                            'inline-flex px-2.5 py-1 rounded-full text-xs font-medium',
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/exams/${exam.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            查看详情
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <DocumentTextIcon className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">暂无考试数据</p>
                {(user?.role === 'admin' || user?.role === 'coe') && (
                  <Link
                    href="/dashboard/exams/create"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                  >
                    创建考试
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'purple';
  loading?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
          ) : (
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
