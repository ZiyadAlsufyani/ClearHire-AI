import { jsPDF } from "jspdf";
import {
  ExtractedCandidate,
  PolicyVerificationResult,
  COMPANY_POLICY_SUMMARY,
} from "@/lib/policies";

export function exportOfferLetterToPdf(params: {
  candidate: ExtractedCandidate;
  policyResult: PolicyVerificationResult | null;
  offerMarkdown: string;
}) {
  const { candidate, policyResult } = params;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Top Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 36, "F");

  // Accent bar
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 36, pageWidth, 1.8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CLEARHIRE AI — OFFICIAL EMPLOYMENT OFFER", margin, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${COMPANY_POLICY_SUMMARY.companyName} | ${COMPANY_POLICY_SUMMARY.headquarters}`,
    margin,
    24
  );

  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const contractRef = `CH-KSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  doc.text(`Ref: ${contractRef}   |   Issued: ${issueDate}`, margin, 30);

  y = 48;

  // Governance Stamp Box
  const isOverridden = Boolean(policyResult?.override_applied);
  if (isOverridden) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
  } else {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
  }
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(isOverridden ? 146 : 6, isOverridden ? 64 : 95, isOverridden ? 14 : 70);
  doc.text(
    isOverridden
      ? "GOVERNANCE AUDIT STAMP: EXECUTIVE OVERRIDE APPROVED (HUMAN-IN-THE-LOOP)"
      : `GOVERNANCE AUDIT STAMP: POLICY COMPLIANT (${policyResult?.matched_band.title || candidate.role})`,
    margin + 4,
    y + 7.5
  );

  y += 20;

  // Salutation & Opening
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Dear ${candidate.candidate_name},`, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const introText = `On behalf of ${COMPANY_POLICY_SUMMARY.companyName}, we are pleased to offer you the position of ${candidate.role} within our ${
    policyResult?.matched_band.department || "Engineering & Product"
  } division. We are confident that your expertise will contribute significantly to our mission in Riyadh, KSA.`;
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5.2 + 5;

  // Section 1: Position Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. Position & Commencement Summary", margin, y);
  y += 6;

  doc.setFontSize(9);
  const detailsRows = [
    {
      leftLabel: "Candidate Name:",
      leftVal: candidate.candidate_name,
      rightLabel: "Start Date:",
      rightVal: candidate.start_date,
    },
    {
      leftLabel: "Official Title:",
      leftVal: candidate.role,
      rightLabel: "Work Model:",
      rightVal: COMPANY_POLICY_SUMMARY.workModel,
    },
    {
      leftLabel: "Department:",
      leftVal: policyResult?.matched_band.department || "Core Systems",
      rightLabel: "Probation Period:",
      rightVal: `${COMPANY_POLICY_SUMMARY.probationPeriodDays} Days (KSA Labor Law)`,
    },
  ];

  const colWidth = (contentWidth - 10) / 2; // ~82mm per column
  const labelOffset = 30;
  const maxValWidth = colWidth - labelOffset - 2; // ~50mm for value text

  const preparedRows = detailsRows.map((r) => {
    const leftLines = doc.splitTextToSize(String(r.leftVal), maxValWidth);
    const rightLines = doc.splitTextToSize(String(r.rightVal), maxValWidth);
    const lineCount = Math.max(leftLines.length, rightLines.length, 1);
    return {
      ...r,
      leftLines,
      rightLines,
      rowHeight: lineCount * 4.5 + 4,
    };
  });

  const totalBoxHeight =
    preparedRows.reduce((sum, r) => sum + r.rowHeight, 0) + 6;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, totalBoxHeight, 2, 2, "FD");

  let rowY = y + 7;
  const rightColStartX = margin + contentWidth / 2 + 2;

  preparedRows.forEach((r) => {
    // Left column
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(r.leftLabel, margin + 4, rowY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(r.leftLines, margin + 4 + labelOffset, rowY);

    // Right column
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(r.rightLabel, rightColStartX, rowY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(r.rightLines, rightColStartX + labelOffset, rowY);

    rowY += r.rowHeight;
  });

  y += totalBoxHeight + 8;

  // Section 2: Compensation Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. Monthly & Annualized Compensation Package (SAR)", margin, y);
  y += 6;

  const totalMonthly = candidate.salary;
  const basicSalary = Math.round(totalMonthly * 0.65);
  const housingAllowance = Math.round(totalMonthly * 0.25);
  const transportAllowance = totalMonthly - basicSalary - housingAllowance;

  const compRows = [
    ["Basic Salary (65% Base)", `${basicSalary.toLocaleString()} SAR`, `${(basicSalary * 12).toLocaleString()} SAR`],
    ["Housing Allowance (25%)", `${housingAllowance.toLocaleString()} SAR`, `${(housingAllowance * 12).toLocaleString()} SAR`],
    ["Transport Allowance (10%)", `${transportAllowance.toLocaleString()} SAR`, `${(transportAllowance * 12).toLocaleString()} SAR`],
    ["Total Gross Guaranteed Package", `${totalMonthly.toLocaleString()} SAR / mo`, `${(totalMonthly * 12).toLocaleString()} SAR / yr`],
  ];

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Compensation Component", margin + 4, y + 5.5);
  doc.text("Monthly (SAR)", margin + 95, y + 5.5);
  doc.text("Annualized (SAR)", margin + 135, y + 5.5);
  y += 8;

  compRows.forEach((row, idx) => {
    const isTotal = idx === compRows.length - 1;
    doc.setFillColor(isTotal ? 236 : idx % 2 === 0 ? 255 : 248, isTotal ? 253 : idx % 2 === 0 ? 255 : 250, isTotal ? 245 : idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 8.5, "FD");

    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(row[0], margin + 4, y + 5.8);
    doc.text(row[1], margin + 95, y + 5.8);
    doc.text(row[2], margin + 135, y + 5.8);
    y += 8.5;
  });

  y += 9;

  // Section 3: Benefits & Leave
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Leave, Medical Benefits & Statutory Terms", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  const bullets = [
    `• Annual Leave (PTO): ${policyResult?.matched_band.standard_pto_days || 21} paid working days per year plus official KSA National & Eid holidays.`,
    "• Healthcare Coverage: Class-A VIP private medical insurance for employee and eligible dependents.",
    "• End of Service Benefit (EOSB): Accrued in full compliance with Articles 84 & 85 of the Saudi Labor Law.",
    `• Notice Period: ${COMPANY_POLICY_SUMMARY.noticePeriodDays} calendar days written notice by either party post-probation.`,
  ];
  if (candidate.custom_requests && candidate.custom_requests.length > 0) {
    bullets.push(`• Special Provisions Noted: ${candidate.custom_requests.join(", ")}`);
  }

  bullets.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5 + 1.5;
  });

  y += 10;

  // Section 4: Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("For ClearHire Enterprise Technologies KSA", margin, y);
  doc.text("Candidate Acceptance", margin + contentWidth / 2 + 10, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Autonomous People Ops & VP of Talent", margin, y);
  doc.text(candidate.candidate_name, margin + contentWidth / 2 + 10, y);
  y += 12;

  doc.text("Digital Signature: Verified by ClearHire AI", margin, y);
  doc.text("Signature: ___________________________", margin + contentWidth / 2 + 10, y);
  y += 7;
  doc.text(`Date: ${issueDate}`, margin, y);
  doc.text("Date: _______________________________", margin + contentWidth / 2 + 10, y);

  const safeName = candidate.candidate_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`ClearHire_Offer_${safeName}.pdf`);
}

