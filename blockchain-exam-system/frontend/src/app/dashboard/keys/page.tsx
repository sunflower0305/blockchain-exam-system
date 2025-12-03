'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { DashboardLayout } from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/lib/api';
import {
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const keySchema = z.object({
  password: z.string().min(6, '密码至少6位'),
  confirmPassword: z.string().min(6, '请确认密码'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

type KeyForm = z.infer<typeof keySchema>;

export default function KeysPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<KeyForm>({
    resolver: zodResolver(keySchema),
  });

  const onSubmit = async (data: KeyForm) => {
    setLoading(true);
    try {
      const response = await authApi.generateKeyPair(data.password);
      updateUser({ sm2_public_key: response.public_key });
      toast.success('密钥对生成成功！请妥善保管您的密码');
      reset();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || '密钥生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">密钥管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            管理您的SM2密钥对，用于试卷加密和解密
          </p>
        </div>

        {/* Key Status */}
        <div className={clsx(
          'rounded-2xl border p-6',
          user?.sm2_public_key
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        )}>
          <div className="flex items-start">
            {user?.sm2_public_key ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mt-0.5" />
            )}
            <div className="ml-4 flex-1">
              <h3 className={clsx(
                'text-lg font-medium',
                user?.sm2_public_key ? 'text-green-800' : 'text-yellow-800'
              )}>
                {user?.sm2_public_key ? '密钥已生成' : '密钥未生成'}
              </h3>
              <p className={clsx(
                'mt-1 text-sm',
                user?.sm2_public_key ? 'text-green-700' : 'text-yellow-700'
              )}>
                {user?.sm2_public_key
                  ? '您的SM2密钥对已生成，可以进行试卷加密和解密操作。'
                  : '您需要生成SM2密钥对才能进行试卷加密和解密操作。'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generate Key Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-blue-600" />
              {user?.sm2_public_key ? '重新生成密钥' : '生成密钥对'}
            </h2>

            {user?.sm2_public_key && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <p className="ml-2 text-sm text-yellow-700">
                    重新生成密钥将使旧密钥失效，已加密的试卷需要使用旧密码解密。
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  输入登录密码 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入您的登录密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  确认登录密码 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入登录密码"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  您的私钥将使用登录密码加密保护，请确保输入正确的登录密码。
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '生成中...' : '生成密钥对'}
              </button>
            </form>
          </div>

          {/* Key Info */}
          <div className="space-y-6">
            {/* Public Key Display */}
            {user?.sm2_public_key && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                  公钥信息
                </h2>
                <div className="relative">
                  <div className="p-4 bg-slate-50 rounded-xl font-mono text-xs text-slate-600 break-all">
                    {showPublicKey ? user.sm2_public_key : '••••••••••••••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowPublicKey(!showPublicKey)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showPublicKey ? '隐藏公钥' : '显示公钥'}
                  </button>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
                关于SM2密钥
              </h2>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  <strong>SM2算法</strong>是中国国家密码管理局发布的椭圆曲线公钥密码算法，
                  广泛应用于电子政务和金融领域。
                </p>
                <p>
                  <strong>公钥</strong>用于加密数据，可以公开分享。
                </p>
                <p>
                  <strong>私钥</strong>用于解密数据，由您设置的密码加密保护，请妥善保管密码。
                </p>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-yellow-600">
                    ⚠️ 请牢记您的密钥密码，忘记密码将无法解密已加密的试卷。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
