'use client';

import {
  Server,
  Database,
  Cpu,
  GitBranch,
  Layers,
  Zap,
  Code,
  Activity,
  ArrowRight,
  CircleCheck as CheckCircle2,
  Box,
  Workflow,
  BarChart3,
  Shield,
  Clock,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SystemArchitecture() {
  const architectureLayers = [
    {
      name: 'Presentation Layer',
      icon: Code,
      components: ['Next.js 13', 'TypeScript', 'Tailwind CSS', 'Recharts', 'shadcn/ui'],
      description: 'Responsive clinical-grade dashboard with real-time interactive visualization',
    },
    {
      name: 'API Gateway',
      icon: Server,
      components: ['FastAPI', 'Pydantic Validation', 'CORS Middleware', 'JWT Auth'],
      description: 'RESTful endpoints with request validation, rate limiting, and authentication',
    },
    {
      name: 'ML Inference Engine',
      icon: Cpu,
      components: ['Scikit-learn', 'XGBoost', 'Ensemble Voting', 'Model Versioning'],
      description: 'Soft voting consensus across three optimized classifiers',
    },
    {
      name: 'XAI Engine',
      icon: Zap,
      components: ['SHAP', 'TreeExplainer', 'Feature Attribution', 'Waterfall Plots'],
      description: 'Local and global interpretability using Shapley additive explanations',
    },
    {
      name: 'Data Layer',
      icon: Database,
      components: ['BRFSS 2015 Dataset', 'Feature Store', 'Model Registry', 'Supabase'],
      description: 'Structured storage for training data, model artifacts, and inference results',
    },
  ];

  const methodologySteps = [
    {
      title: 'Data Preprocessing',
      icon: Database,
      steps: [
        'Loaded 253,680 samples from CDC BRFSS 2015 dataset',
        'Handled missing values using mode/median imputation strategies',
        'Encoded categorical variables (Age, Education, Income levels)',
        'Normalized continuous features (BMI, Mental Health scores)',
      ],
      number: '01',
    },
    {
      title: 'Class Imbalance Handling',
      icon: GitBranch,
      steps: [
        'Identified 14% positive class (diabetes) severe imbalance',
        'Applied SMOTE (Synthetic Minority Oversampling Technique)',
        'Achieved balanced training set with 50-50 class distribution',
        'Validated on original imbalanced test set for realistic metrics',
      ],
      number: '02',
    },
    {
      title: 'Model Training & Tuning',
      icon: Cpu,
      steps: [
        'Trained 3 base models with stratified 5-fold cross-validation',
        'Logistic Regression: L2 regularization, C=1.0',
        'Random Forest: 200 trees, max_depth=15, min_samples_split=5',
        'XGBoost: learning_rate=0.1, n_estimators=150, max_depth=6',
      ],
      number: '03',
    },
    {
      title: 'Ensemble Architecture',
      icon: Layers,
      steps: [
        'Implemented Soft Voting Classifier ensemble strategy',
        'Weighted average of class probability predictions',
        'Achieved 87.3% accuracy with 0.85 AUC-ROC score',
        'Balanced precision (0.82) and recall (0.84)',
      ],
      number: '04',
    },
    {
      title: 'XAI Integration (SHAP)',
      icon: Zap,
      steps: [
        'Computed SHAP values using optimized TreeExplainer',
        'Generated local explanations per individual prediction',
        'Created waterfall & force plots for visual interpretability',
        'Extracted global feature importance rankings for model auditing',
      ],
      number: '05',
    },
  ];

  const techStack = [
    {
      category: 'Backend & ML',
      items: [
        { name: 'Python 3.11', icon: '🐍', desc: 'Core language' },
        { name: 'FastAPI', icon: '⚡', desc: 'REST API' },
        { name: 'Scikit-learn', icon: '🤖', desc: 'ML framework' },
        { name: 'XGBoost', icon: '🚀', desc: 'Gradient boosting' },
        { name: 'SHAP', icon: '💡', desc: 'Explainability' },
        { name: 'Pandas/NumPy', icon: '🐼', desc: 'Data processing' },
      ],
    },
    {
      category: 'Frontend',
      items: [
        { name: 'Next.js 13', icon: '▲', desc: 'React framework' },
        { name: 'TypeScript', icon: '📘', desc: 'Type safety' },
        { name: 'Tailwind CSS', icon: '🎨', desc: 'Utility CSS' },
        { name: 'Recharts', icon: '📊', desc: 'Visualization' },
        { name: 'shadcn/ui', icon: '🎯', desc: 'UI components' },
        { name: 'Lucide Icons', icon: '✨', desc: 'Icon library' },
      ],
    },
    {
      category: 'DevOps & Infra',
      items: [
        { name: 'Git / GitHub', icon: '📂', desc: 'Version control' },
        { name: 'Jupyter', icon: '📓', desc: 'Experimentation' },
        { name: 'Docker', icon: '🐳', desc: 'Containerization' },
        { name: 'Supabase', icon: '🗄️', desc: 'Database' },
        { name: 'Vercel', icon: '🌐', desc: 'Deployment' },
      ],
    },
  ];

  const performanceMetrics = [
    { label: 'Accuracy', value: '87.3%', desc: 'Overall' },
    { label: 'AUC-ROC', value: '0.85', desc: 'Threshold-independent' },
    { label: 'Precision', value: '0.82', desc: 'Positive predictive' },
    { label: 'Recall', value: '0.84', desc: 'Sensitivity' },
    { label: 'F1-Score', value: '0.83', desc: 'Harmonic mean' },
    { label: 'Latency', value: '~850ms', desc: 'End-to-end' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header */}
        <div className="space-y-2 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                System Architecture & Methodology
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Microservices-inspired modular design for scalable clinical decision support
              </p>
            </div>
            <Badge
              variant="outline"
              className="self-start sm:self-auto text-[10px] font-semibold tracking-wider text-blue-600 border-blue-200 bg-blue-50"
            >
              SOFTWARE ENGINEERING
            </Badge>
          </div>
        </div>

        {/* Architecture Overview */}
        <Card className="animate-fade-in-up stagger-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Workflow className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-base">Architecture Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-gray-600 leading-relaxed">
              The XAI-CDSS framework follows a{' '}
              <strong className="text-gray-900">layered microservices architecture</strong>{' '}
              with clear separation of concerns. Each layer is independently scalable and
              maintainable, enabling horizontal expansion to additional disease modules
              without requiring architectural refactoring.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-900">
                  Key Design Principles
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  'Separation of ML inference from business logic',
                  'Stateless API design for horizontal scaling',
                  'Model versioning and A/B testing capability',
                  'Real-time XAI computation (no batch processing)',
                ].map((principle, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600">
                    <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                    <span>{principle}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Layers */}
        <div className="space-y-4 animate-fade-in-up stagger-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">System Layers & Components</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-3">
            {architectureLayers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <Card key={index} className="card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="p-2.5 rounded-xl bg-blue-50 shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {layer.name}
                          </h3>
                          {index < architectureLayers.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2.5">
                          {layer.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {layer.components.map((component, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
                            >
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* System Data Flow Diagram */}
        <Card className="bg-gray-900 border-gray-800 animate-fade-in-up stagger-3 overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white">System Data Flow</h3>
                <p className="text-xs text-gray-400 mt-1">
                  End-to-end request lifecycle from patient input to XAI response
                </p>
              </div>

              {/* Flow Diagram */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {[
                  { icon: Code, label: 'Frontend', sub: 'Next.js Dashboard' },
                  { icon: Server, label: 'API Gateway', sub: 'FastAPI REST' },
                  { icon: Cpu, label: 'ML Engine', sub: 'Ensemble Voting' },
                  { icon: Zap, label: 'XAI Engine', sub: 'SHAP Analysis' },
                  { icon: Activity, label: 'JSON Response', sub: 'Risk + Explanations' },
                ].map((node, index, arr) => {
                  const NodeIcon = node.icon;
                  return (
                    <div key={index} className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-[80px] sm:min-w-[100px] text-center">
                        <div className="bg-white/[0.06] rounded-2xl p-3 sm:p-4 border border-white/10 hover:bg-white/[0.1] transition-colors">
                          <NodeIcon className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1.5 text-blue-400" />
                          <div className="text-xs sm:text-sm font-medium text-white">{node.label}</div>
                          <div className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                            {node.sub}
                          </div>
                        </div>
                      </div>
                      {index < arr.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-blue-400/50 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Avg. latency: <strong className="text-blue-400 ml-0.5">~850ms</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Stateless design
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  REST API
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Methodology Pipeline */}
        <div className="space-y-4 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">ML Pipeline Methodology</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {methodologySteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="card-hover h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-50">
                        <Icon className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs leading-tight">{step.title}</CardTitle>
                      </div>
                      <span className="text-[10px] font-semibold text-gray-300">
                        {step.number}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {step.steps.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                          <span className="text-gray-600 leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Technology Stack */}
        <Card className="animate-fade-in-up stagger-5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 rounded-xl">
                <Box className="w-4 h-4 text-gray-600" />
              </div>
              <CardTitle className="text-base">Technology Stack</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {techStack.map((category, index) => (
                <div key={index} className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider pb-1.5 border-b border-gray-100">
                    {category.category}
                  </h3>
                  <div className="space-y-1.5">
                    {category.items.map((tech, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <span className="text-base">{tech.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium text-gray-700">
                            {tech.name}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1.5">
                            {tech.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="animate-fade-in-up stagger-6">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-xl">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Model Performance Metrics
                </h3>
                <p className="text-[11px] text-gray-400">
                  Evaluated on 20% holdout test set with original class distribution
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {performanceMetrics.map((metric, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-center card-hover"
                >
                  <div className="text-2xl font-bold text-blue-600">
                    {metric.value}
                  </div>
                  <div className="text-[11px] font-medium text-gray-700 mt-1">
                    {metric.label}
                  </div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{metric.desc}</div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed text-center">
              Outperforms individual model baselines by{' '}
              <strong className="text-gray-600">4.2% accuracy</strong> while providing
              interpretable predictions through SHAP integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
