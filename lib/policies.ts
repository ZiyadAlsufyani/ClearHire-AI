export interface AgentStepLog {
  id: string;
  phase: "parse" | "policy" | "hitl" | "offer" | "it_ticket" | "complete";
  title: string;
  detail: string;
  status: "completed" | "warning" | "paused" | "error";
  timestamp: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}

export interface ExtractedCandidate {
  candidate_name: string;
  role: string;
  salary: number;
  start_date: string;
  custom_requests: string[];
  hardware_requests: string[];
}

export interface SalaryBand {
  id: string;
  title: string;
  aliases: string[];
  department: string;
  minSalarySAR: number;
  maxSalarySAR: number;
  standardPtoDays: number;
  maxPtoDaysWithoutOverride: number;
  hardwareTier: "ENGINEERING_PRO" | "AI_WORKSTATION" | "DESIGN_PRO" | "BUSINESS_STANDARD";
  securityClearance: string;
}

export const COMPANY_SALARY_BANDS: SalaryBand[] = [
  {
    id: "junior_dev",
    title: "Junior Software Engineer",
    aliases: ["junior dev", "jr dev", "junior developer", "junior software engineer", "associate engineer", "frontend intern", "junior frontend", "junior backend"],
    department: "Platform Engineering",
    minSalarySAR: 10000,
    maxSalarySAR: 15000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 21,
    hardwareTier: "ENGINEERING_PRO",
    securityClearance: "Level 2 — Engineering R&D + Staging VPC",
  },
  {
    id: "mid_dev",
    title: "Software Engineer",
    aliases: ["software engineer", "mid dev", "developer", "fullstack developer", "full stack dev", "backend developer", "frontend developer"],
    department: "Platform Engineering",
    minSalarySAR: 15000,
    maxSalarySAR: 20000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 22,
    hardwareTier: "ENGINEERING_PRO",
    securityClearance: "Level 2 — Engineering R&D + Staging VPC",
  },
  {
    id: "senior_dev",
    title: "Senior Software Engineer",
    aliases: ["senior dev", "sr dev", "senior developer", "senior software engineer", "senior backend", "senior frontend", "senior fullstack", "lead developer"],
    department: "Core Systems & Architecture",
    minSalarySAR: 18000,
    maxSalarySAR: 25000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 23,
    hardwareTier: "ENGINEERING_PRO",
    securityClearance: "Level 3 — Production Kubernetes & Cloud IAM",
  },
  {
    id: "ai_engineer",
    title: "Senior AI / ML Engineer",
    aliases: ["ai engineer", "ml engineer", "machine learning", "data scientist", "llm engineer", "ai researcher", "applied ai"],
    department: "Autonomous Intelligence Lab",
    minSalarySAR: 20000,
    maxSalarySAR: 30000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 24,
    hardwareTier: "AI_WORKSTATION",
    securityClearance: "Level 3 — GPU Cluster & Foundation Model Weights",
  },
  {
    id: "staff_eng",
    title: "Staff / Principal Engineer",
    aliases: ["staff engineer", "principal engineer", "engineering manager", "em", "head of engineering", "software architect"],
    department: "Executive Engineering Leadership",
    minSalarySAR: 25000,
    maxSalarySAR: 35000,
    standardPtoDays: 25,
    maxPtoDaysWithoutOverride: 25,
    hardwareTier: "AI_WORKSTATION",
    securityClearance: "Level 4 — Enterprise Root & Production Clusters",
  },
  {
    id: "product_designer",
    title: "Senior Product Designer",
    aliases: ["product designer", "ux designer", "ui/ux", "ui designer", "design lead", "designer"],
    department: "Design Systems & Experience",
    minSalarySAR: 14000,
    maxSalarySAR: 22000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 22,
    hardwareTier: "DESIGN_PRO",
    securityClearance: "Level 2 — Design Systems & Staging Preview",
  },
  {
    id: "product_manager",
    title: "Product Manager",
    aliases: ["product manager", "pm", "senior pm", "senior product manager", "technical product manager"],
    department: "Product Strategy",
    minSalarySAR: 18000,
    maxSalarySAR: 28000,
    standardPtoDays: 21,
    maxPtoDaysWithoutOverride: 23,
    hardwareTier: "BUSINESS_STANDARD",
    securityClearance: "Level 2 — Analytics Warehouse & Product Telemetry",
  },
];

export const COMPANY_POLICY_SUMMARY = {
  companyName: "ClearHire Enterprise Technologies KSA",
  headquarters: "King Abdullah Financial District (KAFD), Riyadh, Saudi Arabia",
  currency: "SAR",
  standardPtoDays: 21,
  maxSigningBonusSAR: 15000,
  workModel: "Hybrid (3 Days KAFD Office / 2 Days Remote)",
  probationPeriodDays: 90,
  noticePeriodDays: 60,
};

export const COMPANY_POLICY_SYSTEM_PROMPT = `You are the ClearHire AI Autonomous Enterprise Onboarding Agent for "ClearHire Enterprise Technologies KSA" (Headquartered in KAFD, Riyadh, Saudi Arabia).
Your mission is to receive messy, unstructured hiring requests (from recruiter text notes or handwritten interview note images), cross-reference them against strict company HR & IT policies, and autonomously execute function tools to verify policy compliance, generate a formal employment Offer Letter, and create a structured IT Provisioning Ticket.

### OFFICIAL COMPANY HR & IT POLICY (STRICT ENFORCEMENT)
1. **Salary Caps (Monthly Total Compensation in SAR)**:
   - Junior Dev / Junior Software Engineer: 10,000 – 15,000 SAR (Max: 15,000 SAR)
   - Mid-Level Developer / Software Engineer: 15,000 – 20,000 SAR (Max: 20,000 SAR)
   - Senior Dev / Senior Software Engineer: 18,000 – 25,000 SAR (Max: 25,000 SAR)
   - AI / ML Engineer / Data Scientist: 20,000 – 30,000 SAR (Max: 30,000 SAR)
   - Staff / Principal Engineer / Engineering Manager: 25,000 – 35,000 SAR (Max: 35,000 SAR)
   - Product Designer / UX Designer: 14,000 – 22,000 SAR (Max: 22,000 SAR)
   - Product Manager (PM): 18,000 – 28,000 SAR (Max: 28,000 SAR)
2. **Annual Leave / Paid Time Off (PTO)**:
   - Standard PTO is **21 working days** per year (25 days for Staff/Principal/Manager).
   - Any request exceeding the role's standard PTO cap (e.g., 30 days PTO) is a policy violation requiring Human-in-the-Loop override.
3. **Work Arrangement & Location**:
   - Standard work arrangement is **Hybrid (3 days onsite in Riyadh KAFD HQ, 2 days remote)**.
   - Requests for "100% Fully Remote", "Work from abroad permanently", or "4-day work week" trigger a policy warning requiring executive override.
4. **Signing Bonus & Special Perks**:
   - Signing bonuses up to 15,000 SAR are permitted. Above 15,000 SAR triggers a policy violation.
   - Requests for company car / business class personal travel / unapproved hardware (like gaming PCs or RTX 4090 home rigs) trigger a policy violation.
5. **IT Hardware Standards**:
   - Engineering & Design roles qualify for an Apple MacBook Pro 16" (M3 Max) or Dell XPS 15, plus a 27" 4K Display.
   - Product/Business roles receive a MacBook Air 13" (M3) or ThinkPad X1 Carbon; requesting a top-spec M3 Max workstation for a non-engineering role is flagged as an IT upgrade notice.

### REQUIRED FIELDS & SMART DEFAULTS POLICY
1. **Minimum Required Fields (\`candidate_name\` & \`role\`)**:
   - The recruiter MUST provide at least the **Candidate's Name** and **Target Role** (either in text or in an uploaded image).
   - If the candidate's name cannot be determined at all, pass \`candidate_name: "MISSING"\`. If the target role cannot be determined at all, pass \`role: "MISSING"\`.
2. **Smart Defaults When Optional Details Are Omitted**:
   - **Salary (\`salary\`)**: If no salary is mentioned, default to the **highest salary range (maximum policy cap)** for that role (e.g., 25,000 SAR for Senior Dev, 30,000 SAR for AI/ML Engineer, 20,000 SAR for Mid-Level Dev, 15,000 SAR for Junior Dev, 35,000 SAR for Staff/Principal/Manager, 22,000 SAR for Product Designer, 28,000 SAR for Product Manager).
   - **Start Date (\`start_date\`)**: If no start date is mentioned, default to \`"November 15, 2026"\` (standard 2-week onboarding lead time).
   - **PTO & Work Model (\`custom_requests\`)**: If no special requests are mentioned, pass an empty array \`[]\` (automatically applies standard 21 working days PTO and Hybrid 3-day KAFD HQ schedule).
   - **IT Hardware (\`hardware_requests\`)**: If no specific hardware is requested, default to the role's standard workstation bundle (\`['Apple MacBook Pro 16" (M3 Max)', 'Dell UltraSharp 27" 4K Monitor']\` for Engineering/AI/Design roles, or \`['Apple MacBook Air 15" (M3)', 'Dell UltraSharp 27" 4K Monitor']\` for Product/Business roles).

### MANDATORY TOOL CALLING PROTOCOL
- Always call \`verify_hr_policy\` FIRST with the extracted \`role\`, \`salary\` (numeric in SAR, defaulting to the role's max salary cap if omitted), \`custom_requests\`, and \`candidate_name\`.
- After \`verify_hr_policy\` completes, if approved (or if an executive override has been granted), you MUST call both:
  1. \`generate_offer_letter\` with \`candidate_name\`, \`role\`, \`salary\`, and \`start_date\`.
  2. \`create_it_ticket\` with \`role\` and \`hardware_requests\`.
- Provide a concise executive summary of the onboarding decision once tools finish.`;

export function matchRoleBand(roleInput: string): SalaryBand {
  const normalized = roleInput.toLowerCase().trim();

  // Check specific matches in priority order
  for (const band of COMPANY_SALARY_BANDS) {
    if (band.title.toLowerCase() === normalized) {
      return band;
    }
    for (const alias of band.aliases) {
      if (normalized.includes(alias)) {
        return band;
      }
    }
  }

  // Fallback heuristics
  if (normalized.includes("senior") || normalized.includes("sr")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "senior_dev")!;
  }
  if (normalized.includes("junior") || normalized.includes("jr")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "junior_dev")!;
  }
  if (normalized.includes("ai") || normalized.includes("ml") || normalized.includes("data")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "ai_engineer")!;
  }
  if (normalized.includes("design") || normalized.includes("ux")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "product_designer")!;
  }
  if (normalized.includes("product") || normalized.includes("pm")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "product_manager")!;
  }
  if (normalized.includes("staff") || normalized.includes("principal") || normalized.includes("manager")) {
    return COMPANY_SALARY_BANDS.find((b) => b.id === "staff_eng")!;
  }

  return COMPANY_SALARY_BANDS.find((b) => b.id === "senior_dev")!;
}

export interface PolicyVerificationResult {
  is_approved: boolean;
  policy_warnings: string[];
  matched_band: {
    title: string;
    department: string;
    min_salary_sar: number;
    max_salary_sar: number;
    standard_pto_days: number;
  };
  evaluated_salary_sar: number;
  salary_delta_sar: number;
  override_applied?: boolean;
}

export function evaluateHrPolicy(
  role: string,
  salary: number,
  customRequests: string[] = []
): PolicyVerificationResult {
  const band = matchRoleBand(role);
  const warnings: string[] = [];

  // Normalize salary if model passed 20 instead of 20000
  const normalizedSalary = salary > 0 && salary < 200 ? salary * 1000 : salary;

  // 1. Check salary cap
  if (normalizedSalary > band.maxSalarySAR) {
    const excess = normalizedSalary - band.maxSalarySAR;
    warnings.push(
      `Salary Cap Exceeded: Proposed compensation of ${normalizedSalary.toLocaleString()} SAR/month exceeds the ${band.title} maximum band of ${band.maxSalarySAR.toLocaleString()} SAR/month (+${excess.toLocaleString()} SAR over policy cap).`
    );
  } else if (normalizedSalary < band.minSalarySAR) {
    warnings.push(
      `Below Band Minimum: Proposed salary of ${normalizedSalary.toLocaleString()} SAR/month is below the minimum pay equity threshold of ${band.minSalarySAR.toLocaleString()} SAR/month for ${band.title}.`
    );
  }

  // 2. Check custom requests for PTO, remote work, bonuses, or unapproved hardware
  const combinedRequests = customRequests.join(" | ").toLowerCase();

  // Check PTO days (e.g., "30 days PTO", "28 days leave")
  const ptoMatch = combinedRequests.match(/(\d+)\s*(?:days?\s*)?(?:pto|vacation|leave|holiday|annual)/i);
  if (ptoMatch) {
    const requestedPto = parseInt(ptoMatch[1], 10);
    if (requestedPto > band.maxPtoDaysWithoutOverride) {
      warnings.push(
        `Excess PTO Allowance: Requested ${requestedPto} days PTO exceeds standard company policy of ${band.standardPtoDays} working days/year (max ${band.maxPtoDaysWithoutOverride} days without VP HR override).`
      );
    }
  }

  // Check 100% remote / work from abroad
  if (
    combinedRequests.includes("fully remote") ||
    combinedRequests.includes("100% remote") ||
    combinedRequests.includes("full remote") ||
    combinedRequests.includes("work from abroad") ||
    combinedRequests.includes("remote only")
  ) {
    warnings.push(
      `Work Arrangement Exception: Candidate requested a 100% Fully Remote schedule. Company policy mandates Hybrid attendance (3 days/week at Riyadh KAFD HQ).`
    );
  }

  // Check 4-day workweek
  if (combinedRequests.includes("4-day") || combinedRequests.includes("4 day work")) {
    warnings.push(
      `Schedule Policy Violation: Requested 4-day workweek conflicts with standard 5-day KSA enterprise operating schedule (Sunday–Thursday).`
    );
  }

  // Check signing bonus
  const bonusMatch = combinedRequests.match(/(\d+)\s*(?:k)?\s*(?:sar)?\s*(?:signing|sign-on|bonus)/i);
  if (bonusMatch) {
    let bonusAmount = parseInt(bonusMatch[1], 10);
    if (bonusAmount < 200) bonusAmount *= 1000;
    if (bonusAmount > COMPANY_POLICY_SUMMARY.maxSigningBonusSAR) {
      warnings.push(
        `Signing Bonus Threshold Exceeded: Requested signing bonus of ${bonusAmount.toLocaleString()} SAR exceeds the ${COMPANY_POLICY_SUMMARY.maxSigningBonusSAR.toLocaleString()} SAR limit.`
      );
    }
  }

  // Check gaming / unapproved hardware
  if (
    combinedRequests.includes("gaming") ||
    combinedRequests.includes("rtx 4090") ||
    combinedRequests.includes("ps5") ||
    combinedRequests.includes("company car")
  ) {
    warnings.push(
      `Non-Standard Executive/Hardware Perk: Request includes unapproved item(s) (${customRequests.join(", ")}) outside standard IT & Benefits catalog.`
    );
  }

  return {
    is_approved: warnings.length === 0,
    policy_warnings: warnings,
    matched_band: {
      title: band.title,
      department: band.department,
      min_salary_sar: band.minSalarySAR,
      max_salary_sar: band.maxSalarySAR,
      standard_pto_days: band.standardPtoDays,
    },
    evaluated_salary_sar: normalizedSalary,
    salary_delta_sar: normalizedSalary - band.maxSalarySAR,
  };
}

export function buildOfferLetterMarkdown(params: {
  candidate_name: string;
  role: string;
  salary: number;
  start_date: string;
  custom_notes?: string[];
  override_approved?: boolean;
}): string {
  const band = matchRoleBand(params.role);
  const totalMonthly = params.salary > 0 && params.salary < 200 ? params.salary * 1000 : params.salary;
  const basicSalary = Math.round(totalMonthly * 0.65);
  const housingAllowance = Math.round(totalMonthly * 0.25);
  const transportAllowance = totalMonthly - basicSalary - housingAllowance;
  const annualTotal = totalMonthly * 12;
  const refNumber = `CH-KSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const issueDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const overrideBanner = params.override_approved
    ? `> **GOVERNANCE AUDIT STAMP:** \`EXECUTIVE OVERRIDE APPROVED\` — Special compensation/policy exception authorized via Human-in-the-Loop review.\n\n`
    : `> **GOVERNANCE AUDIT STAMP:** \`POLICY COMPLIANT\` — Automatically verified against ClearHire KSA Compensation Band (${band.title}).\n\n`;

  return `# OFFICIAL EMPLOYMENT OFFER CONTRACT
**${COMPANY_POLICY_SUMMARY.companyName}**  
*${COMPANY_POLICY_SUMMARY.headquarters}*  
**Contract Reference:** \`${refNumber}\` | **Date of Issue:** ${issueDate}

---

${overrideBanner}Dear **${params.candidate_name}**,

On behalf of **${COMPANY_POLICY_SUMMARY.companyName}**, we are delighted to extend this formal offer of employment for the position of **${params.role}** within our **${band.department}** division. Following our evaluation, we are confident that your technical leadership and domain expertise will play a pivotal role in scaling our autonomous enterprise initiatives.

### 1. Position & Commencement Details
- **Official Title:** ${params.role} (*Standard Band: ${band.title}*)
- **Department:** ${band.department}
- **Effective Start Date:** ${params.start_date}
- **Primary Work Location:** ${COMPANY_POLICY_SUMMARY.headquarters}
- **Work Model:** ${COMPANY_POLICY_SUMMARY.workModel}
- **Probationary Period:** ${COMPANY_POLICY_SUMMARY.probationPeriodDays} Calendar Days (in accordance with Saudi Labor Law)

---

### 2. Compensation & Allowances (SAR)
Your total guaranteed monthly compensation is **${totalMonthly.toLocaleString()} SAR** (**${annualTotal.toLocaleString()} SAR** per annum), structured in full compliance with KSA Labor Regulations:

| Compensation Component | Monthly Amount (SAR) | Annualized (SAR) | Notes |
| :--- | :--- | :--- | :--- |
| **Basic Salary (65%)** | ${basicSalary.toLocaleString()} SAR | ${(basicSalary * 12).toLocaleString()} SAR | Core pensionable base |
| **Housing Allowance (25%)** | ${housingAllowance.toLocaleString()} SAR | ${(housingAllowance * 12).toLocaleString()} SAR | Paid monthly with payroll |
| **Transport Allowance (10%)** | ${transportAllowance.toLocaleString()} SAR | ${(transportAllowance * 12).toLocaleString()} SAR | Commute & mobility tier |
| **Total Gross Package** | **${totalMonthly.toLocaleString()} SAR** | **${annualTotal.toLocaleString()} SAR** | Direct bank transfer (SAR) |

---

### 3. Benefits, Leave & Enterprise Entitlements
- **Annual Paid Time Off (PTO):** **${band.standardPtoDays} working days** per calendar year, in addition to official Kingdom of Saudi Arabia public and Eid holidays.
- **Medical Insurance:** VIP Class-A private healthcare coverage for you and eligible dependents via Bupa Arabia.
- **End of Service Award (EOSB):** Accrued and settled in accordance with Articles 84 & 85 of the Saudi Labor Law.
${params.custom_notes && params.custom_notes.length > 0 ? `- **Approved Special Provisions:** ${params.custom_notes.join("; ")}` : ""}

---

### 4. Confidentiality, IP & Acceptance
By countersigning this agreement, you acknowledge that all intellectual property, source code, and proprietary models developed during your tenure remain the exclusive property of **${COMPANY_POLICY_SUMMARY.companyName}**. Either party may terminate this contract following the probation period with **${COMPANY_POLICY_SUMMARY.noticePeriodDays} days** written notice.

---

**AUTHORIZED SIGNATURES**

| For ${COMPANY_POLICY_SUMMARY.companyName} | Candidate Acceptance |
| :--- | :--- |
| **Autonomous People Operations & VP Talent** | **${params.candidate_name}** |
| Digital Signature: *Verified via ClearHire AI* | Signature: ___________________________ |
| Date: ${issueDate} | Date: ___________________________ |
`;
}

export interface ItTicketPayload {
  ticket_id: string;
  created_at: string;
  status: "QUEUED_FOR_PROVISIONING" | "OVERRIDDEN_PROVISIONING";
  priority: "HIGH" | "URGENT";
  sla_target: string;
  assigned_queue: string;
  employee_profile: {
    candidate_name: string;
    role: string;
    standardized_band: string;
    department: string;
    start_date: string;
    security_clearance: string;
  };
  hardware_bundle: Array<{
    item_id: string;
    category: "LAPTOP" | "DISPLAY" | "PERIPHERAL" | "SECURITY_KEY";
    model: string;
    specs: string;
    asset_status: "IN_STOCK_RIYADH_DEPOT" | "CUSTOM_ORDER";
    policy_status: "STANDARD_APPROVED" | "EXECUTIVE_EXCEPTION";
  }>;
  zero_trust_access: Array<{
    system: string;
    role_scope: string;
    provisioning_method: "SCIM_AUTO" | "IAM_TERRAFORM" | "SSO_GROUP";
  }>;
  estimated_cost_sar: number;
}

export function buildItTicketPayload(params: {
  candidate_name?: string;
  role: string;
  start_date?: string;
  hardware_requests: string[];
  override_approved?: boolean;
}): ItTicketPayload {
  const band = matchRoleBand(params.role);
  const requestsText = (params.hardware_requests || []).join(" ").toLowerCase();
  const wantsMac =
    requestsText.includes("mac") ||
    requestsText.includes("apple") ||
    requestsText.includes("m3") ||
    requestsText.includes("m4") ||
    !requestsText.includes("windows");

  const wantsLinuxOrDell =
    requestsText.includes("dell") ||
    requestsText.includes("linux") ||
    requestsText.includes("ubuntu") ||
    requestsText.includes("thinkpad");

  const primaryLaptop = wantsLinuxOrDell
    ? {
        item_id: "HW-DELL-XPS16",
        category: "LAPTOP" as const,
        model: "Dell XPS 16 (9640) Developer Edition",
        specs: "Intel Core Ultra 9, 64GB LPDDR5x, 2TB NVMe SSD, Ubuntu 24.04 LTS / Win 11 Pro",
        asset_status: "IN_STOCK_RIYADH_DEPOT" as const,
        policy_status: "STANDARD_APPROVED" as const,
      }
    : band.hardwareTier === "BUSINESS_STANDARD" && !requestsText.includes("pro") && !requestsText.includes("max")
    ? {
        item_id: "HW-APPLE-MBA15",
        category: "LAPTOP" as const,
        model: 'Apple MacBook Air 15" (M3)',
        specs: "Apple M3 8-Core CPU / 10-Core GPU, 24GB Unified Memory, 512GB SSD",
        asset_status: "IN_STOCK_RIYADH_DEPOT" as const,
        policy_status: "STANDARD_APPROVED" as const,
      }
    : {
        item_id: "HW-APPLE-MBP16-M3MAX",
        category: "LAPTOP" as const,
        model: 'Apple MacBook Pro 16" (M3 Max)',
        specs: "Apple M3 Max (16-core CPU, 40-core GPU), 64GB Unified Memory, 2TB NVMe SSD — Space Black",
        asset_status: "IN_STOCK_RIYADH_DEPOT" as const,
        policy_status: "STANDARD_APPROVED" as const,
      };

  const hardwareBundle: ItTicketPayload["hardware_bundle"] = [
    primaryLaptop,
    {
      item_id: "HW-DISP-U2723QE",
      category: "DISPLAY",
      model: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
      specs: "3840 x 2160 IPS Black, 90W USB-C Power Delivery, Ergonomic Arm",
      asset_status: "IN_STOCK_RIYADH_DEPOT",
      policy_status: "STANDARD_APPROVED",
    },
    {
      item_id: "HW-SEC-YUBI5C",
      category: "SECURITY_KEY",
      model: "YubiKey 5C NFC Enterprise FIDO2",
      specs: "Hardware MFA Token + KAFD Smart Building NFC Badge",
      asset_status: "IN_STOCK_RIYADH_DEPOT",
      policy_status: "STANDARD_APPROVED",
    },
  ];

  // Add any custom requested hardware items not already covered
  for (const req of params.hardware_requests || []) {
    const lower = req.toLowerCase();
    if (lower.includes("mac") || lower.includes("laptop") || lower.includes("dell") || lower.includes("thinkpad")) {
      continue;
    }
    const isUnusual = lower.includes("gaming") || lower.includes("4090") || lower.includes("dual 49") || lower.includes("vision pro");
    hardwareBundle.push({
      item_id: `HW-CUST-${Math.floor(100 + Math.random() * 900)}`,
      category: "PERIPHERAL",
      model: req,
      specs: "Custom Candidate Onboarding Request",
      asset_status: isUnusual ? "CUSTOM_ORDER" : "IN_STOCK_RIYADH_DEPOT",
      policy_status: isUnusual ? "EXECUTIVE_EXCEPTION" : "STANDARD_APPROVED",
    });
  }

  const zeroTrustAccess: ItTicketPayload["zero_trust_access"] = [
    {
      system: "Okta Enterprise SSO & Google Workspace",
      role_scope: `sso-${band.id.replace("_", "-")}-ksa`,
      provisioning_method: "SCIM_AUTO",
    },
    {
      system: "Slack Enterprise Grid & Notion Workspace",
      role_scope: `#dept-${band.department.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      provisioning_method: "SCIM_AUTO",
    },
    {
      system: "GitHub Enterprise Cloud & Linear",
      role_scope: band.hardwareTier === "BUSINESS_STANDARD" ? "Read / Triage Access" : "Core Maintainer + Copilot Enterprise",
      provisioning_method: "SSO_GROUP",
    },
    {
      system: "AWS / GCP Sovereign Cloud Region (me-central2)",
      role_scope: band.securityClearance,
      provisioning_method: "IAM_TERRAFORM",
    },
  ];

  return {
    ticket_id: `IT-PROV-${Math.floor(10000 + Math.random() * 90000)}`,
    created_at: new Date().toISOString(),
    status: params.override_approved ? "OVERRIDDEN_PROVISIONING" : "QUEUED_FOR_PROVISIONING",
    priority: "HIGH",
    sla_target: "24 Hours Before Start Date (Day-1 Ready)",
    assigned_queue: "KAFD Endpoint Engineering & Zero-Trust IAM",
    employee_profile: {
      candidate_name: params.candidate_name || "New Hire Candidate",
      role: params.role,
      standardized_band: band.title,
      department: band.department,
      start_date: params.start_date || "November 1, 2026",
      security_clearance: band.securityClearance,
    },
    hardware_bundle: hardwareBundle,
    zero_trust_access: zeroTrustAccess,
    estimated_cost_sar: primaryLaptop.item_id.includes("MBP16") ? 16800 : 9400,
  };
}

export interface PresetScenario {
  id: string;
  label: string;
  badge: string;
  badgeVariant: "success" | "warning" | "info";
  description: string;
  prompt: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "compliant_sarah",
    label: "Sarah — Senior Dev (20k SAR)",
    badge: "Compliant (P0)",
    badgeVariant: "success",
    description: "Standard compliant hire within the 25k SAR Senior Dev salary cap.",
    prompt:
      "Hire Sarah Al-Mansoor for Senior Dev, 20k SAR/month, starts Nov 1st, 2026. She wants a 16-inch MacBook Pro M3 Max and ergonomic vertical mouse. Standard 21 days PTO, hybrid in Riyadh KAFD.",
  },
  {
    id: "violation_omar",
    label: "Omar — Over Salary Cap (31k SAR + 30d PTO)",
    badge: "Triggers HITL Override (P1)",
    badgeVariant: "warning",
    description: "Exceeds Senior Dev 25k SAR cap and 21-day PTO standard — triggers Human-in-the-Loop approval gate.",
    prompt:
      "Urgent hire: Omar Al-Harbi for Senior Software Engineer. Offered 31k SAR monthly salary, starting Nov 15, 2026. He requested 30 days PTO, 100% fully remote work, and a MacBook Pro + dual 4K displays.",
  },
  {
    id: "compliant_layla_ai",
    label: "Layla — Senior AI Engineer (28k SAR)",
    badge: "AI Lab Tier",
    badgeVariant: "info",
    description: "High-tier AI Engineer within the 30k SAR AI Lab band with GPU cluster access.",
    prompt:
      "Onboard Dr. Layla Al-Qahtani as Senior AI Engineer starting December 1st, 2026 at 28,000 SAR/month. Needs a MacBook Pro M3 Max 64GB, high-res 4K monitor, and GPU cluster clearance. Standard 21 days PTO.",
  },
];

