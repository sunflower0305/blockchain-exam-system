'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { examApi, subjectApi, api } from '@/lib/api';
import {
  DocumentTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  AcademicCapIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const examSchema = z.object({
  name: z.string().min(1, '请输入考试名称'),
  subject: z.string().min(1, '请选择科目'),
  batch: z.string().min(1, '请输入考试批次'),
  exam_date: z.string().min(1, '请选择考试日期'),
  start_time: z.string().min(1, '请选择开始时间'),
  end_time: z.string().min(1, '请选择结束时间'),
  duration_minutes: z.number().min(1, '请输入考试时长'),
  assigned_teacher: z.string().optional(),
  notes: z.string().optional(),
});

type ExamForm = z.infer<typeof examSchema>;

export default function CreateExamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      duration_minutes: 120,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 加载科目列表
      const subjectsData = await subjectApi.getSubjects();
      setSubjects(subjectsData.results || subjectsData || []);

      // 加载教师列表
      try {
        const response = await api.get('/users/', { params: { role: 'teacher' } });
        setTeachers(response.data.results || response.data || []);
      } catch {
        setTeachers([]);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    }
  };

  const onSubmit = async (data: ExamForm) => {
    setLoading(true);
    try {
      await examApi.createExam({
        ...data,
        subject: parseInt(data.subject),
        assigned_teacher: data.assigned_teacher ? parseInt(data.assigned_teacher) : undefined,
      });
      toast.success('考试创建成功');
      router.push('/dashboard/exams');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">创建考试</h1>
            <p className="mt-1 text-sm text-slate-500">填写考试信息并分配教师</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
              基本信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  考试名称 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：2024年春季期末考试"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                  科目 <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('subject')}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">请选择科目</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </option>
                  ))}
                </select>
                {errors.subject && (
                  <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  考试批次 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('batch')}
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例：2024春季A组"
                />
                {errors.batch && (
                  <p className="mt-1 text-sm text-red-600">{errors.batch.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <CalendarDaysIcon className="h-5 w-5 mr-2 text-green-600" />
              时间设置
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  考试日期 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('exam_date')}
                  type="date"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.exam_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.exam_date.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  考试时长（分钟） <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('duration_minutes', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="120"
                />
                {errors.duration_minutes && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration_minutes.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  开始时间 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('start_time')}
                  type="time"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  结束时间 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('end_time')}
                  type="time"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Assignment */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-purple-600" />
              教师分配
            </h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                负责教师（可选）
              </label>
              <select
                {...register('assigned_teacher')}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">稍后分配</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.username} - {teacher.department || '未设置部门'}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-500">
                分配教师后，教师将收到出题通知
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">备注</h2>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="输入其他说明或要求..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '创建中...' : '创建考试'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
