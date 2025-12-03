'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  ClockIcon,
  DocumentTextIcon,
  CubeTransparentIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BuildingLibraryIcon className="h-8 w-8 text-blue-500" />
              <span className="ml-3 text-xl font-bold text-white">试卷加密系统</span>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-slate-300">欢迎，{user?.username}</span>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    进入系统
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    注册
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <CubeTransparentIcon className="h-5 w-5 text-blue-400 mr-2" />
            <span className="text-blue-300 text-sm">基于 Hyperledger Fabric 区块链</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            安全、透明、不可篡改的
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              试卷管理解决方案
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            采用国密算法（SM2/SM4）与区块链技术，为教育机构提供
            端到端加密的试卷存储、分发和审计解决方案
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isAuthenticated ? '/dashboard' : '/login'}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              立即使用
              <ChevronRightIcon className="h-5 w-5 inline ml-2" />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
            >
              了解更多
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">核心特性</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              结合区块链与国密算法的强大功能，为考试安全保驾护航
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<ShieldCheckIcon className="h-8 w-8" />}
              title="国密算法加密"
              description="采用SM2非对称加密与SM4对称加密，符合国家密码安全标准"
              color="blue"
            />
            <FeatureCard
              icon={<CubeTransparentIcon className="h-8 w-8" />}
              title="区块链存证"
              description="试卷哈希上链存储，确保信息防篡改、可追溯、永久保存"
              color="indigo"
            />
            <FeatureCard
              icon={<ClockIcon className="h-8 w-8" />}
              title="时间锁机制"
              description="智能合约控制，试卷仅在考试时间到达后才能解密访问"
              color="purple"
            />
            <FeatureCard
              icon={<DocumentTextIcon className="h-8 w-8" />}
              title="完整审计日志"
              description="所有操作全程记录在区块链，支持事后审计和责任追溯"
              color="pink"
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">工作流程</h2>
            <p className="text-slate-400">从出题到考试的完整安全流程</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-slate-600 to-transparent -translate-y-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
              <WorkflowStep
                step="1"
                title="COE发起请求"
                desc="考试中心创建考试，向教师发送出题邀请"
              />
              <WorkflowStep
                step="2"
                title="教师出题"
                desc="教师编写试卷并使用SM4密钥本地加密"
              />
              <WorkflowStep
                step="3"
                title="上传存储"
                desc="加密文件上传至IPFS分布式存储"
              />
              <WorkflowStep
                step="4"
                title="哈希上链"
                desc="试卷元数据哈希写入区块链存证"
              />
              <WorkflowStep
                step="5"
                title="考试解密"
                desc="时间到达后，监考人员授权解密试卷"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">角色权限</h2>
            <p className="text-slate-400">多角色分离，职责清晰</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard
              title="考试中心 (COE)"
              permissions={['创建考试', '指派教师', '批准试卷', '查看审计日志']}
              color="purple"
            />
            <RoleCard
              title="教师"
              permissions={['接收出题任务', '编写加密试卷', '上传试卷', '管理密钥']}
              color="blue"
            />
            <RoleCard
              title="监考人员"
              permissions={['查看待监考试', '申请解密试卷', '分发试卷']}
              color="green"
            />
            <RoleCard
              title="系统管理员"
              permissions={['用户管理', '系统配置', '全局审计', '权限管理']}
              color="red"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5"></div>
            <div className="relative">
              <AcademicCapIcon className="h-16 w-16 text-white/80 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">
                开始使用区块链试卷加密系统
              </h2>
              <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                为您的教育机构提供最安全、最可靠的试卷管理解决方案
              </p>
              <Link
                href={isAuthenticated ? '/dashboard' : '/register'}
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-all"
              >
                {isAuthenticated ? '进入控制台' : '立即注册'}
                <ChevronRightIcon className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <BuildingLibraryIcon className="h-8 w-8 text-blue-500" />
              <span className="ml-3 text-lg font-semibold text-white">区块链试卷加密系统</span>
            </div>
            <p className="text-slate-500 text-sm">
              基于 Hyperledger Fabric + 国密算法 | 保障教育考试安全
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'indigo' | 'purple' | 'pink';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30 text-indigo-400',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 hover:scale-105 transition-transform duration-300`}>
      <div className={`inline-flex p-3 rounded-xl bg-slate-800 mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative text-center">
      <div className="relative z-10 w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
        {step}
      </div>
      <h4 className="text-white font-medium mb-2">{title}</h4>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  );
}

function RoleCard({
  title,
  permissions,
  color,
}: {
  title: string;
  permissions: string[];
  color: 'purple' | 'blue' | 'green' | 'red';
}) {
  const colorClasses = {
    purple: 'border-purple-500/30 bg-purple-500/10',
    blue: 'border-blue-500/30 bg-blue-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    red: 'border-red-500/30 bg-red-500/10',
  };

  return (
    <div className={`border ${colorClasses[color]} rounded-2xl p-6`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ul className="space-y-2">
        {permissions.map((permission, index) => (
          <li key={index} className="flex items-center text-sm text-slate-400">
            <LockClosedIcon className="h-4 w-4 mr-2 text-slate-500" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}
