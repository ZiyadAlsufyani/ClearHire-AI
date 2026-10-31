"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Upload,
  FileSignature,
  Laptop,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  KeyRound,
  BookOpen,
  Image as ImageIcon,
  Trash2,
  Wand2,
  RotateCcw,
  UserCheck,
  Scale,

  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentStateVisualizer } from "@/components/agent-state-visualizer";
import { MarkdownContractViewer } from "@/components/markdown-contract-viewer";
import { ItTicketViewer } from "@/components/it-ticket-viewer";
import {
  COMPANY_SALARY_BANDS,
  PRESET_SCENARIOS,
  PolicyVerificationResult,
  ItTicketPayload,
  AgentStepLog,
  ExtractedCandidate,
  evaluateHrPolicy,
  matchRoleBand,
} from "@/lib/policies";
import { generateSampleHandwrittenNoteImage } from "@/lib/sample-handwritten-note";

type WorkflowStatus =
  | "idle"
  | "running"
  | "awaiting_override"
  | "completed"
  | "rejected"
  | "error";

export default function ClearHireDashboard() {
  // Left Panel Input State
  const [prompt, setPrompt] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    fileName: string;
    fallbackHint?: string;
  } | null>(null);
  const [isExtractingImage, setIsExtractingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation modal state when Gemini API fails (do NOT auto-switch to sandbox)
  const [sandboxConfirmModal, setSandboxConfirmModal] = useState<{
    open: boolean;
    errorMessage: string;
    pendingAction:
      | {
          type: "run_agent";
          overrideMode: "none" | "approve_exception" | "cap_to_band";
        }
      | {
          type: "extract_image";
          imageObj: {
            dataUrl: string;
            mimeType: string;
            fileName: string;
            fallbackHint?: string;
          };
        }
      | null;
  }>({
    open: false,
    errorMessage: "",
    pendingAction: null,
  });

  // Optional browser-side Gemini API key (if not in .env.local) & Model selection
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [activeModelName, setActiveModelName] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);
  const [showScenarios, setShowScenarios] = useState<boolean>(false);

  // Agent Execution & Right Panel Workspace State
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeLoadingStage, setActiveLoadingStage] = useState<number>(0);
  const [maxLoadingStage, setMaxLoadingStage] = useState<number>(3);
  const [steps, setSteps] = useState<AgentStepLog[]>([]);
  const [candidate, setCandidate] = useState<ExtractedCandidate | null>(null);
  const [policyResult, setPolicyResult] =
    useState<PolicyVerificationResult | null>(null);
  const [offerLetterMarkdown, setOfferLetterMarkdown] = useState<string | null>(
    null
  );
  const [itTicket, setItTicket] = useState<ItTicketPayload | null>(null);
  const [agentSummary, setAgentSummary] = useState<string>("");
  const [engineMode, setEngineMode] = useState<
    "gemini_live" | "simulated_fallback" | null
  >(null);
  const [activeTab, setActiveTab] = useState<string>("offer");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animate real-time step progression while waiting for backend tool calling
  useEffect(() => {
    if (!isLoading) {
      setActiveLoadingStage(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveLoadingStage((prev) =>
        prev < maxLoadingStage ? prev + 1 : prev
      );
    }, 550);
    return () => clearInterval(interval);
  }, [isLoading, maxLoadingStage]);

  // Extract text from an uploaded or sample image via Gemini Vision
  const extractImageNotes = async (
    imageObj: {
      dataUrl: string;
      mimeType: string;
      fileName: string;
      fallbackHint?: string;
    },
    forceSandbox: boolean = false
  ) => {
    setIsExtractingImage(true);
    setErrorMessage(null);
    if (!forceSandbox) {
      setPrompt("");
    }

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "extract_image",
          imageBase64: imageObj.dataUrl,
          imageMimeType: imageObj.mimeType,
          fallbackHint: imageObj.fallbackHint,
          apiKey: customApiKey || undefined,
          selectedModel,
          forceSandbox,
        }),
      });

      const data = await response.json();

      if (data.status === "gemini_error") {
        setSandboxConfirmModal({
          open: true,
          errorMessage:
            data.errorMessage ||
            "Failed to communicate with Gemini Vision API.",
          pendingAction: {
            type: "extract_image",
            imageObj,
          },
        });
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Failed to extract text from the uploaded image."
        );
      }

      setPrompt(data.extractedText || "");
      setEngineMode(data.engineMode || null);
      setActiveModelName(data.model || null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Unexpected error extracting text from image."
      );
    } finally {
      setIsExtractingImage(false);
    }
  };

  // Handle local image upload for Multimodal Handwritten Note / Resume Analysis (P1)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newImage = {
        dataUrl: result,
        mimeType: file.type || "image/png",
        fileName: file.name,
      };
      setUploadedImage(newImage);
      extractImageNotes(newImage, false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Load 1-Click Sample Handwritten Note Image (P1 Demo Helper)
  const handleGenerateSampleNote = (variant: "compliant" | "violation") => {
    const sample = generateSampleHandwrittenNoteImage(variant);
    const newImage = {
      dataUrl: sample.dataUrl,
      mimeType: sample.mimeType,
      fileName: sample.fileName,
      fallbackHint: sample.extractedHint,
    };
    setUploadedImage(newImage);
    extractImageNotes(newImage, false);
  };

  // Execute the Autonomous Onboarding Agent API
  const runOnboardingAgent = async (
    overrideMode: "none" | "approve_exception" | "cap_to_band" = "none",
    forceSandbox: boolean = false
  ) => {
    if (!prompt.trim() || isExtractingImage) return;

    // Pre-determine if this request will halt at verify_hr_policy() so the UI
    // visualizer stops immediately at HR policy verification on violations
    if (overrideMode === "none") {
      const text = prompt.trim();
      const roleMatch = text.match(
        /(?:for|as|role\s*[:=-]|position\s*[:=-]|title\s*[:=-])\s+(?:a\s+|an\s+|the\s+)?([A-Za-z0-9\s/+-]+?)(?:,|\.|;|at\s+\d|with\s+\d|offered|\d+\s*k|\d{2,3},?\d{3}|starts|starting|wants|needs|requested|\n|$)/i
      );
      const detectedRole = roleMatch?.[1]?.trim() || text;
      const band = matchRoleBand(detectedRole);
      const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\s*(?:sar)?/i);
      const fullNumMatch = text.match(
        /(\d{2,3},\d{3}|\d{5,6})\s*(?:sar|riyal|per\s*month|\/month)?/i
      );
      const detectedSalary = kMatch
        ? Math.round(parseFloat(kMatch[1]) * 1000)
        : fullNumMatch
        ? parseInt(fullNumMatch[1].replace(/,/g, ""), 10)
        : band.maxSalarySAR;
      const customReqs: string[] = [];
      const ptoMatch = text.match(/(\d+\s*days?\s*(?:pto|leave|vacation|holiday))/i);
      if (ptoMatch) customReqs.push(ptoMatch[1]);
      if (/100%\s*(?:fully\s*)?remote|fully\s*remote|work\s*from\s*abroad/i.test(text)) {
        customReqs.push("100% Fully Remote Work Arrangement");
      }
      if (/4-day|4\s+day\s+work/i.test(text)) {
        customReqs.push("4-day workweek schedule");
      }
      const bonusMatch = text.match(/(\d+\s*k?\s*(?:sar\s*)?(?:signing|sign-on)\s*bonus)/i);
      if (bonusMatch) customReqs.push(bonusMatch[1]);

      const check = evaluateHrPolicy(detectedRole, detectedSalary, customReqs);
      setMaxLoadingStage(check.is_approved ? 3 : 1);
    } else {
      setMaxLoadingStage(3);
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatus("running");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_agent",
          prompt,
          imageBase64: uploadedImage?.dataUrl,
          imageMimeType: uploadedImage?.mimeType,
          overrideMode,
          apiKey: customApiKey || undefined,
          selectedModel,
          forceSandbox,
        }),
      });

      const data = await response.json();

      if (data.status === "gemini_error") {
        setStatus("idle");
        setSandboxConfirmModal({
          open: true,
          errorMessage:
            data.errorMessage || "Failed to communicate with the Gemini API.",
          pendingAction: {
            type: "run_agent",
            overrideMode,
          },
        });
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to execute onboarding agent.");
      }

      setSteps(data.steps || []);
      setCandidate(data.candidate || null);
      setPolicyResult(data.policyResult || null);
      setOfferLetterMarkdown(data.offerLetterMarkdown || null);
      setItTicket(data.itTicket || null);
      setAgentSummary(data.agentSummary || "");
      setEngineMode(data.engineMode || null);
      setActiveModelName(data.model || null);

      if (data.status === "awaiting_override") {
        setStatus("awaiting_override");
        setActiveTab("policy");
      } else {
        setStatus("completed");
        setActiveTab("offer");
      }
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user confirmation to proceed with Deterministic Tool Sandbox
  const handleConfirmSandbox = () => {
    const pending = sandboxConfirmModal.pendingAction;
    setSandboxConfirmModal({ open: false, errorMessage: "", pendingAction: null });
    if (!pending) return;

    if (pending.type === "extract_image") {
      extractImageNotes(pending.imageObj, true);
    } else if (pending.type === "run_agent") {
      runOnboardingAgent(pending.overrideMode, true);
    }
  };

  const handleCancelSandbox = () => {
    const pending = sandboxConfirmModal.pendingAction;
    setSandboxConfirmModal({ open: false, errorMessage: "", pendingAction: null });
    if (pending?.type === "extract_image" && !prompt.trim()) {
      setUploadedImage(null);
    }
  };

  // Handle Human-in-the-Loop Reject Action
  const handleRejectRequest = () => {
    setStatus("rejected");
    setOfferLetterMarkdown(null);
    setItTicket(null);
    setSteps((prev) => [
      ...prev,
      {
        id: `step-rejected-${Date.now()}`,
        phase: "hitl",
        title: "Hiring Request Rejected by Human Reviewer",
        detail:
          "Onboarding workflow terminated at the Human-in-the-Loop governance gate due to non-compliant compensation/policy terms.",
        status: "error",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleReset = () => {
    setPrompt("");
    setUploadedImage(null);
    setStatus("idle");
    setSteps([]);
    setCandidate(null);
    setPolicyResult(null);
    setOfferLetterMarkdown(null);
    setItTicket(null);
    setAgentSummary("");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* =================================================================== */}
      {/* TOP ENTERPRISE NAVIGATION BAR                                       */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-emerald-500/20 border border-slate-700/60 bg-slate-900">
              <Image
                src="/logo.png"
                alt="ClearHire AI Logo"
                width={40}
                height={40}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  ClearHire AI
                </h1>
                <Badge
                  variant="success"
                  className="text-[10px] uppercase tracking-wider"
                >
                  Autonomous Enterprise Agent
                </Badge>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                LLM Function Calling Onboarding Engine • HR Policy Verification,
                Contract Synthesis & Zero-Trust IT Provisioning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {engineMode && (
              <Badge
                variant={engineMode === "gemini_live" ? "info" : "outline"}
                className="hidden md:inline-flex gap-1.5 text-[11px] border-slate-700"
              >
                <Sparkles className="h-3 w-3 text-sky-400" />
                {engineMode === "gemini_live"
                  ? `Live @google/genai (${activeModelName || "gemini-3.8-flash"})`
                  : "Deterministic Tool Sandbox"}
              </Badge>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPolicyModal((prev) => !prev)}
              className="border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Company HR Policy</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowApiKeyModal((prev) => !prev)}
              className="border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 text-xs"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">
                {customApiKey ? "API Key & Model" : "Gemini API Key"}
              </span>
            </Button>
          </div>
        </div>

        {/* Collapsible API Key & Model Selector Bar */}
        {showApiKeyModal && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                <strong className="text-white">
                  Configure Google Gemini API Key & Model (<code>@google/genai</code>):
                </strong>{" "}
                Uses <code>process.env.GEMINI_API_KEY</code> by default, or paste a key and choose a specific Gemini model below.
              </div>
              <div className="flex flex-wrap w-full lg:w-auto items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="auto">Auto Fallback (Recommended — gemini-3.8-flash)</option>
                  <option value="gemini-3.8-flash">gemini-3.8-flash</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite</option>
                  <option value="gemini-flash-latest">gemini-flash-latest</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                </select>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy... (Optional if set in .env.local)"
                  className="w-full sm:w-72 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowApiKeyModal(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible HR Policy Reference Drawer */}
        {showPolicyModal && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-[1600px] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Hardcoded Enterprise HR & IT Policy Context (Injected into
                    System Prompt)
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPolicyModal(false)}
                  className="h-7 text-xs text-slate-400 hover:text-white"
                >
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                {COMPANY_SALARY_BANDS.map((band) => (
                  <div
                    key={band.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5"
                  >
                    <div className="font-semibold text-slate-100">
                      {band.title}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      {band.minSalarySAR.toLocaleString()} –{" "}
                      {band.maxSalarySAR.toLocaleString()} SAR / mo
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Standard PTO: {band.standardPtoDays} Days • {band.department}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =================================================================== */}
      {/* MAIN TWO-PANEL SPLIT-SCREEN DASHBOARD                               */}
      {/* =================================================================== */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 grid grid-cols-1 lg:grid-cols-12 items-start gap-5 p-4 sm:p-6">
        {/* ================================================================= */}
        {/* LEFT PANEL (5 COLS): UNSTRUCTURED RECRUITER INPUT & MULTIMODAL    */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="border-slate-800/90 bg-slate-900/60 shadow-xl flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-sm sm:text-base text-white">
                    Recruiter Intake Console
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-slate-700 text-slate-300"
                >
                  Text + Multimodal Vision
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Paste messy, unstructured hiring notes or upload a photo of
                handwritten interview notes. The agent will autonomously
                validate HR policies and generate onboarding artifacts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex flex-col">
              {/* Collapsible 1-Click Demo Scenarios (Minimized by Default) */}
              <div className="rounded-xl border border-slate-800/90 bg-slate-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowScenarios((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {showScenarios ? (
                      <ChevronDown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      1-Click Demo Scenarios
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {showScenarios ? "Hide presets" : "Click to expand (3 presets)"}
                  </span>
                </button>

                {showScenarios && (
                  <div className="border-t border-slate-800/80 p-2.5 grid grid-cols-1 gap-2">
                    {PRESET_SCENARIOS.map((scenario) => {
                      const isSelected = prompt === scenario.prompt;
                      return (
                        <button
                          key={scenario.id}
                          type="button"
                          onClick={() => {
                            setPrompt(scenario.prompt);
                            setUploadedImage(null);
                          }}
                          className={`text-left rounded-lg border p-2.5 transition-all ${
                            isSelected
                              ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                              : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-100">
                              {scenario.label}
                            </span>
                            <Badge
                              variant={scenario.badgeVariant}
                              className="text-[10px] px-2 py-0"
                            >
                              {scenario.badge}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {scenario.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Hiring Request Notes Textarea (Fixed Size + Image Extraction Spinner) */}
              <div className="space-y-2 flex flex-col">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="hiring-notes"
                    className="text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                  >
                    Hiring Request Notes
                  </label>
                  <button
                    type="button"
                    disabled={isExtractingImage}
                    onClick={() => {
                      setPrompt("");
                      setUploadedImage(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
                  >
                    Clear text
                  </button>
                </div>
                <div className="relative">
                  <Textarea
                    id="hiring-notes"
                    value={prompt}
                    disabled={isExtractingImage}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      isExtractingImage
                        ? "Extracting text from uploaded image via Gemini Vision..."
                        : 'e.g., "Hire Sarah for Senior Dev, 20k SAR, starts Nov 1st, wants a Mac..."'
                    }
                    className="h-[155px] resize-none border-slate-800 bg-slate-950/90 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500 leading-relaxed"
                  />
                  {isExtractingImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-slate-950/85 backdrop-blur-[2px] border border-sky-500/40 p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                      <div className="text-xs font-semibold text-sky-200">
                        Extracting text from photo with Gemini Vision...
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Please wait until the extracted notes appear for your review.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* P1 Feature: Multimodal Input (Handwritten Interview Notes / Resume Image) */}
              <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Multimodal Input: Handwritten Notes / Resume
                    </span>
                  </div>
                  <Badge variant="info" className="text-[10px]">
                    Gemini Vision (P1)
                  </Badge>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!uploadedImage ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 text-sky-400" />
                      Upload Photo / Note
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateSampleNote("compliant")}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs"
                    >
                      <Wand2 className="h-3.5 w-3.5 text-emerald-400" />
                      Sample Note (Compliant)
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateSampleNote("violation")}
                      className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs"
                    >
                      <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                      Sample Note (32k Violation)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs">
                      <span className="truncate font-mono text-[11px] text-sky-200">
                        📎 {uploadedImage.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setUploadedImage(null)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900 max-h-40 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={uploadedImage.dataUrl}
                        alt="Uploaded handwritten interview notes"
                        className="max-h-40 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="lg"
                  disabled={isLoading || isExtractingImage || !prompt.trim()}
                  onClick={() => runOnboardingAgent("none", false)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-600/20"
                >
                  <Send className="h-4 w-4" />
                  {isExtractingImage
                    ? "Waiting for Image Text Extraction..."
                    : isLoading
                    ? "Executing Autonomous Tool Calls..."
                    : "Run Autonomous Onboarding Agent"}
                </Button>

                {status !== "idle" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleReset}
                    title="Reset Workspace"
                    className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 px-3"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* RIGHT PANEL (7 COLS): AGENT WORKSPACE & ARTIFACT VIEWER           */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* 1. Real-Time Agentic State Visualizer (P0) */}
          <AgentStateVisualizer
            isLoading={isLoading}
            activeLoadingStage={activeLoadingStage}
            maxLoadingStage={maxLoadingStage}
            steps={steps}
            status={status}
          />

          {/* Error Banner if API call failed */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <div className="font-semibold">Agent Execution Error</div>
                <div className="text-rose-300/90 mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* 2. P1 Feature: Human-in-the-Loop (HITL) Governance Override Gate */}
          {status === "awaiting_override" && policyResult && candidate && (
            <Card className="border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm sm:text-base text-amber-200">
                        Human-in-the-Loop Governance Gate — Policy Violation
                        Detected
                      </CardTitle>
                      <CardDescription className="text-xs text-amber-300/80">
                        <code>verify_hr_policy()</code> returned{" "}
                        <code>is_approved: false</code> for{" "}
                        <strong>{candidate.candidate_name}</strong> (
                        {candidate.role}). Agent paused before generating
                        binding contracts.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[11px]">
                    Action Required
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border border-amber-500/30 bg-slate-950/80 p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-amber-300">
                    Flagged Policy Violations ({policyResult.policy_warnings.length}
                    ):
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {policyResult.policy_warnings.map((warn, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{warn}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLoading}
                    onClick={() =>
                      runOnboardingAgent(
                        "approve_exception",
                        engineMode === "simulated_fallback"
                      )
                    }
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Executive Exception & Generate Offer
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() =>
                      runOnboardingAgent(
                        "cap_to_band",
                        engineMode === "simulated_fallback"
                      )
                    }
                    className="border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Auto-Adjust to Policy Cap (
                    {policyResult.matched_band.max_salary_sar.toLocaleString()}{" "}
                    SAR & 21d PTO)
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isLoading}
                    onClick={handleRejectRequest}
                    className="text-xs ml-auto"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejected State Card */}
          {status === "rejected" && candidate && (
            <Card className="border-rose-500/40 bg-rose-950/20">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-rose-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-rose-200">
                      Hiring Request Rejected — {candidate.candidate_name} (
                      {candidate.role})
                    </div>
                    <p className="text-xs text-rose-300/80 mt-0.5">
                      No Offer Letter or IT Provisioning Ticket was generated.
                      Compliance audit log recorded.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-slate-700 bg-slate-900 text-slate-200 text-xs"
                >
                  Start New Request
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 3. Main Agent Artifacts Workspace (Tabbed View) */}
          <Card className="border-slate-800/90 bg-slate-900/60 shadow-xl flex-1 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-800/70">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base text-white flex items-center gap-2">
                    <span>Autonomous Agent Workspace</span>
                    {candidate && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        <UserCheck className="h-3 w-3 mr-1 text-emerald-400" />
                        {candidate.candidate_name} • {candidate.role}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    {agentSummary ||
                      "Generated Offer Letters, IT Provisioning JSON Payloads, and HR Policy Audit Reports appear here."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col">
              {!candidate && !isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-3">
                    <FileSignature className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    No Onboarding Artifacts Generated Yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                    Select one of the preset scenarios on the left (or paste
                    custom recruiter notes / upload handwritten interview notes)
                    and click{" "}
                    <strong className="text-emerald-400">
                      Run Autonomous Onboarding Agent
                    </strong>
                    .
                  </p>
                </div>
              ) : (
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex-1 flex flex-col"
                >
                  <TabsList className="grid w-full grid-cols-3 bg-slate-950 border border-slate-800">
                    <TabsTrigger
                      value="offer"
                      disabled={!offerLetterMarkdown}
                      className="gap-1.5 text-xs"
                    >
                      <FileSignature className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Offer Letter</span>
                      {offerLetterMarkdown && (
                        <Badge
                          variant="success"
                          className="ml-1 px-1.5 py-0 text-[9px]"
                        >
                          MD / PDF
                        </Badge>
                      )}
                    </TabsTrigger>

                    <TabsTrigger
                      value="it_ticket"
                      disabled={!itTicket}
                      className="gap-1.5 text-xs"
                    >
                      <Laptop className="h-3.5 w-3.5 text-sky-400" />
                      <span>IT Provisioning Ticket</span>
                      {itTicket && (
                        <Badge
                          variant="info"
                          className="ml-1 px-1.5 py-0 text-[9px]"
                        >
                          JSON
                        </Badge>
                      )}
                    </TabsTrigger>

                    <TabsTrigger
                      value="policy"
                      disabled={!policyResult}
                      className="gap-1.5 text-xs"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
                      <span>HR Policy Audit</span>
                      {policyResult && (
                        <Badge
                          variant={
                            policyResult.is_approved ||
                            policyResult.override_applied
                              ? "success"
                              : "warning"
                          }
                          className="ml-1 px-1.5 py-0 text-[9px]"
                        >
                          {policyResult.is_approved
                            ? "PASS"
                            : policyResult.override_applied
                            ? "OVERRIDDEN"
                            : "FLAGGED"}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: OFFER LETTER */}
                  <TabsContent value="offer" className="flex-1 mt-3">
                    {offerLetterMarkdown && candidate ? (
                      <ScrollArea className="h-[580px] pr-2">
                        <MarkdownContractViewer
                          markdown={offerLetterMarkdown}
                          candidate={candidate}
                          policyResult={policyResult}
                        />
                      </ScrollArea>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
                        Offer Letter generation is paused pending HR Policy
                        Governance approval.
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 2: IT TICKET */}
                  <TabsContent value="it_ticket" className="flex-1 mt-3">
                    {itTicket ? (
                      <ScrollArea className="h-[580px] pr-2">
                        <ItTicketViewer ticket={itTicket} />
                      </ScrollArea>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
                        IT Ticket provisioning is paused pending HR Policy
                        Governance approval.
                      </div>
                    )}
                  </TabsContent>

                  {/* TAB 3: HR POLICY AUDIT */}
                  <TabsContent value="policy" className="flex-1 mt-3">
                    {policyResult && candidate && (
                      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              Compensation & Policy Verification Report (
                              <code>verify_hr_policy</code>)
                            </h3>
                            <p className="text-xs text-slate-400">
                              Matched Standardized Role Band:{" "}
                              <strong className="text-slate-200">
                                {policyResult.matched_band.title}
                              </strong>{" "}
                              ({policyResult.matched_band.department})
                            </p>
                          </div>
                          <Badge
                            variant={
                              policyResult.is_approved
                                ? "success"
                                : policyResult.override_applied
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {policyResult.is_approved
                              ? "COMPLIANT"
                              : policyResult.override_applied
                              ? "APPROVED BY OVERRIDE"
                              : "VIOLATION FLAGGED"}
                          </Badge>
                        </div>

                        {/* Salary Band Comparison Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                            <div className="text-slate-400">Band Minimum</div>
                            <div className="text-base font-bold text-slate-200 mt-1">
                              {policyResult.matched_band.min_salary_sar.toLocaleString()}{" "}
                              SAR
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Monthly Base Floor
                            </div>
                          </div>

                          <div
                            className={`rounded-lg border p-3 ${
                              policyResult.evaluated_salary_sar <=
                              policyResult.matched_band.max_salary_sar
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-amber-500/40 bg-amber-500/10"
                            }`}
                          >
                            <div className="text-slate-300">
                              Candidate Proposed Salary
                            </div>
                            <div className="text-base font-bold text-white mt-1">
                              {policyResult.evaluated_salary_sar.toLocaleString()}{" "}
                              SAR
                            </div>
                            <div className="text-[11px] text-slate-300">
                              {policyResult.salary_delta_sar <= 0
                                ? `${Math.abs(
                                    policyResult.salary_delta_sar
                                  ).toLocaleString()} SAR under cap`
                                : `+${policyResult.salary_delta_sar.toLocaleString()} SAR over cap`}
                            </div>
                          </div>

                          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                            <div className="text-slate-400">
                              Policy Maximum Cap
                            </div>
                            <div className="text-base font-bold text-emerald-400 mt-1">
                              {policyResult.matched_band.max_salary_sar.toLocaleString()}{" "}
                              SAR
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Standard PTO:{" "}
                              {policyResult.matched_band.standard_pto_days} Days
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* =================================================================== */}
      {/* GEMINI API ERROR -> CONFIRM SWITCH TO TOOL SANDBOX MODAL            */}
      {/* =================================================================== */}
      {sandboxConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-amber-500/50 bg-slate-900 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-sm sm:text-base text-white">
                    Gemini API Unavailable — Confirm Fallback
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    The system did not automatically switch to the Tool Sandbox.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-slate-950/90 p-3 text-xs text-amber-200/90 leading-relaxed break-words">
                {sandboxConfirmModal.errorMessage}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Would you like to proceed using the{" "}
                <strong className="text-emerald-400">
                  Deterministic Tool Sandbox
                </strong>{" "}
                instead, or cancel to check your Gemini API Key?
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSandbox}
                  className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmSandbox}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  Confirm & Proceed with Tool Sandbox
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

