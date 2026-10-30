"use client";

import React, { useState } from "react";
import {
  Laptop,
  Monitor,
  KeyRound,
  Cpu,
  Shield,
  Copy,
  Check,
  Code2,
  LayoutGrid,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItTicketPayload } from "@/lib/policies";

interface ItTicketViewerProps {
  ticket: ItTicketPayload;
}

export function ItTicketViewer({ ticket }: ItTicketViewerProps) {
  const [viewMode, setViewMode] = useState<"cards" | "json">("cards");
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(ticket, null, 2);

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "LAPTOP":
        return <Laptop className="h-4 w-4 text-sky-400" />;
      case "DISPLAY":
        return <Monitor className="h-4 w-4 text-violet-400" />;
      case "SECURITY_KEY":
        return <KeyRound className="h-4 w-4 text-emerald-400" />;
      default:
        return <Cpu className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-3 w-full min-w-0 overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Laptop className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-white">
                {ticket.ticket_id}
              </span>
              <Badge variant="info" className="text-[10px]">
                {ticket.status}
              </Badge>
              <Badge variant="success" className="text-[10px]">
                Priority: {ticket.priority}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Generated via <code className="text-sky-300">create_it_ticket()</code> • Queue:{" "}
              {ticket.assigned_queue}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewMode((v) => (v === "cards" ? "json" : "cards"))}
            className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs"
          >
            {viewMode === "cards" ? (
              <>
                <Code2 className="h-3.5 w-3.5" />
                Full JSON Only
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" />
                Visual Card View
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied JSON
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </>
            )}
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 gap-3 w-full min-w-0">
          {/* Employee & SLA Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Assignee
              </div>
              <div className="font-semibold text-slate-100 mt-0.5 truncate">
                {ticket.employee_profile.candidate_name}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {ticket.employee_profile.role}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Department
              </div>
              <div className="font-semibold text-slate-100 mt-0.5 truncate">
                {ticket.employee_profile.department}
              </div>
              <div className="text-[11px] text-emerald-400 truncate">
                Start: {ticket.employee_profile.start_date}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                SLA Target
              </div>
              <div className="font-semibold text-slate-100 mt-0.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Day-1 Ready</span>
              </div>
              <div className="text-[11px] text-slate-400 truncate">Riyadh KAFD Depot</div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                Est. CapEx Budget
              </div>
              <div className="font-semibold text-emerald-400 mt-0.5 truncate">
                {ticket.estimated_cost_sar.toLocaleString()} SAR
              </div>
              <div className="text-[11px] text-slate-400 truncate">Pre-Approved IT CapEx</div>
            </div>
          </div>

          {/* Hardware Bundle Cards */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex flex-wrap items-center justify-between gap-1">
              <span>Hardware Provisioning Bundle ({ticket.hardware_bundle.length} Assets)</span>
              <span className="text-[11px] font-normal text-slate-400">
                Auto-dispatched to KAFD IT Logistics
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ticket.hardware_bundle.map((item) => (
                <div
                  key={item.item_id}
                  className="rounded-lg border border-slate-800/90 bg-slate-900/70 p-3 flex items-start gap-2.5 min-w-0 overflow-hidden"
                >
                  <div className="mt-0.5 rounded-lg bg-slate-950 p-2 border border-slate-800 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 truncate">
                        {item.item_id}
                      </span>
                      <Badge
                        variant={
                          item.policy_status === "STANDARD_APPROVED"
                            ? "success"
                            : "warning"
                        }
                        className="text-[9px] px-1.5 py-0 shrink-0"
                      >
                        {item.asset_status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 mt-0.5 break-words">
                      {item.model}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug break-words">
                      {item.specs}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Trust IAM & Cloud Access */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2 min-w-0">
              <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                Zero-Trust SSO & IAM Provisioning ({ticket.employee_profile.security_clearance})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ticket.zero_trust_access.map((acc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-2 text-xs min-w-0 overflow-hidden"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-200 truncate">
                      {acc.system}
                    </div>
                    <div className="font-mono text-[10px] text-sky-400 truncate">
                      {acc.role_scope}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {acc.provisioning_method}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Structured JSON Payload Block (only shown when Full JSON Only is toggled) */
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-[11px] text-slate-400 truncate">
              // Structured JSON Payload returned by create_it_ticket()
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-800 text-sky-400 font-mono shrink-0">
              application/json
            </Badge>
          </div>
          <pre className="text-xs font-mono text-sky-300 overflow-x-auto leading-relaxed max-h-[480px]">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

