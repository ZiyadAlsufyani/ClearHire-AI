"use client";

import React, { useState } from "react";
import {
  Download,
  Copy,
  Check,
  FileSignature,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExtractedCandidate, PolicyVerificationResult } from "@/lib/policies";
import { exportOfferLetterToPdf } from "@/lib/pdf-export";

interface MarkdownContractViewerProps {
  markdown: string;
  candidate: ExtractedCandidate;
  policyResult: PolicyVerificationResult | null;
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Parse **bold**, *italic*, and `code` inline segments
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-xs text-emerald-300 border border-slate-700/70"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={idx} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export function MarkdownContractViewer({
  markdown,
  candidate,
  policyResult,
}: MarkdownContractViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    exportOfferLetterToPdf({
      candidate,
      policyResult,
      offerMarkdown: markdown,
    });
  };

  // Parse markdown lines into structured blocks (headings, tables, blockquotes, lists, paragraphs)
  const renderMarkdownBlocks = (md: string) => {
    const lines = md.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      if (!line) {
        i++;
        continue;
      }

      // Horizontal Rule
      if (line === "---") {
        elements.push(
          <hr key={`hr-${i}`} className="my-5 border-slate-800/90" />
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith("# ")) {
        elements.push(
          <h1
            key={`h1-${i}`}
            className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1"
          >
            {line.slice(2)}
          </h1>
        );
        i++;
        continue;
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={`h3-${i}`}
            className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mt-5 mb-2.5 flex items-center gap-2"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {line.slice(4)}
          </h3>
        );
        i++;
        continue;
      }

      // Blockquote (Governance stamp)
      if (line.startsWith("> ")) {
        const isOverride = line.includes("OVERRIDE");
        elements.push(
          <div
            key={`bq-${i}`}
            className={`my-3 rounded-lg border px-3.5 py-2.5 text-xs ${
              isOverride
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {formatInlineMarkdown(line.slice(2))}
          </div>
        );
        i++;
        continue;
      }

      // Markdown Table
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }
        if (tableLines.length >= 2) {
          const headerCells = tableLines[0]
            .split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((c) => c.trim());

          const bodyRows = tableLines.slice(2).map((r) =>
            r
              .split("|")
              .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
              .map((c) => c.trim())
          );

          elements.push(
            <div
              key={`tbl-${i}`}
              className="my-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70"
            >
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                  <tr>
                    {headerCells.map((cell, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5 font-semibold">
                        {formatInlineMarkdown(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={
                        rIdx === bodyRows.length - 1 && bodyRows.length > 2
                          ? "bg-emerald-500/5 font-medium"
                          : "hover:bg-slate-900/40"
                      }
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5">
                          {formatInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        continue;
      }

      // Unordered List
      if (line.startsWith("- ")) {
        const listItems: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("- ")) {
          listItems.push(lines[i].trim().slice(2));
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="my-2 space-y-1.5 text-xs text-slate-300">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span className="leading-relaxed">{formatInlineMarkdown(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Default paragraph
      elements.push(
        <p key={`p-${i}`} className="my-2 text-xs leading-relaxed text-slate-300">
          {formatInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <FileSignature className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                Employment Offer Contract
              </span>
              <Badge
                variant={policyResult?.override_applied ? "warning" : "success"}
                className="text-[10px]"
              >
                {policyResult?.override_applied
                  ? "Executive Override Applied"
                  : "KSA Labor Law Compliant"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400">
              Generated via <code className="text-sky-300">generate_offer_letter()</code> for{" "}
              {candidate.candidate_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy MD
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Document Sheet */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-200">
                ClearHire Enterprise Technologies KSA
              </div>
              <div className="text-[11px] text-slate-400">
                King Abdullah Financial District (KAFD), Riyadh
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Digital Contract
          </div>
        </div>

        <div>{renderMarkdownBlocks(markdown)}</div>
      </div>
    </div>
  );
}

