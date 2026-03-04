'use client';

import { useState } from 'react';
import {
  Activity,
  FileText,
  Stethoscope,
  Network,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';
import ProjectOverview from '@/components/sections/ProjectOverview';
import PatientAssessment from '@/components/sections/PatientAssessment';
import RiskDiagnostics from '@/components/sections/RiskDiagnostics';
import SystemArchitecture from '@/components/sections/SystemArchitecture';

type Section = 'overview' | 'assessment' | 'diagnostics' | 'architecture';

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    {
      id: 'overview' as Section,
      name: 'Project Overview',
      shortName: 'Overview',
      icon: Activity,
      description: 'Introduction & Objectives',
    },
    {
      id: 'assessment' as Section,
      name: 'Patient Assessment',
      shortName: 'Assessment',
      icon: Stethoscope,
      description: 'Clinical Data Input',
    },
    {
      id: 'diagnostics' as Section,
      name: 'Risk Diagnostics',
      shortName: 'Diagnostics',
      icon: FileText,
      description: 'XAI Results & Analysis',
      badge: 'XAI',
    },
    {
      id: 'architecture' as Section,
      name: 'System Architecture',
      shortName: 'Architecture',
      icon: Network,
      description: 'Technical Methodology',
    },
  ];

  const handleAssessmentComplete = (data: any) => {
    setAssessmentData(data);
    setActiveSection('diagnostics');
  };

  const handleNavClick = (id: Section) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full
          bg-white border-r border-gray-200
          flex flex-col
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[280px]'}
          ${mobileMenuOpen ? 'w-[280px] translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className={`border-b border-gray-100 ${sidebarCollapsed ? 'p-3' : 'p-5'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fade-in min-w-0">
                <h1 className="text-base font-semibold text-gray-900 tracking-tight">
                  XAI-CDSS
                </h1>
                <p className="text-[11px] text-gray-500 font-medium truncate">
                  Clinical Decision Support
                </p>
              </div>
            )}
            {/* Mobile Close */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${sidebarCollapsed ? 'p-2' : 'p-3'} space-y-1 overflow-y-auto`}>
          {!sidebarCollapsed && (
            <div className="px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Navigation
              </span>
            </div>
          )}
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={sidebarCollapsed ? item.name : undefined}
                className={`
                  w-full flex items-center gap-3
                  ${sidebarCollapsed ? 'justify-center p-3' : 'p-3 px-4'}
                  rounded-full transition-all duration-200
                  group
                  ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                {!sidebarCollapsed && (
                  <div className="text-left flex-1 min-w-0">
                    <div
                      className={`text-[13px] font-medium leading-tight ${
                        isActive ? 'text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                      {item.description}
                    </div>
                  </div>
                )}
                {!sidebarCollapsed && item.badge && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-gray-100 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              {/* Active Module */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                  Active Module
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                  <span className="text-xs font-medium text-gray-800">
                    Type-2 Diabetes
                  </span>
                </div>
              </div>
              {/* Project Info */}
              <div className="flex items-center gap-2 px-1">
                <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">
                  SRM IST • B.Tech CSE 2025
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2.5 h-2.5 bg-green-600 rounded-full" />
            </div>
          )}
        </div>

        {/* Collapse Toggle - Desktop Only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center hover:bg-gray-50 transition-all z-10"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 shrink-0 z-30">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-400 hidden sm:inline">XAI-CDSS</span>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <span className="font-medium text-gray-900 truncate">
              {navigation.find((n) => n.id === activeSection)?.name}
            </span>
          </div>

          {/* Right Section */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
              <span>Diabetes Module Active</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-gray-500">
              <span className="font-medium">Vimal M & Alfred Ferdinand</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="animate-fade-in">
            {activeSection === 'overview' && <ProjectOverview />}
            {activeSection === 'assessment' && (
              <PatientAssessment onComplete={handleAssessmentComplete} />
            )}
            {activeSection === 'diagnostics' && (
              <RiskDiagnostics assessmentData={assessmentData} />
            )}
            {activeSection === 'architecture' && <SystemArchitecture />}
          </div>
        </main>
      </div>
    </div>
  );
}
