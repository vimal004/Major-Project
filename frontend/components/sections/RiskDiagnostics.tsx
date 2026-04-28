'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  Brain,
  ArrowRight,
  Shield,
  FileText,
  Target,
  Sparkles,
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  RefreshCw,
  Heart,
  Stethoscope,
  Activity,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface RiskDiagnosticsProps {
  assessmentData: any;
}

function renderMarkdown(text: string) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: any[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <Tag
          key={`list-${blockKey++}`}
          className={`${
            listType === 'ol' ? 'list-decimal' : 'list-disc'
          } pl-5 space-y-1.5 text-[13px] text-gray-600 leading-relaxed`}
        >
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (s: string): string => {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>');
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3
          key={`h3-${blockKey++}`}
          className="text-[15px] font-semibold text-gray-900 mt-5 mb-2 flex items-center gap-2"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(3)) }}
        />
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4
          key={`h4-${blockKey++}`}
          className="text-sm font-semibold text-gray-800 mt-4 mb-1.5"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed.slice(4)) }}
        />
      );
      continue;
    }

    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[2]);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed === '') {
      flushList();
      continue;
    }

    flushList();
    elements.push(
      <p
        key={`p-${blockKey++}`}
        className="text-[13px] text-gray-600 leading-relaxed mb-2"
        dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
      />
    );
  }

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "What foods should I eat to reduce my risks?",
  "How does my BMI affect my risk specifically?",
  "What exercise routine would you recommend for me?",
  "Can I reverse my risk completely?",
];

type DiseaseType = 'diabetes' | 'heart' | 'stroke';

export default function RiskDiagnostics({ assessmentData }: RiskDiagnosticsProps) {
  const [activeTab, setActiveTab] = useState<DiseaseType>('diabetes');
  const [animateGauge, setAnimateGauge] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateGauge(true), 300);
    return () => clearTimeout(timer);
  }, [activeTab]); // re-animate on tab change

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!assessmentData || assessmentData.status !== 'success' || !assessmentData.assessments) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                No Assessment Data Available
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
                Please complete the Patient Assessment form first to generate risk
                predictions.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Navigate to &quot;Patient Assessment&quot; to begin</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const patientId: string = assessmentData.patientId || 'PT-0000';
  const assessments = assessmentData.assessments;

  const sendChatMessage = async (question?: string) => {
    const msg = question || chatInput.trim();
    if (!msg || chatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: msg, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
      
      // Send context of the currently active disease
      const currentAssessment = assessments[activeTab];

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: msg,
          context_disease: activeTab,
          risk_probability: currentAssessment.prob,
          risk_level: currentAssessment.level,
          features: currentAssessment.shap_features || [],
          patient_payload: assessmentData.payload || null,
          history,
        }),
      });

      if (!response.ok) throw new Error('Failed to get chat response');
      const result = await response.json();
      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.response, timestamp: new Date() }]);
    } catch (err: any) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const currentAssessment = assessments[activeTab];
  const riskProbability = currentAssessment.prob || 0;
  const riskLevel = currentAssessment.level || 'Unknown';
  const baseValue = currentAssessment.shap_base || 0.5;
  const shapFeatures = currentAssessment.shap_features || [];
  const localInterpretation = currentAssessment.local_interpretation_report || '';
  const aiInterpretation = currentAssessment.ai_interpretation_report || '';
  const aiReportSource = currentAssessment.ai_report_source || 'local_fallback';
  const aiReportError = currentAssessment.ai_report_error || null;

  const getRiskStyle = (prob: number) => {
    if (prob >= 0.7) return { text: 'text-red-600', badgeBg: 'bg-red-50 text-red-700 border border-red-200', gaugeColor: '#dc2626' };
    if (prob >= 0.4) return { text: 'text-yellow-600', badgeBg: 'bg-yellow-50 text-yellow-700 border border-yellow-200', gaugeColor: '#ca8a04' };
    return { text: 'text-green-600', badgeBg: 'bg-green-50 text-green-700 border border-green-200', gaugeColor: '#16a34a' };
  };

  const riskStyle = getRiskStyle(riskProbability);

  const shapWaterfallData = [...shapFeatures]
    .sort((a: any, b: any) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((feature: any) => ({
      name: feature.name,
      contribution: feature.contribution,
      influence: feature.influence_pct ?? Math.abs(feature.contribution),
      direction: feature.contribution > 0 ? 'risk' : 'protective',
    }));

  const gaugeData = [
    { name: 'Risk', value: animateGauge ? riskProbability * 100 : 0 },
    { name: 'Safe', value: animateGauge ? (1 - riskProbability) * 100 : 100 },
  ];

  const maxInfluence = Math.max(10, ...shapWaterfallData.map((d: any) => d.influence));
  const chartDomain = [0, Math.ceil(maxInfluence / 10) * 10 + 5];

  const riskDrivers = shapFeatures.filter((f: any) => f.contribution > 0).sort((a: any, b: any) => b.contribution - a.contribution);
  const protectiveFactors = shapFeatures.filter((f: any) => f.contribution < 0).sort((a: any, b: any) => a.contribution - b.contribution);

  const riskClassName = riskProbability >= 0.7 ? 'high risk' : riskProbability >= 0.4 ? 'moderate risk' : 'low risk';
  const riskColorClass = riskProbability >= 0.7 ? 'text-red-600' : riskProbability >= 0.4 ? 'text-yellow-600' : 'text-green-600';

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Header */}
        <div className="space-y-2 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Multi-Disease Risk Diagnostics &amp; XAI Analysis
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Patient <strong className="font-mono text-gray-700">{patientId}</strong>
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-semibold tracking-wider text-blue-600 border-blue-200 bg-blue-50">
              EXPLAINABLE AI FUSION
            </Badge>
          </div>
        </div>

        {/* Multi-Disease Tabs */}
        <div className="flex bg-white rounded-xl border border-gray-200 p-1 space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('diabetes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'diabetes' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Activity className={`w-4 h-4 ${activeTab === 'diabetes' ? 'text-blue-600' : ''}`} />
            Type-2 Diabetes
          </button>
          <button
            onClick={() => setActiveTab('heart')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'heart' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'heart' ? 'text-red-600' : ''}`} />
            Heart Disease
          </button>
          <button
            onClick={() => setActiveTab('stroke')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'stroke' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Brain className={`w-4 h-4 ${activeTab === 'stroke' ? 'text-purple-600' : ''}`} />
            Stroke Risk
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 animate-fade-in-up stagger-1">
          {/* Risk Gauge */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base capitalize">
                <AlertTriangle className={`w-4 h-4 ${riskStyle.text}`} />
                Overall {activeTab.replace('-', ' ')} Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                <div className="relative w-52 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={65} outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        animationDuration={1000}
                      >
                        <Cell fill={riskStyle.gaugeColor} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center">
                    <div className={`text-3xl font-bold ${riskStyle.text}`}>
                      {(riskProbability * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${riskStyle.badgeBg}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {riskLevel}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                      Soft Voting Ensemble
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed capitalize">
                    The ensemble consensus indicates <strong className={riskColorClass}>{riskClassName}</strong> for {activeTab.replace('-', ' ')}. The model predicts a <strong className="text-gray-700">{(riskProbability * 100).toFixed(1)}%</strong> probability.
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-medium text-gray-400">
                      <span>Low Risk</span><span>Moderate</span><span>High Risk</span>
                    </div>
                    <div className="h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 relative">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-gray-800 transition-all duration-1000"
                        style={{ left: `${riskProbability * 100}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Risk Drivers Quick Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" /> Key Risk Drivers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskDrivers.slice(0, 3).map((feature: any, index: number) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-gray-600">
                      <span>{['🔺', '🔸', '🔹'][index] || '•'}</span>
                      <span>{feature.name}</span>
                    </span>
                    <span className="font-semibold text-red-600">
                      {(feature.influence_pct ?? Math.abs(feature.contribution)).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animateGauge ? `${Math.min(feature.influence_pct ?? Math.abs(feature.contribution), 100)}%` : '0%',
                        transitionDelay: `${index * 200 + 300}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {protectiveFactors.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-gray-500">{protectiveFactors.length} protective factor(s) detected</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Influence Analysis */}
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Feature Influence Analysis (SHAP)</CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">How factors influenced the AI's decision</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold text-blue-600 border-blue-200 bg-blue-50">
                EXPLAINABLE AI
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {shapWaterfallData.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4">
                <ResponsiveContainer width="100%" height={Math.max(280, shapWaterfallData.length * 48)}>
                  <BarChart data={shapWaterfallData} layout="vertical" margin={{ top: 10, right: 60, left: 100, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" domain={chartDomain} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(val) => `${val}%`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any, props: any) => {
                        const dir = props?.payload?.direction === 'risk' ? 'Risk-Increasing' : 'Protective';
                        return [`${Math.abs(Number(val)).toFixed(1)}% (${dir})`, 'Influence'];
                      }}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="influence" radius={[0, 6, 6, 0]} animationDuration={800}>
                      {shapWaterfallData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.direction === 'risk' ? '#dc2626' : '#1a73e8'} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                SHAP feature contributions are not available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI-Powered Interpretation */}
        <Card className="animate-fade-in-up stagger-3 border-2 border-indigo-100">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    AI-Powered Clinical Interpretation
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full border border-indigo-200">
                      {aiReportSource === 'gemini' ? 'GEMINI AI' : 'LOCAL FALLBACK'}
                    </span>
                  </CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full">
                <RefreshCw className="w-3 h-3" /> Derived from latest backend assessment
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {aiInterpretation ? (
              <div className="space-y-3">
                {aiReportError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700">
                    AI generation warning: {aiReportError}
                  </div>
                )}
                <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 border border-gray-200 rounded-2xl p-5 sm:p-6">
                  {renderMarkdown(aiInterpretation)}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
                AI interpretation is unavailable for this assessment.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Local SHAP Interpretation (Offline) */}
        <Card className="animate-fade-in-up stagger-3 border-2 border-blue-100">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <FileText className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Local SHAP Interpretation Report (Offline)
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      NO INTERNET REQUIRED
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Reviewer-friendly explanation of what SHAP values mean and how each feature affects risk.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-semibold text-blue-900">How to read SHAP scores</h4>
              <ul className="list-disc pl-5 text-xs text-blue-900/90 space-y-1.5 leading-relaxed">
                <li><strong>Sign of SHAP value:</strong> positive values push prediction toward higher risk; negative values push toward lower risk.</li>
                <li><strong>Magnitude:</strong> larger absolute values indicate stronger influence on this patient&apos;s prediction.</li>
                <li><strong>Local explanation:</strong> SHAP explains this one patient&apos;s output, not global population-level causality.</li>
                <li><strong>Overall score relation:</strong> baseline risk is adjusted by feature contributions to produce the final probability.</li>
              </ul>
            </div>
            {localInterpretation ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
                {renderMarkdown(localInterpretation)}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">
                Local SHAP interpretation was not returned by backend for this assessment.
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat */}
        <Card className="animate-fade-in-up stagger-4 border-2 border-indigo-100">
          <CardHeader className="pb-2">
            <button onClick={() => setShowChat(!showChat)} className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl"><MessageCircle className="w-4 h-4 text-white" /></div>
                <div className="text-left">
                  <CardTitle className="text-base flex items-center gap-2">Ask Follow-up Questions</CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">Chat with AI about your {activeTab} risk</p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showChat ? 'rotate-180' : ''}`} />
            </button>
          </CardHeader>

          {showChat && (
            <CardContent className="pt-2 space-y-4">
              {chatMessages.length === 0 && (
                <div className="grid sm:grid-cols-2 gap-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i} onClick={() => sendChatMessage(q)} disabled={chatLoading}
                      className="text-left p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {chatMessages.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden p-4 space-y-4 max-h-[400px] overflow-y-auto">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                        {msg.role === 'user' ? <p className="text-[13px]">{msg.content}</p> : renderMarkdown(msg.content)}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /><span className="text-xs text-gray-400">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKeyDown}
                  placeholder="Ask a question..." disabled={chatLoading}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => sendChatMessage()} disabled={!chatInput.trim() || chatLoading}
                  className="w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
