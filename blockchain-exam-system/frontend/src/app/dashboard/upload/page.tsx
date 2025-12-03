'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { examApi, paperApi } from '@/lib/api';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  CubeTransparentIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Link from 'next/link';

const uploadSchema = z.object({
  password: z.string().min(6, '密码至少6位'),
});

type UploadForm = z.infer<typeof uploadSchema>;

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
  status: string;
}

type UploadStep = 'select' | 'upload' | 'processing' | 'success';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdFromUrl = searchParams.get('exam');

  const { user } = useAuthStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    paper_id: string;
    ipfs_hash: string;
    tx_id: string;
  } | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  });

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (examIdFromUrl && exams.length > 0) {
      const exam = exams.find((e) => e.id === examIdFromUrl);
      if (exam) {
        setSelectedExam(exam);
        setStep('upload');
      }
    }
  }, [examIdFromUrl, exams]);

  const fetchExams = async () => {
    try {
      const data = await examApi.getExams();
      const availableExams = (data.results || data).filter(
        (e: Exam) => e.status === 'requesting'
      );
      setExams(availableExams);
    } catch (error) {
      toast.error('获取考试列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('只支持 PDF 和 Word 文档');
      return;
    }

    if (file.size > maxSize) {
      toast.error('文件大小不能超过 50MB');
      return;
    }

    setFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const processingSteps = [
    { label: '验证文件', icon: DocumentTextIcon },
    { label: 'SM4加密', icon: LockClosedIcon },
    { label: '上传IPFS', icon: CloudArrowUpIcon },
    { label: '区块链存证', icon: CubeTransparentIcon },
  ];

  const onSubmit = async (data: UploadForm) => {
    if (!file || !selectedExam) {
      toast.error('请选择文件');
      return;
    }

    setUploading(true);
    setStep('processing');
    setProcessingStep(0);

    try {
      // Simulate processing steps
      for (let i = 0; i < processingSteps.length; i++) {
        setProcessingStep(i);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const result = await paperApi.uploadPaper(selectedExam.id, file, data.password);

      setUploadResult(result);
      setStep('success');
      toast.success('试卷上传成功！');
      reset();
    } catch (error: any) {
      setStep('upload');
      toast.error(error.response?.data?.error || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSelectedExam(null);
    setStep('select');
    setUploadResult(null);
    reset();
  };

  // Check if user has keys
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
                  您需要先生成SM2密钥对才能上传加密试卷。
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">试卷上传</h1>
          <p className="mt-1 text-sm text-slate-500">
            上传试卷文件，系统将自动加密并存储到IPFS和区块链
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'select', label: '选择考试' },
              { key: 'upload', label: '上传文件' },
              { key: 'processing', label: '处理中' },
              { key: 'success', label: '完成' },
            ].map((s, index) => {
              const steps: UploadStep[] = ['select', 'upload', 'processing', 'success'];
              const currentIndex = steps.indexOf(step);
              const stepIndex = steps.indexOf(s.key as UploadStep);
              const isActive = stepIndex === currentIndex;
              const isCompleted = stepIndex < currentIndex;

              return (
                <div key={s.key} className="flex items-center">
                  <div className="flex items-center">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isCompleted
                          ? 'bg-green-600 text-white'
                          : isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={clsx(
                        'ml-2 text-sm font-medium',
                        isActive ? 'text-blue-600' : 'text-slate-500'
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={clsx(
                        'w-12 h-0.5 mx-4',
                        isCompleted ? 'bg-green-600' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        {step === 'select' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              选择待出题的考试
            </h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-slate-500">暂无待出题的考试任务</p>
                <Link
                  href="/dashboard/my-tasks"
                  className="mt-4 inline-block text-blue-600 hover:text-blue-700"
                >
                  查看所有任务
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <button
                    key={exam.id}
                    onClick={() => {
                      setSelectedExam(exam);
                      setStep('upload');
                    }}
                    className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900">{exam.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {exam.subject?.name} | {exam.batch} | {exam.exam_date}
                        </p>
                      </div>
                      <ArrowUpTrayIcon className="h-5 w-5 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'upload' && selectedExam && (
          <div className="space-y-6">
            {/* Selected Exam Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">选中的考试</p>
                  <p className="font-medium text-blue-900">{selectedExam.name}</p>
                  <p className="text-sm text-blue-700">
                    {selectedExam.subject?.name} | {selectedExam.exam_date} {selectedExam.start_time}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedExam(null);
                    setStep('select');
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                上传试卷文件
              </h2>

              <div
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-300 hover:border-slate-400'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center justify-center space-x-4">
                    <DocumentTextIcon className="h-12 w-12 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <XMarkIcon className="h-5 w-5 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-4 text-slate-600">
                      拖拽文件到此处，或{' '}
                      <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                        点击选择文件
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                        />
                      </label>
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      支持 PDF、Word 文档，最大 50MB
                    </p>
                  </>
                )}
              </div>

              {/* Password Input */}
              {file && (
                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      输入登录密码确认上传
                    </label>
                    <input
                      {...register('password')}
                      type="password"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入您的登录密码"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      密码用于验证身份并加密试卷
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <LockClosedIcon className="h-5 w-5 mr-2" />
                    加密并上传
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg font-medium text-slate-900">正在处理中...</p>
            </div>

            <div className="space-y-4 max-w-md mx-auto">
              {processingSteps.map((s, index) => {
                const Icon = s.icon;
                const isActive = index === processingStep;
                const isCompleted = index < processingStep;

                return (
                  <div
                    key={s.label}
                    className={clsx(
                      'flex items-center p-3 rounded-xl transition-colors',
                      isActive ? 'bg-blue-50' : isCompleted ? 'bg-green-50' : 'bg-slate-50'
                    )}
                  >
                    <div
                      className={clsx(
                        'p-2 rounded-lg',
                        isActive
                          ? 'bg-blue-100'
                          : isCompleted
                          ? 'bg-green-100'
                          : 'bg-slate-200'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'h-5 w-5',
                          isActive
                            ? 'text-blue-600'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-slate-400'
                        )}
                      />
                    </div>
                    <span
                      className={clsx(
                        'ml-3 font-medium',
                        isActive
                          ? 'text-blue-700'
                          : isCompleted
                          ? 'text-green-700'
                          : 'text-slate-500'
                      )}
                    >
                      {s.label}
                    </span>
                    {isCompleted && (
                      <CheckCircleIcon className="ml-auto h-5 w-5 text-green-600" />
                    )}
                    {isActive && (
                      <div className="ml-auto animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'success' && uploadResult && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">上传成功！</h2>
              <p className="mt-2 text-slate-500">试卷已加密并安全存储</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">试卷ID</span>
                <span className="text-sm font-mono text-slate-700">{uploadResult.paper_id}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-200">
                <span className="text-sm text-slate-500">IPFS哈希</span>
                <span className="text-sm font-mono text-slate-700 truncate max-w-[200px]">
                  {uploadResult.ipfs_hash}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-500">区块链交易</span>
                <span className="text-sm font-mono text-slate-700 truncate max-w-[200px]">
                  {uploadResult.tx_id || '已上链'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
              >
                继续上传
              </button>
              <Link
                href="/dashboard/my-tasks"
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-center"
              >
                返回任务列表
              </Link>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-slate-50 rounded-2xl p-6">
          <h3 className="font-medium text-slate-900 flex items-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
            安全说明
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• 试卷将使用SM4国密算法进行加密</li>
            <li>• 加密文件存储在分布式IPFS网络中</li>
            <li>• 文件哈希和元数据记录在区块链上，确保不可篡改</li>
            <li>• 只有在考试时间到达后，授权人员才能解密试卷</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
