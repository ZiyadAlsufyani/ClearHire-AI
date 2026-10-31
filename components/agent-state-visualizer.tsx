"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PauseCircle,
  Sparkles,
  ShieldCheck,
  FileSignature,
  Laptop,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgentStepLog } from "@/lib/policies";

interface AgentStateVisualizerProps {
  isLoading: boolean;
  activeLoadingStage: number;
  maxLoadingStage?: number;
  steps: AgentStepLog[];
  status: "idle" | "running" | "awaiting_override" | "completed" | "rejected" | "error";
}

const LIVE_PIPELINE_STAGES = [
  {
    key: "parse",
    label: "🔄 Analyzing unstructured hiring request & multimodal input...",
    subtext: "Extracting candidate name, target role, SAR compensation, start date & hardware specs",
    icon: Sparkles,
  },
  {
    key: "policy",
    label: "🔎 Checking HR policies via tool call: verify_hr_policy()...",
    subtext: "Cross-referencing salary against KSA role bands, 21-day PTO standard & hybrid policy",
    icon: ShieldCheck,
  },
  {
    key: "offer",
    label: "📝 Drafting Offer Letter via tool call: generate_offer_letter()...",
    subtext: "Synthesizing KSA Labor Law compliant employment contract (65/25/10 allowance split)",
    icon: FileSignature,
  },
  {
    key: "it_ticket",
    label: "💻 Provisioning IT & IAM via tool call: create_it_ticket()...",
    subtext: "Allocating MacBook/Workstation SKU and Zero-Trust SCIM/IAM access groups",
    icon: Laptop,
  },
];

export function AgentStateVisualizer({
  isLoading,
  activeLoadingStage,
  maxLoadingStage = 3,
  steps,
  status,
}: AgentStateVisualizerProps) {
  const [isTraceExpanded, setIsTraceExpanded] = useState<boolean>(true);
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (status === "idle" && steps.length === 0 && !isLoading) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4">
        <button
          type="button"
          onClick={() => setIsTraceExpanded((prev) => !prev)}
          className={`w-full flex items-center justify-between text-left transition-colors hover:opacity-90 ${
            isTraceExpanded ? "mb-3" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Agentic Reasoning & Function Calling Trace
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] border-slate-700 text-slate-400">
              Standby — Ready for Input
            </Badge>
            {isTraceExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>
        {isTraceExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-2.5 flex items-center gap-2.5 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <div className="font-mono text-[11px] text-slate-200">verify_hr_policy</div>
                <div className="text-[11px] text-slate-500">Salary & PTO Band Check</div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-2.5 flex items-center gap-2.5 text-slate-400">
              <FileSignature className="h-4 w-4 text-sky-400 shrink-0" />
              <div>
                <div className="font-mono text-[11px] text-slate-200">generate_offer_letter</div>
                <div className="text-[11px] text-slate-500">Markdown Contract Engine</div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-2.5 flex items-center gap-2.5 text-slate-400">
              <Laptop className="h-4 w-4 text-violet-400 shrink-0" />
              <div>
                <div className="font-mono text-[11px] text-slate-200">create_it_ticket</div>
                <div className="text-[11px] text-slate-500">Hardware & IAM JSON</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-inner">
      <button
        type="button"
        onClick={() => setIsTraceExpanded((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left transition-colors hover:opacity-90 ${
          isTraceExpanded ? "mb-3" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isLoading
                ? "bg-sky-400 animate-ping"
                : status === "awaiting_override"
                ? "bg-amber-400 animate-pulse"
                : status === "completed"
                ? "bg-emerald-400"
                : status === "rejected"
                ? "bg-rose-500"
                : "bg-slate-400"
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Agentic Reasoning & Function Calling Trace
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <Badge variant="info" className="gap-1.5 text-[11px]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing Tool Pipeline...
            </Badge>
          )}
          {!isLoading && status === "awaiting_override" && (
            <Badge variant="warning" className="gap-1.5 text-[11px]">
              <PauseCircle className="h-3 w-3" />
              Paused — Human-in-the-Loop Gate
            </Badge>
          )}
          {!isLoading && status === "completed" && (
            <Badge variant="success" className="gap-1.5 text-[11px]">
              <CheckCircle2 className="h-3 w-3" />
              All Functions Executed ({steps.filter((s) => s.toolName).length} Tools)
            </Badge>
          )}
          {isTraceExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isTraceExpanded && (
        <>
          {/* Live in-flight animation */}
      {isLoading ? (
        <div className="space-y-2.5">
          {LIVE_PIPELINE_STAGES.slice(0, maxLoadingStage + 1).map((stage, idx) => {
            const isDone = idx < activeLoadingStage;
            const isCurrent = idx === activeLoadingStage;
            return (
              <div
                key={stage.key}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-300 ${
                  isCurrent
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                    : isDone
                    ? "border-emerald-500/25 bg-emerald-500/5 text-slate-300"
                    : "border-slate-800/60 bg-slate-950/40 text-slate-500 opacity-60"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                  ) : (
                    <stage.icon className="h-4 w-4 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{stage.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{stage.subtext}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Completed / Paused step trace with inspectable tool calls */
        <div className="space-y-2">
          {steps.map((step) => {
            const isExpanded = Boolean(expandedStepIds[step.id]);
            const hasPayload = Boolean(step.toolName && step.toolArgs);

            return (
              <div
                key={step.id}
                className={`rounded-lg border transition-colors ${
                  step.status === "warning"
                    ? "border-amber-500/35 bg-amber-500/5"
                    : step.status === "paused"
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-slate-800/80 bg-slate-950/60"
                }`}
              >
                <div
                  onClick={() => hasPayload && toggleExpand(step.id)}
                  className={`flex items-start gap-2.5 p-2.5 ${
                    hasPayload ? "cursor-pointer hover:bg-slate-800/30" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {step.status === "completed" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    {step.status === "warning" && (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    )}
                    {step.status === "paused" && (
                      <PauseCircle className="h-4 w-4 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {step.title}
                      </span>
                      {step.toolName && (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-sky-300 border border-slate-700">
                          <Terminal className="h-2.5 w-2.5" />
                          {step.toolName}()
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {step.detail}
                    </p>
                  </div>

                  {hasPayload && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-200 p-1 text-[10px] flex items-center gap-0.5 shrink-0"
                    >
                      <span>{isExpanded ? "Hide Args" : "Tool I/O"}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {hasPayload && isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950 px-3 py-2.5 text-[11px] font-mono space-y-2">
                    <div>
                      <span className="text-slate-500 block mb-1">
                        // Function Call Arguments ({step.toolName}):
                      </span>
                      <pre className="overflow-x-auto text-sky-300 bg-slate-900/90 p-2 rounded border border-slate-800">
                        {JSON.stringify(step.toolArgs, null, 2)}
                      </pre>
                    </div>
                    {step.toolResult !== undefined && (
                      <div>
                        <span className="text-slate-500 block mb-1">
                          // Function Return Payload:
                        </span>
                        <pre className="overflow-x-auto text-emerald-300 bg-slate-900/90 p-2 rounded border border-slate-800 max-h-40">
                          {JSON.stringify(step.toolResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}

