'use client';

import { useState } from 'react';
import {
  User,
  Activity,
  Heart,
  CircleAlert as AlertCircle,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface PatientAssessmentProps {
  onComplete: (data: any) => void;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/predict';

export default function PatientAssessment({ onComplete }: PatientAssessmentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    patientId: `PT-${Math.floor(Math.random() * 10000)}`,
    age: '',
    sex: '',
    education: '',
    income: '',
    highBP: false,
    highChol: false,
    cholCheck: true,
    bmi: '',
    genHealth: '',
    mentalHealth: 0,
    physHealth: 0,
    smoker: false,
    stroke: false,
    heartDisease: false,
    physActivity: true,
    fruits: true,
    veggies: true,
    hvyAlcohol: false,
    diffWalk: false,
    anyHealthcare: true,
    noDocbcCost: false,
  });

  /**
   * Convert form state → the 21-field payload expected by the FastAPI backend
   * in the exact order: HighBP, HighChol, CholCheck, BMI, Smoker, Stroke,
   * HeartDiseaseorAttack, PhysActivity, Fruits, Veggies, HvyAlcoholConsump,
   * AnyHealthcare, NoDocbcCost, GenHlth, MentHlth, PhysHlth, DiffWalk,
   * Sex, Age, Education, Income
   */
  const buildPayload = () => ({
    HighBP: formData.highBP ? 1.0 : 0.0,
    HighChol: formData.highChol ? 1.0 : 0.0,
    CholCheck: formData.cholCheck ? 1.0 : 0.0,
    BMI: parseFloat(formData.bmi) || 25.0,
    Smoker: formData.smoker ? 1.0 : 0.0,
    Stroke: formData.stroke ? 1.0 : 0.0,
    HeartDiseaseorAttack: formData.heartDisease ? 1.0 : 0.0,
    PhysActivity: formData.physActivity ? 1.0 : 0.0,
    Fruits: formData.fruits ? 1.0 : 0.0,
    Veggies: formData.veggies ? 1.0 : 0.0,
    HvyAlcoholConsump: formData.hvyAlcohol ? 1.0 : 0.0,
    AnyHealthcare: formData.anyHealthcare ? 1.0 : 0.0,
    NoDocbcCost: formData.noDocbcCost ? 1.0 : 0.0,
    GenHlth: parseFloat(formData.genHealth) || 3.0,
    MentHlth: formData.mentalHealth,
    PhysHlth: formData.physHealth,
    DiffWalk: formData.diffWalk ? 1.0 : 0.0,
    Sex: parseFloat(formData.sex) || 0.0,
    Age: parseFloat(formData.age) || 7.0,
    Education: parseFloat(formData.education) || 4.0,
    Income: parseFloat(formData.income) || 5.0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = buildPayload();

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.detail || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      // Pass the API response + patient metadata upstream
      onComplete({
        patientId: formData.patientId,
        payload,
        ...result,
      });
    } catch (err: any) {
      console.error('Prediction request failed:', err);
      setError(err.message || 'Failed to reach the prediction server. Make sure the backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const ageCategories = [
    { value: '1', label: '18–24 years' },
    { value: '2', label: '25–29 years' },
    { value: '3', label: '30–34 years' },
    { value: '4', label: '35–39 years' },
    { value: '5', label: '40–44 years' },
    { value: '6', label: '45–49 years' },
    { value: '7', label: '50–54 years' },
    { value: '8', label: '55–59 years' },
    { value: '9', label: '60–64 years' },
    { value: '10', label: '65–69 years' },
    { value: '11', label: '70–74 years' },
    { value: '12', label: '75–79 years' },
    { value: '13', label: '80+ years' },
  ];

  const educationLevels = [
    { value: '1', label: 'Never attended / Kindergarten only' },
    { value: '2', label: 'Grades 1–8 (Elementary)' },
    { value: '3', label: 'Grades 9–11 (Some High School)' },
    { value: '4', label: 'Grade 12 or GED (High School Grad)' },
    { value: '5', label: '1–3 years of College (Some College)' },
    { value: '6', label: 'College Graduate (4+ years)' },
  ];

  const incomeLevels = [
    { value: '1', label: 'Less than $10,000' },
    { value: '2', label: '$10,000 – $15,000' },
    { value: '3', label: '$15,000 – $20,000' },
    { value: '4', label: '$20,000 – $25,000' },
    { value: '5', label: '$25,000 – $35,000' },
    { value: '6', label: '$35,000 – $50,000' },
    { value: '7', label: '$50,000 – $75,000' },
    { value: '8', label: '$75,000 or more' },
  ];

  const healthScale = [
    { value: '1', label: '1 — Excellent' },
    { value: '2', label: '2 — Very Good' },
    { value: '3', label: '3 — Good' },
    { value: '4', label: '4 — Fair' },
    { value: '5', label: '5 — Poor' },
  ];

  const clinicalToggles = [
    {
      id: 'highBP',
      label: 'High Blood Pressure',
      description: 'Clinician-diagnosed hypertension',
      checked: formData.highBP,
    },
    {
      id: 'highChol',
      label: 'High Cholesterol',
      description: 'Diagnosed high LDL cholesterol',
      checked: formData.highChol,
    },
    {
      id: 'cholCheck',
      label: 'Cholesterol Check',
      description: 'Within the past 5 years',
      checked: formData.cholCheck,
    },
  ];

  const lifestyleToggles = [
    {
      id: 'smoker',
      label: 'Smoker',
      description: 'Smoked ≥100 cigarettes in lifetime',
      checked: formData.smoker,
    },
    {
      id: 'stroke',
      label: 'Stroke History',
      description: 'Ever told you had a stroke',
      checked: formData.stroke,
    },
    {
      id: 'heartDisease',
      label: 'Heart Disease / Attack',
      description: 'CHD or Myocardial Infarction history',
      checked: formData.heartDisease,
    },
    {
      id: 'physActivity',
      label: 'Physical Activity',
      description: 'Exercise in past 30 days (non-work)',
      checked: formData.physActivity,
    },
    {
      id: 'fruits',
      label: 'Fruit Consumption',
      description: '1+ fruit servings per day',
      checked: formData.fruits,
    },
    {
      id: 'veggies',
      label: 'Vegetable Consumption',
      description: '1+ vegetable servings per day',
      checked: formData.veggies,
    },
    {
      id: 'hvyAlcohol',
      label: 'Heavy Alcohol Consumption',
      description: 'Men: ≥14/wk, Women: ≥7/wk',
      checked: formData.hvyAlcohol,
    },
    {
      id: 'diffWalk',
      label: 'Difficulty Walking',
      description: 'Serious difficulty walking or climbing stairs',
      checked: formData.diffWalk,
    },
  ];

  /* ---- NEW: Healthcare Access toggles (covers the 2 missing features) ---- */
  const healthcareToggles = [
    {
      id: 'anyHealthcare',
      label: 'Healthcare Coverage',
      description: 'Has any form of healthcare coverage / insurance',
      checked: formData.anyHealthcare,
    },
    {
      id: 'noDocbcCost',
      label: 'Skipped Doctor Due to Cost',
      description: 'Could not see a doctor in past 12 months due to cost',
      checked: formData.noDocbcCost,
    },
  ];

  const completedFields = [
    formData.age,
    formData.sex,
    formData.education,
    formData.income,
    formData.bmi,
    formData.genHealth,
  ].filter(Boolean).length;
  const totalRequired = 6;
  const progress = Math.round((completedFields / totalRequired) * 100);

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="space-y-4 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Patient Risk Assessment
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                BRFSS 2015 clinical &amp; lifestyle indicators • Type-2 Diabetes Module
              </p>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto text-[10px] font-semibold tracking-wider text-blue-600 border-blue-200 bg-blue-50">
              MULTIMODAL INPUT
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Form Completion</span>
              <span className="text-xs font-semibold text-blue-600">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {completedFields} of {totalRequired} required fields completed
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section A: Demographics */}
          <Card className="animate-fade-in-up stagger-1">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-[15px]">
                    Section A: Demographic &amp; Administrative
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Patient identification and socioeconomic indicators
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientId" className="text-xs font-medium text-gray-600">
                    Patient ID
                  </Label>
                  <Input
                    id="patientId"
                    value={formData.patientId}
                    onChange={(e) => updateField('patientId', e.target.value)}
                    disabled
                    className="bg-gray-50 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex" className="text-xs font-medium text-gray-600">
                    Sex
                  </Label>
                  <Select
                    value={formData.sex}
                    onValueChange={(value) => updateField('sex', value)}
                  >
                    <SelectTrigger className="text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600">
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Female</SelectItem>
                      <SelectItem value="1">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-xs font-medium text-gray-600">
                    Age Category
                  </Label>
                  <Select
                    value={formData.age}
                    onValueChange={(value) => updateField('age', value)}
                  >
                    <SelectTrigger className="text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600">
                      <SelectValue placeholder="Select age range" />
                    </SelectTrigger>
                    <SelectContent>
                      {ageCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education" className="text-xs font-medium text-gray-600">
                    Education Level
                  </Label>
                  <Select
                    value={formData.education}
                    onValueChange={(value) => updateField('education', value)}
                  >
                    <SelectTrigger className="text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600">
                      <SelectValue placeholder="Select education" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="income" className="text-xs font-medium text-gray-600">
                    Annual Household Income
                  </Label>
                  <Select
                    value={formData.income}
                    onValueChange={(value) => updateField('income', value)}
                  >
                    <SelectTrigger className="text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600">
                      <SelectValue placeholder="Select income bracket" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section B: Clinical Indicators */}
          <Card className="animate-fade-in-up stagger-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Heart className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-[15px]">
                    Section B: Clinical Indicators
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Multimodal Input Stream 1 — Biometric &amp; clinical measurements
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold text-blue-600 border-blue-200 bg-blue-50">
                  CLINICAL
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {/* Clinical Toggles */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {clinicalToggles.map((toggle) => (
                  <div
                    key={toggle.id}
                    className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="space-y-0.5 mr-3">
                      <Label
                        htmlFor={toggle.id}
                        className="text-xs font-medium text-gray-700 cursor-pointer"
                      >
                        {toggle.label}
                      </Label>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {toggle.description}
                      </p>
                    </div>
                    <Switch
                      id={toggle.id}
                      checked={toggle.checked}
                      onCheckedChange={(checked) => updateField(toggle.id, checked)}
                    />
                  </div>
                ))}
              </div>

              {/* BMI & General Health */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bmi" className="text-xs font-medium text-gray-600">
                    Body Mass Index (BMI)
                  </Label>
                  <div className="relative">
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      min="10"
                      max="70"
                      placeholder="e.g., 25.3"
                      value={formData.bmi}
                      onChange={(e) => updateField('bmi', e.target.value)}
                      className="text-sm pr-16"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">
                      kg/m²
                    </span>
                  </div>
                  {formData.bmi && (
                    <p
                      className={`text-[10px] font-medium ${
                        Number(formData.bmi) >= 30
                          ? 'text-red-600'
                          : Number(formData.bmi) >= 25
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {Number(formData.bmi) >= 30
                        ? '⚠ Obese range'
                        : Number(formData.bmi) >= 25
                        ? '⚡ Overweight range'
                        : '✓ Healthy range'}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="genHealth" className="text-xs font-medium text-gray-600">
                    General Health Perception
                  </Label>
                  <Select
                    value={formData.genHealth}
                    onValueChange={(value) => updateField('genHealth', value)}
                  >
                    <SelectTrigger className="text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600">
                      <SelectValue placeholder="Self-reported health status" />
                    </SelectTrigger>
                    <SelectContent>
                      {healthScale.map((scale) => (
                        <SelectItem key={scale.value} value={scale.value}>
                          {scale.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-600">
                      Mental Health — Days not good (past 30 days)
                    </Label>
                    <span className="text-sm font-semibold text-gray-900 min-w-[2.5rem] text-right">
                      {formData.mentalHealth}
                    </span>
                  </div>
                  <Slider
                    value={[formData.mentalHealth]}
                    onValueChange={(value) => updateField('mentalHealth', value[0])}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                    <span>0 (None)</span>
                    <span>15</span>
                    <span>30 (Every day)</span>
                  </div>
                </div>
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-600">
                      Physical Health — Days not good (past 30 days)
                    </Label>
                    <span className="text-sm font-semibold text-gray-900 min-w-[2.5rem] text-right">
                      {formData.physHealth}
                    </span>
                  </div>
                  <Slider
                    value={[formData.physHealth]}
                    onValueChange={(value) => updateField('physHealth', value[0])}
                    max={30}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 font-medium">
                    <span>0 (None)</span>
                    <span>15</span>
                    <span>30 (Every day)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section C: Behavioral & Lifestyle */}
          <Card className="animate-fade-in-up stagger-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-[15px]">
                    Section C: Behavioral &amp; Lifestyle Indicators
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Multimodal Input Stream 2 — Lifestyle and behavioral patterns
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold text-blue-600 border-blue-200 bg-blue-50">
                  NOVELTY
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid sm:grid-cols-2 gap-3">
                {lifestyleToggles.map((toggle) => (
                  <div
                    key={toggle.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      toggle.checked
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-0.5 mr-3">
                      <Label
                        htmlFor={toggle.id}
                        className="text-xs font-medium text-gray-700 cursor-pointer"
                      >
                        {toggle.label}
                      </Label>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {toggle.description}
                      </p>
                    </div>
                    <Switch
                      id={toggle.id}
                      checked={toggle.checked}
                      onCheckedChange={(checked) => updateField(toggle.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section D: Healthcare Access */}
          <Card className="animate-fade-in-up stagger-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-[15px]">
                    Section D: Healthcare Access
                  </CardTitle>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Insurance coverage and healthcare access indicators
                  </p>
                </div>
                <Badge variant="outline" className="text-[9px] font-semibold text-blue-600 border-blue-200 bg-blue-50">
                  ACCESS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid sm:grid-cols-2 gap-3">
                {healthcareToggles.map((toggle) => (
                  <div
                    key={toggle.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      toggle.checked
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="space-y-0.5 mr-3">
                      <Label
                        htmlFor={toggle.id}
                        className="text-xs font-medium text-gray-700 cursor-pointer"
                      >
                        {toggle.label}
                      </Label>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {toggle.description}
                      </p>
                    </div>
                    <Switch
                      id={toggle.id}
                      checked={toggle.checked}
                      onCheckedChange={(checked) => updateField(toggle.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card className="bg-white border-gray-200 animate-fade-in-up stagger-4">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3 mb-5">
                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    This assessment uses a{' '}
                    <strong className="text-gray-900">Soft Voting Ensemble</strong> of three
                    base models (Logistic Regression, Random Forest, XGBoost) trained on{' '}
                    <strong className="text-gray-900">253,680 BRFSS 2015 samples</strong>.
                    Results include SHAP-based explanations for clinical interpretability.
                  </p>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 leading-relaxed">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-6 rounded-full transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Running Ensemble Risk Assessment...</span>
                  </div>
                ) : (
                  <span>Run Ensemble Risk Assessment</span>
                )}
              </Button>

              <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> HIPAA Compliant
                </span>
                <span>•</span>
                <span>3 Models × Soft Voting</span>
                <span>•</span>
                <span>SHAP Explanations</span>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
