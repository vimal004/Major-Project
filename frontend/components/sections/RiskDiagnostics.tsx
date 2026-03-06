'use client';

import { useState, useEffect, useRef } from 'react';
import {
  TriangleAlert as AlertTriangle,
  CircleCheck as CheckCircle2,
  TrendingUp,
  Lightbulb,
  Brain,
  ArrowRight,
  Shield,
  FileText,
  Stethoscope,
  Target,
  Sparkles,
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  RefreshCw,
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
  ReferenceLine,
} from 'recharts';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:8000';

/**
 * assessmentData shape (passed from page.tsx after the API call):
 * {
 *   patientId: string,
 *   payload: { ... },            // the 21-field input sent to the API
 *   status: "success",
 *   risk_probability: number,
 *   risk_level: string,
 *   shap_data: {
 *     base_value: number,
 *     features: [{ name, value, contribution }, ...]
 *   }
 * }
 */
interface RiskDiagnosticsProps {
  assessmentData: any;
}

// ─────────────────────────────────────────────────────────────────
// Simple markdown renderer for Gemini responses
// ─────────────────────────────────────────────────────────────────
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

    // Headings
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

    // Numbered list
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[2]);
      continue;
    }

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(trimmed.slice(2));
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      continue;
    }

    // Paragraph
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

// ─────────────────────────────────────────────────────────────────
// Chat message type
// ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────
// Quick question suggestions
// ─────────────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  "What foods should I eat to reduce my diabetes risk?",
  "How does my BMI affect my diabetes risk specifically?",
  "What exercise routine would you recommend for me?",
  "Can I reverse my diabetes risk completely?",
  "What medical tests should I get done?",
  "How does stress affect diabetes risk?",
];

export default function RiskDiagnostics({ assessmentData }: RiskDiagnosticsProps) {
  const [animateGauge, setAnimateGauge] = useState(false);

  // AI Interpretation state
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [interpretationError, setInterpretationError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateGauge(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Auto-fetch AI interpretation when data is available
  useEffect(() => {
    if (assessmentData?.status === 'success' && !aiInterpretation && !interpretationLoading) {
      fetchInterpretation();
    }
  }, [assessmentData]);

  // -------------------------------------------------------------------
  // Fetch AI interpretation from Gemini
  // -------------------------------------------------------------------
  const fetchInterpretation = async () => {
    if (!assessmentData || assessmentData.status !== 'success') return;

    setInterpretationLoading(true);
    setInterpretationError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_probability: assessmentData.risk_probability,
          risk_level: assessmentData.risk_level,
          base_value: assessmentData.shap_data?.base_value ?? 0.5,
          features: assessmentData.shap_data?.features ?? [],
          patient_payload: assessmentData.payload ?? null,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const detail = errBody.detail || `Server responded with ${response.status}`;
        // Check if it's a quota/rate-limit error
        if (response.status === 429 || detail.toLowerCase().includes('quota')) {
          throw new Error(
            'All AI models have temporarily exceeded their quota limits. ' +
            'Please wait 1-2 minutes and click "Try Again". ' +
            'This is a free-tier rate limit and will reset automatically.'
          );
        }
        throw new Error(detail);
      }

      const result = await response.json();
      setAiInterpretation(result.interpretation);
    } catch (err: any) {
      console.error('AI interpretation failed:', err);
      const errorMsg = err.message || '';
      if (errorMsg.includes('quota') || errorMsg.includes('429') || errorMsg.includes('rate')) {
        setInterpretationError(
          'AI quota temporarily exceeded. The system tries multiple Gemini models, ' +
          'but all are currently rate-limited. Please wait 1-2 minutes and try again.'
        );
      } else {
        setInterpretationError(
          errorMsg || 'Failed to get AI interpretation. Make sure the backend is running.'
        );
      }
    } finally {
      setInterpretationLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // Send a chat message
  // -------------------------------------------------------------------
  const sendChatMessage = async (question?: string) => {
    const msg = question || chatInput.trim();
    if (!msg || chatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Build history for the API (excluding the current message)
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: msg,
          risk_probability: assessmentData.risk_probability,
          risk_level: assessmentData.risk_level,
          base_value: assessmentData.shap_data?.base_value ?? 0.5,
          features: assessmentData.shap_data?.features ?? [],
          patient_payload: assessmentData.payload ?? null,
          history,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
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

  // -------------------------------------------------------------------
  // Guard: no data yet
  // -------------------------------------------------------------------
  if (!assessmentData || assessmentData.status !== 'success') {
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
                predictions, model consensus, and SHAP-based XAI explanations.
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

  // -------------------------------------------------------------------
  // Unpack the real API response
  // -------------------------------------------------------------------
  const patientId: string = assessmentData.patientId || 'PT-0000';
  const riskProbability: number = assessmentData.risk_probability ?? 0;
  const riskLevel: string = assessmentData.risk_level ?? 'Unknown';
  const baseValue: number = assessmentData.shap_data?.base_value ?? 0.5;
  const shapFeatures: { name: string; value: number; contribution: number }[] =
    assessmentData.shap_data?.features ?? [];

  // -------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------
  const getRiskStyle = (probability: number) => {
    if (probability >= 0.7)
      return {
        bg: 'bg-red-50',
        text: 'text-red-600',
        badgeBg: 'bg-red-50 text-red-700 border border-red-200',
        gaugeColor: '#dc2626',
      };
    if (probability >= 0.4)
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        badgeBg: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
        gaugeColor: '#ca8a04',
      };
    return {
      bg: 'bg-green-50',
      text: 'text-green-600',
      badgeBg: 'bg-green-50 text-green-700 border border-green-200',
      gaugeColor: '#16a34a',
    };
  };

  const riskStyle = getRiskStyle(riskProbability);

  const shapWaterfallData = [...shapFeatures]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((feature) => ({
      name: feature.name,
      contribution: feature.contribution,
      absContribution: Math.abs(feature.contribution),
      label: `${feature.contribution > 0 ? '+' : ''}${(feature.contribution * 100).toFixed(1)}%`,
    }));

  const gaugeData = [
    { name: 'Risk', value: animateGauge ? riskProbability * 100 : 0 },
    { name: 'Safe', value: animateGauge ? (1 - riskProbability) * 100 : 100 },
  ];

  // Compute dynamic domain for SHAP chart
  const maxAbsContrib = Math.max(
    0.05,
    ...shapWaterfallData.map((d) => Math.abs(d.contribution))
  );
  const chartDomain = [
    -Math.ceil(maxAbsContrib * 10) / 10 - 0.2,
    Math.ceil(maxAbsContrib * 10) / 10 + 0.2,
  ];

  // Top risk drivers & protective factors
  const riskDrivers = shapFeatures
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution);

  const protectiveFactors = shapFeatures
    .filter((f) => f.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution);

  // Build risk-level dependent clinical text
  const riskClassName =
    riskProbability >= 0.7
      ? 'high risk'
      : riskProbability >= 0.4
      ? 'moderate risk'
      : 'low risk';

  const riskColorClass =
    riskProbability >= 0.7
      ? 'text-red-600'
      : riskProbability >= 0.4
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-2 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Risk Diagnostics &amp; XAI Analysis
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Patient <strong className="font-mono text-gray-700">{patientId}</strong>{' '}
                • Type-2 Diabetes Module
              </p>
            </div>
            <Badge
              variant="outline"
              className="self-start sm:self-auto text-[10px] font-semibold tracking-wider text-blue-600 border-blue-200 bg-blue-50"
            >
              EXPLAINABLE AI
            </Badge>
          </div>
        </div>

        {/* Risk Score Card */}
        <div className="grid lg:grid-cols-3 gap-5 animate-fade-in-up stagger-1">
          {/* Risk Gauge */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className={`w-4 h-4 ${riskStyle.text}`} />
                Overall Ensemble Risk Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Gauge Chart */}
                <div className="relative w-52 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gaugeData}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        animationDuration={1500}
                        animationBegin={300}
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

                {/* Risk Details */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${riskStyle.badgeBg}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {riskLevel}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                      Soft Voting Ensemble
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    The ensemble consensus indicates{' '}
                    <strong className={riskColorClass}>{riskClassName}</strong> for Type-2
                    Diabetes. Base population risk is{' '}
                    <strong className="text-gray-700">
                      {((assessmentData.shap_data?.base_probability ?? 0.2) * 100).toFixed(1)}%
                    </strong>
                    .
                  </p>
                  {/* Risk Scale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-medium text-gray-400">
                      <span>Low Risk</span>
                      <span>Moderate</span>
                      <span>High Risk</span>
                    </div>
                    <div className="h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 relative">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-gray-800 transition-all duration-1000"
                        style={{
                          left: `${riskProbability * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
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
                <Brain className="w-4 h-4 text-blue-600" />
                Key Risk Drivers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {riskDrivers.slice(0, 3).map((feature, index) => (
                <div key={index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-gray-600">
                      <span>{['🔺', '🔸', '🔹'][index] || '•'}</span>
                      <span>{feature.name}</span>
                    </span>
                    <span className="font-semibold text-red-600">
                      {feature.contribution.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animateGauge
                          ? `${Math.min(
                              (Math.abs(feature.contribution) / maxAbsContrib) * 100,
                              100
                            )}%`
                          : '0%',
                        transitionDelay: `${index * 200 + 500}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {protectiveFactors.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-gray-500">
                      {protectiveFactors.length} protective factor
                      {protectiveFactors.length !== 1 ? 's' : ''} detected
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SHAP Waterfall Analysis */}
        <Card className="animate-fade-in-up stagger-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    SHAP Waterfall Analysis
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Local Interpretability — Feature-level contribution to prediction
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="self-start sm:self-auto text-[9px] font-semibold text-blue-600 border-blue-200 bg-blue-50"
              >
                EXPLAINABLE AI ENGINE
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Interpretation Guide */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong className="text-gray-900">How to interpret:</strong> Each bar represents a{' '}
                <strong className="text-gray-900">Logit Impact Score</strong>. It shows
                how a specific feature pushes the risk prediction{' '}
                <span className="text-red-600 font-semibold">↑ up (risk-increasing)</span> or{' '}
                <span className="text-blue-600 font-semibold">↓ down (protective)</span> from
                the baseline population risk of{' '}
                <strong className="text-gray-900">
                  {((assessmentData.shap_data?.base_probability ?? 0.2) * 100).toFixed(1)}%
                </strong>
                . These scores sum up in log-odds space to produce the final probability.
              </p>
            </div>

            {/* SHAP Chart */}
            {shapWaterfallData.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-2 sm:p-4">
                <ResponsiveContainer width="100%" height={Math.max(280, shapWaterfallData.length * 48)}>
                  <BarChart
                    data={shapWaterfallData}
                    layout="vertical"
                    margin={{ top: 10, right: 60, left: 100, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={chartDomain}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value: number) =>
                        `${value > 0 ? '+' : ''}${value.toFixed(1)}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="4 4" />
                    <Tooltip
                      formatter={(value: any) => [
                        `${value > 1.0 ? 'High' : value > 0 ? 'Medium' : 'Protective'} Impact (${value.toFixed(2)})`,
                        'Logit Impact Score',
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '12px',
                        padding: '10px 14px',
                        boxShadow: 'none',
                      }}
                      labelStyle={{ fontWeight: 600, color: '#111827' }}
                    />
                    <Bar
                      dataKey="contribution"
                      radius={[0, 6, 6, 0]}
                      animationDuration={1200}
                      animationBegin={600}
                    >
                      {shapWaterfallData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.contribution > 0 ? '#dc2626' : '#1a73e8'}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">
                  SHAP feature contributions are not available for this prediction.
                </p>
              </div>
            )}

            {/* Risk/Protective Factor Summary */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-red-600 rounded-sm" />
                  <span className="text-xs font-semibold text-gray-900">
                    Risk-Increasing Factors
                  </span>
                </div>
                <div className="space-y-1.5">
                  {riskDrivers.length > 0 ? (
                    riskDrivers.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-700 font-medium">{feature.name}</span>
                        <span className="font-semibold text-red-600">
                          {feature.contribution.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">None identified</p>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
                  <span className="text-xs font-semibold text-gray-900">
                    Protective Factors
                  </span>
                </div>
                <div className="space-y-1.5">
                  {protectiveFactors.length > 0 ? (
                    protectiveFactors.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-gray-700 font-medium">{feature.name}</span>
                        <span className="font-semibold text-blue-600">
                          {feature.contribution.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">None identified</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════
            AI-POWERED INTERPRETATION (Gemini)
           ═══════════════════════════════════════════════════════════════ */}
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
                      <Sparkles className="w-2.5 h-2.5" />
                      GEMINI AI
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Detailed, human-readable interpretation of SHAP analysis with personalized recommendations
                  </p>
                </div>
              </div>
              {aiInterpretation && (
                <button
                  onClick={fetchInterpretation}
                  disabled={interpretationLoading}
                  className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${interpretationLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {interpretationLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full border-2 border-indigo-200 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    Gemini AI is analyzing your results...
                  </p>
                  <p className="text-xs text-gray-400">
                    Generating personalized interpretation and mitigation strategies
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : interpretationError ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    Interpretation Unavailable
                  </span>
                </div>
                <p className="text-xs text-red-600 leading-relaxed">{interpretationError}</p>
                <button
                  onClick={fetchInterpretation}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              </div>
            ) : aiInterpretation ? (
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50/30 border border-gray-200 rounded-2xl p-5 sm:p-6">
                {renderMarkdown(aiInterpretation)}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════
            FOLLOW-UP CHAT (Gemini)
           ═══════════════════════════════════════════════════════════════ */}
        <Card className="animate-fade-in-up stagger-4 border-2 border-indigo-100">
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base flex items-center gap-2">
                    Ask Follow-up Questions
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full border border-indigo-200">
                      <Bot className="w-2.5 h-2.5" />
                      AI CHAT
                    </span>
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Ask anything about your diagnosis, risk factors, or mitigation strategies
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                  showChat ? 'rotate-180' : ''
                }`}
              />
            </button>
          </CardHeader>

          {showChat && (
            <CardContent className="pt-2 space-y-4">
              {/* Quick Questions */}
              {chatMessages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suggested Questions
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendChatMessage(q)}
                        disabled={chatLoading}
                        className="text-left p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all disabled:opacity-50 disabled:hover:bg-white"
                      >
                        <span className="flex items-start gap-2">
                          <MessageCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          {q}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            msg.role === 'user'
                              ? 'bg-blue-600'
                              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <User className="w-4 h-4 text-white" />
                          ) : (
                            <Bot className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {/* Message bubble */}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3.5 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-[13px] leading-relaxed">{msg.content}</p>
                          ) : (
                            <div>{renderMarkdown(msg.content)}</div>
                          )}
                          <p
                            className={`text-[9px] mt-2 ${
                              msg.role === 'user'
                                ? 'text-blue-200'
                                : 'text-gray-300'
                            }`}
                          >
                            {msg.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    {chatLoading && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-3.5">
                          <div className="flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                                style={{ animationDelay: `${i * 150}ms` }}
                              />
                            ))}
                            <span className="text-[10px] text-gray-400 ml-2">
                              AI is thinking...
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Ask about your diagnosis, risk factors, or what you can do..."
                    disabled={chatLoading}
                    className="w-full pl-4 pr-12 py-3.5 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-60"
                  />
                </div>
                <button
                  onClick={() => sendChatMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-40 disabled:hover:from-indigo-500 disabled:hover:to-purple-600 shrink-0"
                >
                  {chatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                Powered by Google Gemini AI • Responses are for educational purposes only
              </p>
            </CardContent>
          )}
        </Card>

        {/* Clinical Interpretation (static) */}
        <Card className="animate-fade-in-up stagger-5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 rounded-xl">
                <FileText className="w-4 h-4 text-gray-600" />
              </div>
              <CardTitle className="text-base">
                Clinical Interpretation &amp; Recommendations
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  Risk Summary — {patientId}
                </h4>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                This patient presents with a{' '}
                <strong className={riskColorClass}>{riskClassName}</strong> (
                {(riskProbability * 100).toFixed(1)}%) of developing Type-2 Diabetes,
                elevated from the baseline population risk of{' '}
                {(baseValue * 100).toFixed(0)}%.
                {riskDrivers.length > 0
                  ? ' The primary risk drivers identified through SHAP analysis are:'
                  : ''}
              </p>
              {riskDrivers.length > 0 && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {riskDrivers.slice(0, 3).map((feature, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3 border border-gray-200"
                    >
                      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        #{idx + 1} Risk Driver
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mt-1">
                        {feature.name} ({feature.value})
                      </div>
                      <div className="text-[10px] font-semibold text-red-600 mt-0.5">
                        +{(feature.contribution * 100).toFixed(1)}% impact
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Protective Factors */}
            {protectiveFactors.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Protective Factors Identified
                  </h4>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Despite the assessed risk, the patient demonstrates positive lifestyle
                  behaviors including{' '}
                  {protectiveFactors
                    .slice(0, 3)
                    .map(
                      (f) =>
                        `${f.name} (${(f.contribution * 100).toFixed(1)}% impact)`
                    )
                    .join(', ')}
                  . These factors actively mitigate risk and should be maintained and
                  encouraged as part of the intervention plan.
                </p>
              </div>
            )}

            {/* Recommended Interventions */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  Recommended Interventions
                </h4>
              </div>
              <div className="space-y-2.5">
                {[
                  {
                    num: 1,
                    title: 'Weight Management',
                    desc: 'Target BMI reduction through structured dietary intervention and increased physical activity intensity',
                  },
                  {
                    num: 2,
                    title: 'BP Monitoring',
                    desc: 'Regular monitoring and potential pharmacological management of hypertension',
                  },
                  {
                    num: 3,
                    title: 'Dietary Counseling',
                    desc: 'Focus on low glycemic index foods, portion control, and increased fiber intake',
                  },
                  {
                    num: 4,
                    title: 'Follow-up Assessment',
                    desc: 'Repeat risk evaluation in 3 months post-intervention to track progress',
                  },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {item.num}
                    </span>
                    <div className="text-xs text-gray-600 leading-relaxed">
                      <strong className="text-gray-900">{item.title}:</strong>{' '}
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100">
              ⚕ This is a decision-support tool only. Clinical judgment should always supersede
              algorithmic predictions. Consult with qualified healthcare professionals for
              diagnosis and treatment.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
