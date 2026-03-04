'use client';

import {
  CircleAlert as AlertCircle,
  Brain,
  Database,
  Target,
  Users,
  Lightbulb,
  CircleCheck as CheckCircle2,
  GraduationCap,
  Microscope,
  HeartPulse,
  ArrowRight,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectOverview() {
  const objectives = [
    {
      icon: Database,
      title: 'Multimodal Data Integration',
      description:
        'Fusing clinical indicators with lifestyle behavioral patterns from the CDC BRFSS 2015 dataset (253,680 respondents)',
      tag: 'Data Layer',
    },
    {
      icon: Brain,
      title: 'Ensemble Machine Learning',
      description:
        'Soft voting consensus across Logistic Regression, Random Forest, and XGBoost for robust predictions',
      tag: 'ML Engine',
    },
    {
      icon: Lightbulb,
      title: 'Explainable AI (SHAP)',
      description:
        'Local interpretability with SHAP (SHapley Additive exPlanations) values for transparent clinical decision-making',
      tag: 'XAI Engine',
    },
    {
      icon: Target,
      title: 'Multi-Disease Framework',
      description:
        'Scalable modular architecture designed for five lifestyle-induced NCDs with microservices pattern',
      tag: 'Architecture',
    },
  ];

  const diseases = [
    { name: 'Type-2 Diabetes', status: 'active', accuracy: '87.3%', auc: '0.85' },
    { name: 'Cardiovascular Disease', status: 'planned', accuracy: '—', auc: '—' },
    { name: 'Hypertension', status: 'planned', accuracy: '—', auc: '—' },
    { name: 'Chronic Kidney Disease', status: 'planned', accuracy: '—', auc: '—' },
    { name: 'Stroke Risk', status: 'planned', accuracy: '—', auc: '—' },
  ];

  const noveltyFeatures = [
    {
      title: 'Multimodal Fusion',
      description:
        'First-of-its-kind integration of BRFSS lifestyle metrics with clinical biomarkers for holistic NCD assessment',
      icon: Database,
    },
    {
      title: 'Local Interpretability',
      description:
        'SHAP-powered local explanations enabling feature-level transparency for individual patient predictions',
      icon: Lightbulb,
    },
    {
      title: 'Ensemble Consensus',
      description:
        'Soft voting architecture balancing prediction accuracy with computational efficiency and robustness',
      icon: Brain,
    },
    {
      title: 'Modular Scaling',
      description:
        'Microservices design enabling horizontal scaling to multiple disease modules without architectural changes',
      icon: Target,
    },
    {
      title: 'Preventive Focus',
      description:
        'Early intervention through behavioral modification recommendations based on explainable risk factors',
      icon: HeartPulse,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-5 py-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full">
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-medium text-gray-700 tracking-wide">
              B.Tech Final Year Major Project • SRM IST • 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-gray-900 leading-tight tracking-tight">
            An Integrated Explainable AI (XAI) Framework for
            <br className="hidden sm:block" />
            <span className="text-blue-600">
              Early Risk Assessment of Lifestyle-Induced NCDs
            </span>
            <br className="hidden sm:block" />
            <span className="text-gray-600 text-2xl sm:text-3xl lg:text-[2rem]">
              via Multimodal Data Fusion
            </span>
          </h1>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span>
                <strong className="text-gray-900">Vimal M</strong> &{' '}
                <strong className="text-gray-900">Alfred Ferdinand</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Microscope className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span>Department of Computer Science & Engineering</span>
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <Card className="animate-fade-in-up stagger-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <CardTitle className="text-lg">Problem Statement</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm leading-relaxed">
              Non-Communicable Diseases (NCDs) account for{' '}
              <strong className="text-red-600 font-semibold">71% of global mortality</strong>{' '}
              (WHO, 2023), with lifestyle factors being primary contributors. Current AI-driven
              risk assessment tools suffer from two critical limitations:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="font-semibold text-gray-900 text-sm">
                    Black-Box Models
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Lack of interpretability prevents clinical adoption and patient trust in
                  ML-based predictions
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="font-semibold text-gray-900 text-sm">
                    Single-Modal Approaches
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ignoring lifestyle behavioral patterns reduces effectiveness of preventive
                  interventions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Research Objectives */}
        <div className="space-y-5 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Research Objectives</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {objectives.map((objective, index) => {
              const Icon = objective.icon;
              return (
                <Card key={index} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {objective.title}
                          </h3>
                          <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            {objective.tag}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          {objective.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Novelty & Standout Features */}
        <Card className="animate-fade-in-up stagger-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Novelty & Standout Features</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 border-blue-200 bg-blue-50">
                RESEARCH CONTRIBUTION
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {noveltyFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Target Disease Modules */}
        <div className="space-y-5 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Target Disease Modules</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {diseases.map((disease, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-6 py-4 transition-colors ${
                      disease.status === 'active'
                        ? 'bg-blue-50/50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          disease.status === 'active'
                            ? 'bg-green-600'
                            : 'bg-gray-300'
                        }`}
                      />
                      <span
                        className={`font-medium text-sm ${
                          disease.status === 'active'
                            ? 'text-gray-900'
                            : 'text-gray-600'
                        }`}
                      >
                        {disease.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          Accuracy:{' '}
                          <strong className="text-gray-700">{disease.accuracy}</strong>
                        </span>
                        <span>
                          AUC:{' '}
                          <strong className="text-gray-700">{disease.auc}</strong>
                        </span>
                      </div>
                      <Badge
                        variant={disease.status === 'active' ? 'default' : 'secondary'}
                        className={`text-[10px] font-medium ${
                          disease.status === 'active'
                            ? 'bg-green-600 text-white border-transparent'
                            : 'bg-gray-100 text-gray-600 border-transparent'
                        }`}
                      >
                        {disease.status === 'active' ? '● Active' : 'Planned'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SDG & Impact */}
        <Card className="bg-blue-600 border-blue-600 animate-fade-in-up stagger-5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 bg-white/15 rounded-xl shrink-0">
                <HeartPulse className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-white">
                    Aligned with UN SDG 3
                  </h3>
                  <span className="text-[10px] font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                    Good Health & Well-Being
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">
                  This framework contributes to reducing premature mortality from NCDs
                  through prevention and data-driven early intervention, aligning with
                  target 3.4 of the United Nations Sustainable Development Goals.
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-white/50 hidden sm:block shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
