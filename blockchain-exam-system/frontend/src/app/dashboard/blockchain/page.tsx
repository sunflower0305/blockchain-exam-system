'use client';

import { useEffect, useState } from 'react';
import { blockchainApi, api } from '@/lib/api';
import {
  CubeTransparentIcon,
  ServerIcon,
  CircleStackIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface BlockchainRecord {
  id: string;
  exam: {
    id: string;
    name: string;
    subject: string;
    exam_date: string;
  };
  version: number;
  file_hash: string;
  ipfs_hash: string;
  blockchain_tx_id: string;
  block_number: number;
  status: string;
  uploaded_by: string;
  unlock_time: string;
  created_at: string;
}

interface BlockchainStatus {
  blockchain: {
    connected: boolean;
    mode: string;
    network: string;
    channel: string;
    chaincode: string;
    msp_id: string;
    peer_endpoint: string;
    ledger_height: number;
    lastSync: string;
  };
  ipfs: {
    connected: boolean;
    mode: string;
    host: string;
    gateway: string;
    version: string;
    peer_id: string;
    storage: string;
  };
}

export default function BlockchainPage() {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [records, setRecords] = useState<BlockchainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BlockchainRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'records' | 'verify'>('status');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    loadStatus();
    loadRecords();
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

  const loadRecords = async (page = 1, search = '') => {
    try {
      setRecordsLoading(true);
      const response = await api.get('/blockchain/records/', {
        params: {
          page,
          page_size: pagination.pageSize,
          search: search || undefined,
        },
      });
      setRecords(response.data.records || []);
      setPagination({
        page: response.data.page,
        pageSize: response.data.page_size,
        total: response.data.total,
        totalPages: response.data.total_pages,
      });
    } catch (error) {
      console.error('加载区块链记录失败', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStatus(), loadRecords()]);
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadRecords(1, searchTerm);
  };

  const handleVerify = async (record: BlockchainRecord) => {
    setVerifying(true);
    setSelectedRecord(record);
    try {
      const result = await blockchainApi.verifyPaper(record.id, record.file_hash);
      setVerifyResult(result);
    } catch (error) {
      setVerifyResult({
        is_valid: false,
        message: '验证请求失败',
      });
    } finally {
      setVerifying(false);
    }
  };

  const StatusIndicator = ({ connected }: { connected: boolean }) => (
    <div className="flex items-center">
      <span
        className={clsx(
          'inline-flex h-3 w-3 rounded-full mr-2 relative',
          connected ? 'bg-green-500' : 'bg-red-500'
        )}
      >
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
      </span>
      <span
        className={clsx(
          'text-sm font-medium',
          connected ? 'text-green-700' : 'text-red-700'
        )}
      >
        {connected ? '已连接' : '未连接'}
      </span>
    </div>
  );

  const ModeIndicator = ({ mode }: { mode: string }) => (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        mode === 'real'
          ? 'bg-green-100 text-green-800'
          : mode === 'mock'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-800'
      )}
    >
      {mode === 'real' ? '生产模式' : mode === 'mock' ? '模拟模式' : mode}
    </span>
  );

  const formatHash = (hash: string) => {
    if (!hash) return '-';
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">区块链浏览器</h1>
          <p className="mt-1 text-sm text-slate-500">
            查看区块链网络状态、存证记录和验证试卷完整性
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon
            className={clsx('h-5 w-5 mr-2', refreshing && 'animate-spin')}
          />
          刷新
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'status', name: '网络状态', icon: ServerIcon },
            { id: 'records', name: '存证记录', icon: DocumentTextIcon },
            { id: 'verify', name: '完整性验证', icon: ShieldCheckIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              <tab.icon
                className={clsx(
                  'mr-2 h-5 w-5',
                  activeTab === tab.id
                    ? 'text-blue-500'
                    : 'text-slate-400 group-hover:text-slate-500'
                )}
              />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading && activeTab === 'status' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-500">加载区块链状态...</p>
        </div>
      ) : (
        <>
          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Blockchain Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <CubeTransparentIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <StatusIndicator
                      connected={status?.blockchain?.connected || false}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    区块链网络
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Hyperledger Fabric
                  </p>
                  <div className="mt-2">
                    <ModeIndicator mode={status?.blockchain?.mode || ''} />
                  </div>
                </div>

                {/* IPFS Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <CircleStackIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <StatusIndicator
                      connected={status?.ipfs?.connected || false}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    IPFS存储
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">分布式文件存储</p>
                  <div className="mt-2">
                    <ModeIndicator mode={status?.ipfs?.mode || ''} />
                  </div>
                </div>

                {/* Database Status */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <ServerIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <StatusIndicator connected={true} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    数据库
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">PostgreSQL</p>
                  <div className="mt-2">
                    <ModeIndicator mode="real" />
                  </div>
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
                      value={
                        status?.blockchain?.network || 'Hyperledger Fabric'
                      }
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
                      icon={<ServerIcon className="h-4 w-4" />}
                      label="MSP ID"
                      value={status?.blockchain?.msp_id || 'Org1MSP'}
                    />
                    <InfoRow
                      icon={<CubeTransparentIcon className="h-4 w-4" />}
                      label="账本高度"
                      value={String(status?.blockchain?.ledger_height || 0)}
                    />
                    <InfoRow
                      icon={<ClockIcon className="h-4 w-4" />}
                      label="最后同步"
                      value={formatDate(status?.blockchain?.lastSync || '')}
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
                      label="存储状态"
                      value={status?.ipfs?.storage || '可用'}
                    />
                    <InfoRow
                      icon={<ClockIcon className="h-4 w-4" />}
                      label="版本"
                      value={status?.ipfs?.version || '-'}
                    />
                  </div>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-start">
                  <CubeTransparentIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-blue-900">
                      关于区块链存证
                    </h3>
                    <p className="mt-2 text-sm text-blue-700">
                      本系统使用 Hyperledger Fabric
                      区块链技术存储试卷元数据哈希，
                      确保试卷信息的不可篡改性和可追溯性。加密后的试卷文件存储在
                      IPFS 分布式文件系统中，提供去中心化的可靠存储。
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['防篡改', '可追溯', '去中心化', '高可用'].map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Records Tab */}
          {activeTab === 'records' && (
            <div className="space-y-6">
              {/* Search */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索考试名称、科目或交易ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    搜索
                  </button>
                </div>
              </div>

              {/* Records Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {recordsLoading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-sm text-slate-500">加载记录...</p>
                  </div>
                ) : records.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p>暂无区块链存证记录</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              考试信息
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              交易ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              IPFS哈希
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              区块号
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              上链时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {records.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">
                                  {record.exam.name}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {record.exam.subject}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                  {formatHash(record.blockchain_tx_id)}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                  {formatHash(record.ipfs_hash)}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                #{record.block_number || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={clsx(
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                    record.status === 'on_chain'
                                      ? 'bg-green-100 text-green-800'
                                      : record.status === 'selected'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {record.status === 'on_chain'
                                    ? '已上链'
                                    : record.status === 'selected'
                                    ? '已选定'
                                    : record.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {formatDate(record.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleVerify(record)}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  验证
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                          共 {pagination.total} 条记录
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              loadRecords(pagination.page - 1, searchTerm)
                            }
                            disabled={pagination.page <= 1}
                            className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
                          >
                            上一页
                          </button>
                          <span className="px-3 py-1 text-sm">
                            {pagination.page} / {pagination.totalPages}
                          </span>
                          <button
                            onClick={() =>
                              loadRecords(pagination.page + 1, searchTerm)
                            }
                            disabled={pagination.page >= pagination.totalPages}
                            className="px-3 py-1 border border-slate-300 rounded text-sm disabled:opacity-50"
                          >
                            下一页
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Verify Tab */}
          {activeTab === 'verify' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  试卷完整性验证
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  选择一个已上链的试卷记录进行完整性验证，系统将比对区块链上存储的哈希值与当前文件哈希值是否一致。
                </p>

                {selectedRecord && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-900 mb-2">
                      已选择试卷
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">考试名称：</span>
                        <span className="text-slate-900">
                          {selectedRecord.exam.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">文件哈希：</span>
                        <code className="text-xs bg-white px-2 py-1 rounded">
                          {formatHash(selectedRecord.file_hash)}
                        </code>
                      </div>
                    </div>
                  </div>
                )}

                {verifyResult && (
                  <div
                    className={clsx(
                      'p-4 rounded-lg flex items-start',
                      verifyResult.is_valid
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    )}
                  >
                    {verifyResult.is_valid ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <h4
                        className={clsx(
                          'font-medium',
                          verifyResult.is_valid
                            ? 'text-green-800'
                            : 'text-red-800'
                        )}
                      >
                        {verifyResult.is_valid ? '验证通过' : '验证失败'}
                      </h4>
                      <p
                        className={clsx(
                          'text-sm mt-1',
                          verifyResult.is_valid
                            ? 'text-green-700'
                            : 'text-red-700'
                        )}
                      >
                        {verifyResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {!selectedRecord && (
                  <div className="text-center py-8 text-slate-500">
                    <ShieldCheckIcon className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p>请在"存证记录"标签页中选择一个试卷进行验证</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
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
