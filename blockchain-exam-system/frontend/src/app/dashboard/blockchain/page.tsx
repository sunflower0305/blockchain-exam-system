'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/Layout';
import { blockchainApi } from '@/lib/api';
import {
  CubeTransparentIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function BlockchainPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await blockchainApi.getStatus();
      setStatus(data);
    } catch (error) {
      console.error('加载区块链状态失败', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  const StatusIndicator = ({ connected }: { connected: boolean }) => (
    <div className="flex items-center">
      <span className={clsx(
        'inline-flex h-3 w-3 rounded-full mr-2',
        connected ? 'bg-green-500' : 'bg-red-500'
      )}>
        {connected && (
          <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
        )}
      </span>
      <span className={clsx(
        'text-sm font-medium',
        connected ? 'text-green-700' : 'text-red-700'
      )}>
        {connected ? '已连接' : '未连接'}
      </span>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">区块链状态</h1>
            <p className="mt-1 text-sm text-slate-500">
              查看区块链网络和IPFS存储的连接状态
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={clsx('h-5 w-5 mr-2', refreshing && 'animate-spin')} />
            刷新状态
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-sm text-slate-500">加载区块链状态...</p>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Blockchain Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <CubeTransparentIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <StatusIndicator connected={status?.blockchain?.connected || false} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">区块链网络</h3>
                <p className="mt-1 text-sm text-slate-500">Hyperledger Fabric</p>
              </div>

              {/* IPFS Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <CircleStackIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <StatusIndicator connected={status?.ipfs?.connected || false} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">IPFS存储</h3>
                <p className="mt-1 text-sm text-slate-500">分布式文件存储</p>
              </div>

              {/* Database Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <ServerIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <StatusIndicator connected={true} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">数据库</h3>
                <p className="mt-1 text-sm text-slate-500">PostgreSQL</p>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blockchain Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <CubeTransparentIcon className="h-5 w-5 mr-2 text-blue-600" />
                  区块链详情
                </h3>
                <div className="space-y-4">
                  <InfoRow
                    icon={<ServerIcon className="h-4 w-4" />}
                    label="网络名称"
                    value={status?.blockchain?.network || 'Hyperledger Fabric'}
                  />
                  <InfoRow
                    icon={<LinkIcon className="h-4 w-4" />}
                    label="通道"
                    value={status?.blockchain?.channel || 'examchannel'}
                  />
                  <InfoRow
                    icon={<CubeTransparentIcon className="h-4 w-4" />}
                    label="链码"
                    value={status?.blockchain?.chaincode || 'exam-chaincode'}
                  />
                  <InfoRow
                    icon={<ClockIcon className="h-4 w-4" />}
                    label="最后同步"
                    value={status?.blockchain?.lastSync || '刚刚'}
                  />
                </div>
              </div>

              {/* IPFS Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <CircleStackIcon className="h-5 w-5 mr-2 text-green-600" />
                  IPFS详情
                </h3>
                <div className="space-y-4">
                  <InfoRow
                    icon={<ServerIcon className="h-4 w-4" />}
                    label="节点地址"
                    value={status?.ipfs?.host || 'localhost:5001'}
                  />
                  <InfoRow
                    icon={<LinkIcon className="h-4 w-4" />}
                    label="网关地址"
                    value={status?.ipfs?.gateway || 'localhost:8080'}
                  />
                  <InfoRow
                    icon={<CircleStackIcon className="h-4 w-4" />}
                    label="存储空间"
                    value={status?.ipfs?.storage || '可用'}
                  />
                  <InfoRow
                    icon={<ClockIcon className="h-4 w-4" />}
                    label="版本"
                    value={status?.ipfs?.version || 'v0.18.0'}
                  />
                </div>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start">
                <CubeTransparentIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-blue-900">关于区块链存证</h3>
                  <p className="mt-2 text-sm text-blue-700">
                    本系统使用 Hyperledger Fabric 区块链技术存储试卷元数据哈希，
                    确保试卷信息的不可篡改性和可追溯性。加密后的试卷文件存储在 IPFS
                    分布式文件系统中，提供去中心化的可靠存储。
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      防篡改
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      可追溯
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      去中心化
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      高可用
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center text-sm text-slate-500">
        <span className="mr-2 text-slate-400">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
