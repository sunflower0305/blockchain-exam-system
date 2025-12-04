'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { useAuthStore } from '@/store/auth';
import clsx from 'clsx';
import {
  HomeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  AcademicCapIcon,
  KeyIcon,
  CubeTransparentIcon,
  ClipboardDocumentListIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: '控制台', href: '/dashboard', icon: HomeIcon },
  { name: '考试管理', href: '/dashboard/exams', icon: ClipboardDocumentListIcon, roles: ['admin', 'coe'] },
  { name: '我的任务', href: '/dashboard/my-tasks', icon: DocumentTextIcon, roles: ['teacher'] },
  { name: '试卷上传', href: '/dashboard/upload', icon: ArrowUpTrayIcon, roles: ['teacher'] },
  { name: '监考接收', href: '/dashboard/proctor', icon: ShieldCheckIcon, roles: ['superintendent', 'admin', 'coe'] },
  { name: '科目管理', href: '/dashboard/subjects', icon: AcademicCapIcon, roles: ['admin', 'coe'] },
  { name: '用户管理', href: '/dashboard/users', icon: UserGroupIcon, roles: ['admin'] },
  { name: '密钥管理', href: '/dashboard/keys', icon: KeyIcon },
  { name: '区块链状态', href: '/dashboard/blockchain', icon: CubeTransparentIcon },
  { name: '审计日志', href: '/dashboard/audit', icon: ClipboardDocumentListIcon, roles: ['admin', 'coe'] },
  { name: '系统设置', href: '/dashboard/settings', icon: Cog6ToothIcon, roles: ['admin'] },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  });

  const getRoleDisplay = (role: string) => {
    const roles: Record<string, string> = {
      admin: '系统管理员',
      coe: '考试中心',
      teacher: '教师',
      superintendent: '监考人员',
      student: '学生',
    };
    return roles[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      coe: 'bg-purple-100 text-purple-700',
      teacher: 'bg-blue-100 text-blue-700',
      superintendent: 'bg-green-100 text-green-700',
      student: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const SidebarContent = () => (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800 px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-slate-700 pb-4 mt-4">
        <BuildingLibraryIcon className="h-8 w-8 text-blue-400" />
        <div className="ml-3">
          <h1 className="text-lg font-bold text-white">试卷加密系统</h1>
          <p className="text-xs text-slate-400">Blockchain Exam Security</p>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-x-3 rounded-lg bg-slate-800/50 p-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white font-semibold">
            {user?.username?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{user?.username}</p>
          <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', getRoleBadgeColor(user?.role || ''))}>
            {getRoleDisplay(user?.role || '')}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={clsx(
                    'group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Logout Button */}
        <div className="mt-auto pt-4 border-t border-slate-700">
          <button
            onClick={() => {
              logout();
              window.location.href = '/login';
            }}
            className="group flex w-full gap-x-3 rounded-lg p-3 text-sm font-medium text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-red-400" />
            退出登录
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                      <XMarkIcon className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarContent />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-slate-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button type="button" className="-m-2.5 p-2.5 text-slate-400 lg:hidden" onClick={() => setSidebarOpen(true)}>
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="flex-1 text-sm font-semibold text-white">试卷加密系统</div>
      </div>
    </>
  );
}
