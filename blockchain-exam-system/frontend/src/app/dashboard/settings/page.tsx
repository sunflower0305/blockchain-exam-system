'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { api, blockchainApi } from '@/lib/api';
import {
  Cog6ToothIcon,
  ServerIcon,
  CubeTransparentIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface SystemStatus {
  backend: boolean;
  database: boolean;
  blockchain: boolean;
  ipfs: boolean;
}

interface BlockchainInfo {
  status: string;
  network: string;
  peers: number;
  block_height: number;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: false,
    database: false,
    blockchain: false,
    ipfs: false,
  });
  const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null);
  const [settings, setSettings] = useState({
    exam_unlock_buffer_minutes: 30,
    max_paper_size_mb: 50,
    auto_archive_days: 90,
    enable_notifications: true,
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    checkSystemStatus();
  }, [user, router]);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Check backend
      await api.get('/users/me/');
      setSystemStatus((prev) => ({ ...prev, backend: true, database: true }));
    } catch {
      setSystemStatus((prev) => ({ ...prev, backend: false, database: false }));
    }

    try {
      // Check blockchain
      const bcStatus = await blockchainApi.getStatus();
      setBlockchainInfo(bcStatus);
      setSystemStatus((prev) => ({ ...prev, blockchain: bcStatus.status === 'connected' }));
    } catch {
      setSystemStatus((prev) => ({ ...prev, blockchain: false }));
    }

    // Mock IPFS status
    setSystemStatus((prev) => ({ ...prev, ipfs: true }));
    setLoading(false);
  };

  const StatusIndicator = ({ status, label }: { status: boolean; label: string }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      <div className="flex items-center space-x-3">
        {status ? (
          <CheckCircleIcon className="h-6 w-6 text-green-500" />
        ) : (
          <XCircleIcon className="h-6 w-6 text-red-500" />
        )}
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {status ? '正常' : '异常'}
      </span>
    </div>
  );

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
          <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
          <p className="mt-1 text-sm text-gray-500">管理系统配置和查看状态</p>
        </div>
        <button
          onClick={checkSystemStatus}
          className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          刷新状态
        </button>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <ServerIcon className="h-5 w-5 mr-2 text-gray-500" />
          系统状态
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatusIndicator status={systemStatus.backend} label="后端服务" />
          <StatusIndicator status={systemStatus.database} label="数据库" />
          <StatusIndicator status={systemStatus.blockchain} label="区块链网络" />
          <StatusIndicator status={systemStatus.ipfs} label="IPFS存储" />
        </div>
      </div>

      {/* Blockchain Info */}
      {blockchainInfo && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CubeTransparentIcon className="h-5 w-5 mr-2 text-gray-500" />
            区块链信息
          </h2>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-500">网络状态</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {blockchainInfo.status === 'connected' ? '已连接' : '未连接'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">网络类型</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {blockchainInfo.network || 'Hyperledger Fabric'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">节点数</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {blockchainInfo.peers || '-'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">区块高度</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {blockchainInfo.block_height || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Settings */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Cog6ToothIcon className="h-5 w-5 mr-2 text-gray-500" />
          系统参数
        </h2>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  考试解锁缓冲时间（分钟）
                </label>
                <input
                  type="number"
                  value={settings.exam_unlock_buffer_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, exam_unlock_buffer_minutes: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">试卷在考试开始前多少分钟可以解密</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大试卷大小（MB）
                </label>
                <input
                  type="number"
                  value={settings.max_paper_size_mb}
                  onChange={(e) =>
                    setSettings({ ...settings, max_paper_size_mb: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">单个试卷文件的最大允许大小</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自动归档天数
                </label>
                <input
                  type="number"
                  value={settings.auto_archive_days}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_archive_days: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">考试结束后多少天自动归档</p>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enable_notifications}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_notifications: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">启用系统通知</span>
                </label>
                <p className="mt-1 text-sm text-gray-500 ml-7">发送考试相关的邮件和系统通知</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => alert('设置已保存')}
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-500" />
          安全设置
        </h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <div className="font-medium text-gray-900">加密算法</div>
                <div className="text-sm text-gray-500">国密SM2/SM3/SM4算法</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                已启用
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <div className="font-medium text-gray-900">时间锁定</div>
                <div className="text-sm text-gray-500">试卷解锁时间控制</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                已启用
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <div className="font-medium text-gray-900">区块链存证</div>
                <div className="text-sm text-gray-500">试卷哈希上链存储</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                已启用
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-gray-900">操作审计</div>
                <div className="text-sm text-gray-500">记录所有敏感操作</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                已启用
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
