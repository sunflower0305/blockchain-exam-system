'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi, userApi, paperApi } from '@/lib/api';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  CubeTransparentIcon,
  LockOpenIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Teacher {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  department: string;
}

interface Paper {
  id: string;
  version: number;
  status: string;
  original_filename: string;
  file_size: number;
  ipfs_hash: string;
  blockchain_tx_id: string;
  created_at: string;
  uploaded_by_name: string;
}

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
  created_by_name: string;
  assigned_teacher: string | null;
  assigned_teacher_name: string | null;
  papers: Paper[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  requesting: { label: '请求出题中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  submitted: { label: '已提交试卷', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  approved: { label: '已批准', color: 'text-green-600', bgColor: 'bg-green-100' },
  encrypted: { label: '已加密上链', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ready: { label: '待考试', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ongoing: { label: '考试中', color: 'text-red-600', bgColor: 'bg-red-100' },
  finished: { label: '已结束', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const paperStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  uploaded: { label: '已上传', color: 'bg-blue-100 text-blue-700' },
  encrypted: { label: '已加密', color: 'bg-purple-100 text-purple-700' },
  on_chain: { label: '已上链', color: 'bg-green-100 text-green-700' },
  selected: { label: '已选定', color: 'bg-indigo-100 text-indigo-700' },
  decrypted: { label: '已解密', color: 'bg-red-100 text-red-700' },
};

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const examId = params.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCOE = user?.role === 'coe' || user?.role === 'admin';

  useEffect(() => {
    fetchExam();
    if (isCOE) {
      fetchTeachers();
    }
  }, [examId]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const data = await examApi.getExam(examId);
      setExam(data);
    } catch (error) {
      toast.error('获取考试信息失败');
      router.push('/dashboard/exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const data = await userApi.getUsers({ role: 'teacher' });
      setTeachers(data.results || data);
    } catch (error) {
      console.error('获取教师列表失败', error);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      toast.error('请选择教师');
      return;
    }

    setSubmitting(true);
    try {
      await examApi.assignTeacher(examId, selectedTeacher);
      toast.success('教师指派成功');
      setShowAssignModal(false);
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '指派失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePaper = async () => {
    if (!selectedPaper) return;

    setSubmitting(true);
    try {
      await examApi.approvePaper(examId, selectedPaper.id);
      toast.success('试卷已批准');
      setShowApproveModal(false);
      setSelectedPaper(null);
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '审批失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetReady = async () => {
    try {
      await examApi.setReady(examId);
      toast.success('考试状态已更新为待考试');
      fetchExam();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '操作失败');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-slate-500">考试不存在</p>
        </div>
      </DashboardLayout>
    );
  }

  const status = statusConfig[exam.status] || statusConfig.draft;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{exam.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{exam.batch}</p>
            </div>
          </div>
          <span className={clsx('px-3 py-1.5 rounded-full text-sm font-medium', status.bgColor, status.color)}>
            {status.label}
          </span>
        </div>

        {/* Exam Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">考试信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">科目</p>
                <p className="font-medium text-slate-900">{exam.subject?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">考试日期</p>
                <p className="font-medium text-slate-900">{exam.exam_date}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClockIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">考试时间</p>
                <p className="font-medium text-slate-900">
                  {exam.start_time} - {exam.end_time} ({exam.duration_minutes}分钟)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <UserIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">创建人</p>
                <p className="font-medium text-slate-900">{exam.created_by_name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">出题教师</p>
                <p className="font-medium text-slate-900">
                  {exam.assigned_teacher_name || (
                    <span className="text-slate-400">未指派</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {exam.notes && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500 mb-1">备注</p>
              <p className="text-slate-700">{exam.notes}</p>
            </div>
          )}

          {/* COE Actions */}
          {isCOE && (
            <div className="mt-6 flex flex-wrap gap-3">
              {exam.status === 'draft' && !exam.assigned_teacher && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  指派出题教师
                </button>
              )}
              {exam.status === 'approved' && (
                <button
                  onClick={handleSetReady}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  设为待考试
                </button>
              )}
            </div>
          )}
        </div>

        {/* Papers List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">试卷列表</h2>
            <span className="text-sm text-slate-500">共 {exam.papers?.length || 0} 份试卷</span>
          </div>

          {exam.papers && exam.papers.length > 0 ? (
            <div className="space-y-4">
              {exam.papers.map((paper) => {
                const paperStatus = paperStatusConfig[paper.status] || paperStatusConfig.draft;
                return (
                  <div
                    key={paper.id}
                    className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {paper.original_filename}
                          </span>
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', paperStatus.color)}>
                            {paperStatus.label}
                          </span>
                          <span className="text-xs text-slate-500">v{paper.version}</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-500">
                          <div>
                            <span className="text-slate-400">大小: </span>
                            {(paper.file_size / 1024).toFixed(1)} KB
                          </div>
                          <div>
                            <span className="text-slate-400">上传者: </span>
                            {paper.uploaded_by_name}
                          </div>
                          <div>
                            <span className="text-slate-400">时间: </span>
                            {new Date(paper.created_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                        {paper.ipfs_hash && (
                          <div className="mt-2 flex items-center text-sm">
                            <CubeTransparentIcon className="h-4 w-4 text-blue-500 mr-1" />
                            <span className="text-slate-400">IPFS: </span>
                            <span className="ml-1 font-mono text-xs text-slate-600 truncate max-w-[200px]">
                              {paper.ipfs_hash}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        {isCOE && exam.status === 'submitted' && paper.status === 'on_chain' && (
                          <button
                            onClick={() => {
                              setSelectedPaper(paper);
                              setShowApproveModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            批准
                          </button>
                        )}
                        {paper.status === 'selected' && (
                          <span className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm rounded-lg">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            已选定
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-slate-500">暂无试卷</p>
              {exam.status === 'requesting' && (
                <p className="text-sm text-slate-400 mt-1">等待教师上传试卷</p>
              )}
            </div>
          )}
        </div>

        {/* Assign Teacher Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">指派出题教师</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    选择教师
                  </label>
                  <select
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name || teacher.username}
                        {teacher.department && ` - ${teacher.department}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAssignTeacher}
                    disabled={submitting || !selectedTeacher}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '提交中...' : '确认指派'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approve Paper Modal */}
        {showApproveModal && selectedPaper && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">批准试卷</h3>
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">试卷文件</p>
                  <p className="font-medium text-slate-900">{selectedPaper.original_filename}</p>
                  <p className="text-xs text-slate-500 mt-1">版本 {selectedPaper.version}</p>
                </div>
                <p className="text-sm text-slate-600">
                  确认批准此试卷？批准后此试卷将被选定为正式考试试卷。
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowApproveModal(false);
                      setSelectedPaper(null);
                    }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleApprovePaper}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '提交中...' : '确认批准'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
