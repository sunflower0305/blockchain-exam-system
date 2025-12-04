'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi, paperApi } from '@/lib/api';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  LockClosedIcon,
  LockOpenIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';

interface Paper {
  id: string;
  version: number;
  status: string;
  original_filename: string;
  file_size: number;
  ipfs_hash: string;
  blockchain_tx_id: string;
  unlock_time: string;
  created_at: string;
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
  papers: Paper[];
}

const examStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  ready: { label: '待考试', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ongoing: { label: '考试中', color: 'text-red-600', bgColor: 'bg-red-100' },
  finished: { label: '已结束', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

export default function ProctorPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [decrypting, setDecrypting] = useState(false);
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [password, setPassword] = useState('');
  const [decryptedFile, setDecryptedFile] = useState<{
    filename: string;
    content: string;
  } | null>(null);

  const isProctor = user?.role === 'superintendent' || user?.role === 'admin' || user?.role === 'coe';

  useEffect(() => {
    if (isProctor) {
      fetchExams();
    }
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await examApi.getExams();
      // Filter exams that are ready or ongoing
      const relevantExams = (data.results || data).filter(
        (e: Exam) => ['ready', 'ongoing'].includes(e.status)
      );
      setExams(relevantExams);
    } catch (error) {
      toast.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  const canDecrypt = (paper: Paper): { allowed: boolean; message: string } => {
    if (!paper.unlock_time) {
      return { allowed: true, message: '' };
    }

    const unlockTime = new Date(paper.unlock_time);
    const now = new Date();

    if (now < unlockTime) {
      return {
        allowed: false,
        message: `解锁时间: ${unlockTime.toLocaleString('zh-CN')}`,
      };
    }

    return { allowed: true, message: '' };
  };

  const handleDecrypt = async () => {
    if (!selectedPaper || !password) {
      toast.error('请输入密码');
      return;
    }

    setDecrypting(true);
    try {
      const result = await paperApi.decryptPaper(selectedPaper.id, password);
      setDecryptedFile({
        filename: result.filename,
        content: result.content,
      });
      toast.success('试卷解密成功');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '解密失败');
    } finally {
      setDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedFile) return;

    // Convert base64 to blob
    const byteCharacters = atob(decryptedFile.content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    // Determine MIME type
    let mimeType = 'application/octet-stream';
    if (decryptedFile.filename.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (decryptedFile.filename.endsWith('.docx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (decryptedFile.filename.endsWith('.doc')) {
      mimeType = 'application/msword';
    }

    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = decryptedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('文件下载已开始');
  };

  const resetModal = () => {
    setShowDecryptModal(false);
    setSelectedExam(null);
    setSelectedPaper(null);
    setPassword('');
    setDecryptedFile(null);
  };

  if (!isProctor) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-red-800">无权访问</h3>
                <p className="mt-1 text-sm text-red-700">
                  只有监考人员、考试中心和管理员可以访问此页面。
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  您需要先生成SM2密钥对才能解密试卷。
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">监考接收</h1>
          <p className="mt-1 text-sm text-slate-500">
            查看待考试和进行中的考试，在考试时间到达后解密并下载试卷
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">安全提示</h3>
              <p className="mt-1 text-sm text-blue-700">
                试卷设有时间锁，只有在考试开始时间到达后才能解密。解密操作会被记录在区块链审计日志中。
              </p>
            </div>
          </div>
        </div>

        {/* Exams List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">暂无待监考的考试</h3>
            <p className="mt-2 text-sm text-slate-500">
              当前没有待考试或进行中的考试
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => {
              const status = examStatusConfig[exam.status] || examStatusConfig.ready;
              const selectedPaperForExam = exam.papers?.find(p => p.status === 'selected' || p.status === 'on_chain');

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-slate-900">{exam.name}</h3>
                        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium', status.bgColor, status.color)}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.subject?.name}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarDaysIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.exam_date}</span>
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span>{exam.start_time} - {exam.end_time}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-slate-400">批次: </span>
                          <span className="ml-1">{exam.batch}</span>
                        </div>
                      </div>

                      {selectedPaperForExam && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-5 w-5 text-slate-400 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-slate-700">
                                  {selectedPaperForExam.original_filename}
                                </p>
                                <p className="text-xs text-slate-500">
                                  版本 {selectedPaperForExam.version} |
                                  {selectedPaperForExam.status === 'decrypted' ? (
                                    <span className="text-green-600 ml-1">已解密</span>
                                  ) : (
                                    <span className="text-slate-400 ml-1">待解密</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {(() => {
                              const decryptStatus = canDecrypt(selectedPaperForExam);
                              return decryptStatus.allowed ? (
                                <button
                                  onClick={() => {
                                    setSelectedExam(exam);
                                    setSelectedPaper(selectedPaperForExam);
                                    setShowDecryptModal(true);
                                  }}
                                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-colors"
                                >
                                  <LockOpenIcon className="h-4 w-4 mr-2" />
                                  解密试卷
                                </button>
                              ) : (
                                <div className="text-right">
                                  <div className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-500 text-sm rounded-xl">
                                    <LockClosedIcon className="h-4 w-4 mr-2" />
                                    时间锁定中
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">{decryptStatus.message}</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Decrypt Modal */}
        {showDecryptModal && selectedExam && selectedPaper && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">解密试卷</h3>
                <button
                  onClick={resetModal}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {!decryptedFile ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">考试</p>
                    <p className="font-medium text-slate-900">{selectedExam.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedExam.subject?.name} | {selectedExam.exam_date}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">试卷文件</p>
                    <p className="font-medium text-slate-900">{selectedPaper.original_filename}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      IPFS: {selectedPaper.ipfs_hash?.slice(0, 20)}...
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      输入登录密码确认解密
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入您的登录密码"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      密码用于验证身份并解密您的私钥
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <p className="ml-2 text-sm text-yellow-700">
                        解密操作将被记录在审计日志中，请确保您有权限执行此操作。
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={resetModal}
                      className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDecrypt}
                      disabled={decrypting || !password}
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      {decrypting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          解密中...
                        </>
                      ) : (
                        <>
                          <LockOpenIcon className="h-5 w-5 mr-2" />
                          确认解密
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircleIcon className="h-10 w-10 text-green-600" />
                    </div>
                    <h4 className="mt-4 text-lg font-medium text-slate-900">解密成功</h4>
                    <p className="mt-1 text-sm text-slate-500">试卷已成功解密，可以下载</p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-slate-400 mr-2" />
                        <span className="font-medium text-slate-700">{decryptedFile.filename}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={resetModal}
                      className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      关闭
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                      下载试卷
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
