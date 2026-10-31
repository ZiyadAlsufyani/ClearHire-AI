import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  Type,
  FunctionDeclaration,
  FunctionCallingConfigMode,
  Part,
} from "@google/genai";
import {
  COMPANY_POLICY_SYSTEM_PROMPT,
  evaluateHrPolicy,
  buildOfferLetterMarkdown,
  buildItTicketPayload,
  findMatchingRoleBand,
  matchRoleBand,
  PolicyVerificationResult,
  ItTicketPayload,
  AgentStepLog,
  ExtractedCandidate,
} from "@/lib/policies";

// ============================================================================
// EXPLICIT GEMINI FUNCTION DECLARATIONS (@google/genai)
// ============================================================================

const verifyHrPolicyDeclaration: FunctionDeclaration = {
  name: "verify_hr_policy",
  description:
    "Cross-references the candidate's proposed role, monthly salary (in SAR), and any custom requests (such as extra PTO days, remote work, or signing bonuses) against official company HR policy. Also extracts candidate_name, start_date, and hardware_requests from the user's notes or image.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidate_name: {
        type: Type.STRING,
        description:
          "Full or first name of the candidate extracted from the user's input. CRITICAL: If the user did NOT mention a person's name in the input, you MUST pass the exact string 'MISSING'. Never invent or guess a name.",
      },
      role: {
        type: Type.STRING,
        description:
          "The job title, role, or department being hired for (extracted from the user's input regardless of phrasing or word order). CRITICAL: If the user did NOT mention any job role, title, or department in the input (for example, 'Hire Rimas Alsufyani'), you MUST pass the exact string 'MISSING'. Never invent or guess a role.",
      },
      salary: {
        type: Type.NUMBER,
        description:
          "The proposed monthly salary in SAR as a number (e.g., 20000 for 20k SAR). Pass 0 if the user did not specify a salary so the system can default to the role's maximum salary cap.",
      },
      custom_requests: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "List of any special or custom requests mentioned in the notes (e.g., '30 days PTO', '100% fully remote', '20k signing bonus'). Pass an empty array if none.",
      },
      start_date: {
        type: Type.STRING,
        description: "Optional start date extracted from the notes or image.",
      },
      hardware_requests: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional list of hardware items requested by the candidate.",
      },
    },
    required: ["candidate_name", "role", "salary", "custom_requests"],
  },
};

const generateOfferLetterDeclaration: FunctionDeclaration = {
  name: "generate_offer_letter",
  description:
    "Generates a formal, legally structured Markdown employment contract / Offer Letter for the candidate once HR policy verification is approved.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidate_name: {
        type: Type.STRING,
        description: "Full name or first name of the candidate being hired.",
      },
      role: {
        type: Type.STRING,
        description: "Official job title for the employment contract.",
      },
      salary: {
        type: Type.NUMBER,
        description: "Approved monthly total salary in SAR (e.g., 20000).",
      },
      start_date: {
        type: Type.STRING,
        description: "Scheduled employment start date (e.g., 'November 1, 2026').",
      },
    },
    required: ["candidate_name", "role", "salary", "start_date"],
  },
};

const createItTicketDeclaration: FunctionDeclaration = {
  name: "create_it_ticket",
  description:
    "Creates a structured JSON IT Provisioning & Zero-Trust IAM ticket for the candidate's hardware and software access based on their role and hardware requests.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      role: {
        type: Type.STRING,
        description: "The candidate's job role to determine security clearance and base hardware tier.",
      },
      hardware_requests: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          "Array of requested hardware items, laptops, monitors, or peripherals (e.g., ['16-inch MacBook Pro M3 Max', '4K Display']).",
      },
    },
    required: ["role", "hardware_requests"],
  },
};

const AGENT_TOOLS = [
  {
    functionDeclarations: [
      verifyHrPolicyDeclaration,
      generateOfferLetterDeclaration,
      createItTicketDeclaration,
    ],
  },
];

// ============================================================================
// DETERMINISTIC ENTITY PARSER & SMART DEFAULTS ENGINE
// ============================================================================
interface HeuristicParseResult extends ExtractedCandidate {
  hasExplicitName: boolean;
  hasExplicitRole: boolean;
  hasExplicitSalary: boolean;
}

function toTitleCase(str: string): string {
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (/^(hr|it|ai|ml|ui|ux|pm|qa|vp|ceo|cto|cfo|coo|sre|ksa)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function extractCandidateHeuristic(rawNotes: string): HeuristicParseResult {
  const text = rawNotes.trim();

  const ROLE_KEYWORDS_REGEX =
    /\b(dev|developer|engineer|engineering|designer|design|manager|management|architect|scientist|science|analyst|researcher|specialist|director|lead|intern|consultant|coordinator|officer|administrator|admin|pm|ux|ui|qa|devops|sre|data|ai|ml|product|software|frontend|backend|fullstack|cloud|security|hr|human\s+resources|recruiter|talent|finance|accountant|marketing|sales|operations|support|legal|counsel|executive|vp|cto|ceo|cfo|coo)\b/i;

  // 1. Extract candidate name (supports 1 to 4 name parts, case-insensitive, and inverted word order)
  let candidateName = "";
  let hasExplicitName = false;
  const namePatterns = [
    /(?:hire|onboard|candidate\s*[:=-]?|offer\s+for|name\s*[:=-])\s+(?:dr\.?\s+)?([a-zA-Z][a-zA-Z-]+(?:\s+[a-zA-Z][a-zA-Z-]+){0,3})/i,
    /^([a-zA-Z][a-zA-Z-]+(?:\s+[a-zA-Z][a-zA-Z-]+){0,3})\s*(?:[—–,-]|\bfor\b|\bas\b)/im,
  ];
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleaned = match[1]
        .replace(
          /\b(for|as|at|with|in|on|starts|starting|urgent|hire|onboard|candidate|role|position|title|offered|salary|wants|needs|senior|junior|jr|sr|staff|principal|lead|mid|developer|dev|engineer|designer|manager|architect|scientist|analyst|intern|pm|ux|ui|ai|ml|hr|it|product|software|frontend|backend|fullstack)\b.*$/i,
          ""
        )
        .trim();
      if (
        cleaned.length >= 2 &&
        /[a-zA-Z]{2,}/.test(cleaned) &&
        !ROLE_KEYWORDS_REGEX.test(cleaned)
      ) {
        candidateName = toTitleCase(cleaned);
        hasExplicitName = true;
        break;
      }
    }
  }

  // 2. Extract role (supports both "hire X for Y" and inverted "for Y role hire X")
  let role = "";
  let hasExplicitRole = false;
  const rolePatterns = [
    /(?:for|as|role\s*[:=-]|position\s*[:=-]|title\s*[:=-])\s+(?:a\s+|an\s+|the\s+)?([A-Za-z0-9\s/+-]+?)(?:\s+role\b|\s+position\b)?(?:\s+(?:hire|onboard|candidate|for)\b|,|\.|;|at\s+\d|with\s+\d|offered|\d+\s*k|\d{2,3},?\d{3}|starts|starting|wants|needs|requested|\n|$)/i,
    /\b((?:senior|junior|jr|sr|staff|principal|lead|mid|chief|head\s+of|vp\s+of|ai|ml|product|ux|ui|software|fullstack|full\s+stack|frontend|front-end|backend|back-end|cloud|devops|security|data|qa|hr)\s+(?:[A-Za-z/+-]+\s+)?(?:dev|developer|software\s+engineer|ai\s+engineer|ml\s+engineer|engineer|designer|product\s+designer|product\s+manager|manager|architect|scientist|analyst|researcher|specialist|director|intern|consultant|coordinator|officer|recruiter|pm|role))\b/i,
    /\b(software\s+engineer|product\s+manager|product\s+designer|ux\s+designer|ui\s+designer|data\s+scientist|data\s+analyst|ai\s+engineer|ml\s+engineer|devops\s+engineer|cloud\s+architect|engineering\s+manager|project\s+manager|hr\s+specialist|hr\s+manager|human\s+resources|developer|engineer|designer|architect|scientist|analyst|hr|recruiter)\b/i,
  ];
  for (const pattern of rolePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidateRole = match[1]
        .replace(
          /\b(hire|onboard|candidate|starts|starting|at|with|offered|wants|needs|in\s+riyadh|hybrid|remote)\b.*$/i,
          ""
        )
        .replace(/\s+\b(role|position|title)$/i, "")
        .trim();
      if (
        candidateRole.length >= 2 &&
        candidateRole.length <= 50 &&
        !/^\d/.test(candidateRole) &&
        candidateRole.toLowerCase() !== candidateName.toLowerCase() &&
        ROLE_KEYWORDS_REGEX.test(candidateRole)
      ) {
        role = toTitleCase(candidateRole);
        hasExplicitRole = true;
        break;
      }
    }
  }

  const matchedBand = matchRoleBand(role || "Senior Software Engineer");

  // 3. Extract salary in SAR (Default to HIGHEST salary cap for the role if omitted!)
  let salary = matchedBand.maxSalarySAR;
  let hasExplicitSalary = false;
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\s*(?:sar)?/i);
  const fullNumMatch = text.match(
    /(\d{2,3},\d{3}|\d{5,6})\s*(?:sar|riyal|per\s*month|\/month)?/i
  );
  if (kMatch) {
    salary = Math.round(parseFloat(kMatch[1]) * 1000);
    hasExplicitSalary = true;
  } else if (fullNumMatch) {
    salary = parseInt(fullNumMatch[1].replace(/,/g, ""), 10);
    hasExplicitSalary = true;
  }

  // 4. Extract start date (Default to standard 2-week onboarding lead time if omitted)
  let startDate = "November 15, 2026";
  const dateMatch = text.match(
    /(?:starts?|starting|commencing|from|date\s*[:=-])\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i
  );
  if (dateMatch && dateMatch[1]) {
    startDate = dateMatch[1].trim();
  }

  // 5. Extract custom requests (Default to empty -> standard 21d PTO & Hybrid schedule)
  const customRequests: string[] = [];
  const ptoMatch = text.match(/(\d+\s*days?\s*(?:pto|leave|vacation|holiday))/i);
  if (ptoMatch) customRequests.push(ptoMatch[1]);
  if (/100%\s*(?:fully\s*)?remote|fully\s*remote|work\s*from\s*abroad/i.test(text)) {
    customRequests.push("100% Fully Remote Work Arrangement");
  }
  if (/4-day|4\s+day\s+work/i.test(text)) {
    customRequests.push("4-day workweek schedule");
  }
  const bonusMatch = text.match(/(\d+\s*k?\s*(?:sar\s*)?(?:signing|sign-on)\s*bonus)/i);
  if (bonusMatch) customRequests.push(bonusMatch[1]);

  // 6. Extract hardware requests (Default to role's standard workstation bundle if omitted)
  const hardwareRequests: string[] = [];
  if (/macbook\s*pro|mbp|m3\s*max|16-inch\s*mac/i.test(text)) {
    hardwareRequests.push('Apple MacBook Pro 16" (M3 Max)');
  } else if (/macbook|mac/i.test(text)) {
    hardwareRequests.push("Apple MacBook Pro");
  }
  if (/dell|xps|linux|ubuntu/i.test(text)) {
    hardwareRequests.push("Dell XPS 16 Developer Edition");
  }
  if (/dual\s*4k|two\s*monitors|dual\s*displays|4k\s*monitor|4k\s*display/i.test(text)) {
    hardwareRequests.push("Dual 27-inch 4K UltraSharp Displays");
  }
  if (/mouse|ergonomic/i.test(text)) {
    hardwareRequests.push("Logitech MX Vertical Ergonomic Mouse");
  }
  if (/gpu\s*cluster|h100/i.test(text)) {
    hardwareRequests.push("Dedicated Cloud H100 GPU Node Quota");
  }
  if (hardwareRequests.length === 0) {
    hardwareRequests.push(
      matchedBand.hardwareTier === "BUSINESS_STANDARD"
        ? 'Apple MacBook Air 15" (M3)'
        : 'Apple MacBook Pro 16" (M3 Max)',
      'Dell UltraSharp 27" 4K USB-C Hub Monitor'
    );
  }

  return {
    candidate_name: candidateName,
    role,
    salary,
    start_date: startDate,
    custom_requests: customRequests,
    hardware_requests: hardwareRequests,
    hasExplicitName,
    hasExplicitRole,
    hasExplicitSalary,
  };
}

// ============================================================================
// MAIN POST ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = "run_agent", // "run_agent" | "extract_image"
      prompt = "",
      imageBase64,
      imageMimeType,
      fallbackHint = "",
      overrideMode = "none", // "none" | "approve_exception" | "cap_to_band"
      apiKey: clientApiKey,
      selectedModel = "auto",
      forceSandbox = false,
    } = body as {
      action?: "run_agent" | "extract_image";
      prompt?: string;
      imageBase64?: string;
      imageMimeType?: string;
      fallbackHint?: string;
      overrideMode?: "none" | "approve_exception" | "cap_to_band";
      apiKey?: string;
      selectedModel?: string;
      forceSandbox?: boolean;
    };

    const resolvedApiKey =
      (clientApiKey && clientApiKey.trim()) ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      "";

    const defaultFallbackModels = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ];
    const candidateModels =
      selectedModel && selectedModel !== "auto"
        ? [
            selectedModel,
            ...defaultFallbackModels.filter((m) => m !== selectedModel),
          ]
        : defaultFallbackModels;

    // ========================================================================
    // MODE 1: MULTIMODAL IMAGE-TO-TEXT EXTRACTION (action === "extract_image")
    // ========================================================================
    if (action === "extract_image") {
      if (!imageBase64) {
        return NextResponse.json(
          { error: "No image provided for text extraction." },
          { status: 400 }
        );
      }

      if (!forceSandbox) {
        if (!resolvedApiKey) {
          return NextResponse.json({
            status: "gemini_error",
            geminiError: true,
            errorMessage:
              "No Gemini API Key is configured to extract text from this image with Gemini Vision. Would you like to proceed using the Tool Sandbox fallback?",
          });
        }

        try {
          const ai = new GoogleGenAI({ apiKey: resolvedApiKey });
          let visionResponse = null;
          let lastErr: unknown = null;
          let usedModel = candidateModels[0];

          for (const modelName of candidateModels) {
            try {
              usedModel = modelName;
              visionResponse = await ai.models.generateContent({
                model: modelName,
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        inlineData: {
                          data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                          mimeType: imageMimeType || "image/png",
                        },
                      },
                      {
                        text: "Transcribe and extract the hiring request details from this handwritten interview note or resume image into a clear, editable hiring request note. Include Candidate Name, Target Role, Monthly Salary (in SAR if present), Start Date, Leave/PTO/Work Arrangement, and IT Hardware requests. Return ONLY the plain text hiring request notes without markdown code fences.",
                      },
                    ],
                  },
                ],
                config: {
                  temperature: 0.1,
                },
              });
              break;
            } catch (err) {
              lastErr = err;
            }
          }

          if (!visionResponse || !visionResponse.text) {
            throw lastErr || new Error("Gemini Vision returned an empty response.");
          }

          return NextResponse.json({
            status: "extracted",
            extractedText: visionResponse.text.trim(),
            engineMode: "gemini_live",
            model: usedModel,
          });
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : "Gemini Vision failed to extract text from the uploaded image.";
          return NextResponse.json({
            status: "gemini_error",
            geminiError: true,
            errorMessage: `Gemini Vision API Error: ${msg}`,
          });
        }
      }

      // User confirmed Tool Sandbox fallback for image extraction
      return NextResponse.json({
        status: "extracted",
        extractedText:
          fallbackHint ||
          "Hire Tariq Al-Dosari for Senior Software Engineer, 23,500 SAR/month, starts November 15, 2026. Standard 21 days PTO, hybrid in Riyadh. Wants 16-inch MacBook Pro M3 Max and 4K Monitor.",
        engineMode: "simulated_fallback",
        model: "deterministic-tool-engine",
      });
    }

    // ========================================================================
    // MODE 2: MAIN AUTONOMOUS ONBOARDING AGENT (action === "run_agent")
    // ========================================================================
    if (!prompt.trim() && !imageBase64) {
      return NextResponse.json(
        { error: "Please provide hiring request notes or upload an interview note image." },
        { status: 400 }
      );
    }

    const steps: AgentStepLog[] = [];
    const nowIso = () => new Date().toISOString();

    const heuristicCandidate = extractCandidateHeuristic(prompt);

    // If user hasn't confirmed Tool Sandbox and no API key is configured, ask confirmation first!
    if (!forceSandbox && !resolvedApiKey) {
      return NextResponse.json({
        status: "gemini_error",
        geminiError: true,
        errorMessage:
          "No Gemini API Key is configured. Would you like to proceed using the Deterministic Tool Sandbox instead?",
      });
    }

    let policyResult: PolicyVerificationResult | null = null;
    let offerLetterMarkdown: string | null = null;
    let itTicketPayload: ItTicketPayload | null = null;
    let agentSummary = "";
    let engineMode: "gemini_live" | "simulated_fallback" =
      resolvedApiKey && !forceSandbox ? "gemini_live" : "simulated_fallback";
    let usedModelName =
      selectedModel && selectedModel !== "auto" ? selectedModel : "gemini-3.8-flash";

    // Step 1: Parsing input
    steps.push({
      id: "step-parse",
      phase: "parse",
      title: imageBase64
        ? "Multimodal Vision + Text Parsing"
        : "Analyzing Hiring Request Notes",
      detail: imageBase64
        ? "Extracting candidate entities, compensation, and hardware needs from uploaded image and notes..."
        : "Tokenizing recruiter notes to extract candidate name, target role, SAR compensation, start date, and hardware requests.",
      status: "completed",
      timestamp: nowIso(),
    });

    // ========================================================================
    // LIVE GEMINI FUNCTION-CALLING PIPELINE (@google/genai)
    // ========================================================================
    if (resolvedApiKey && !forceSandbox) {
      try {
        const ai = new GoogleGenAI({ apiKey: resolvedApiKey });

        const userParts: Part[] = [];
        if (imageBase64 && imageMimeType) {
          userParts.push({
            inlineData: {
              data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
              mimeType: imageMimeType,
            },
          });
        }

        const overrideInstruction =
          overrideMode === "approve_exception"
            ? "\n\n[SYSTEM GOVERNANCE UPDATE: Human-in-the-Loop Executive Override has APPROVED all policy exceptions for this candidate. After calling verify_hr_policy, you MUST proceed to call generate_offer_letter and create_it_ticket immediately.]"
            : overrideMode === "cap_to_band"
            ? "\n\n[SYSTEM GOVERNANCE UPDATE: Recruiter chose to AUTO-ADJUST the offer to comply with the maximum allowed salary cap and standard 21-day PTO for this role. Call verify_hr_policy, generate_offer_letter, and create_it_ticket using the capped policy-compliant salary.]"
            : "";

        userParts.push({
          text: `${
            prompt.trim() ||
            "Extract the hiring request details from this handwritten interview note image and onboard the candidate."
          }${overrideInstruction}`,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contents: any[] = [{ role: "user", parts: userParts }];

        let response = null;
        let lastModelError: unknown = null;

        // On initial check (overrideMode === "none"), ONLY allow verify_hr_policy on Turn 1
        // so that if there is a policy violation, Gemini never wastes tokens/time calling
        // generate_offer_letter or create_it_ticket before halting!
        const initialAllowedFunctions =
          overrideMode === "none"
            ? ["verify_hr_policy"]
            : ["verify_hr_policy", "generate_offer_letter", "create_it_ticket"];

        for (const modelName of candidateModels) {
          try {
            usedModelName = modelName;
            response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction: COMPANY_POLICY_SYSTEM_PROMPT,
                tools: AGENT_TOOLS,
                toolConfig: {
                  functionCallingConfig: {
                    mode: FunctionCallingConfigMode.ANY,
                    allowedFunctionNames: initialAllowedFunctions,
                  },
                },
                temperature: 0.1,
              },
            });
            break;
          } catch (err) {
            lastModelError = err;
          }
        }

        if (!response) {
          throw lastModelError || new Error("Failed to invoke Gemini model.");
        }

        // Multi-turn tool execution loop (up to 5 turns)
        let turnCount = 0;
        let haltedForHitl = false;

        while (
          response.functionCalls &&
          response.functionCalls.length > 0 &&
          turnCount < 5 &&
          !haltedForHitl
        ) {
          turnCount++;
          const modelCandidateContent = response.candidates?.[0]?.content;
          if (modelCandidateContent) {
            contents.push(modelCandidateContent);
          }

          const toolResponseParts: Part[] = [];

          for (const fnCall of response.functionCalls) {
            const fnName = fnCall.name || "";
            const args = (fnCall.args || {}) as Record<string, unknown>;

            if (fnName === "verify_hr_policy") {
              const llmName = String(args.candidate_name || "").trim();
              const llmRole = String(args.role || "").trim();

              const resolvedName =
                llmName && llmName.toUpperCase() !== "MISSING"
                  ? llmName
                  : heuristicCandidate.candidate_name;

              // Guard against LLM hallucinating a role when the prompt is just "Hire <Name>" with no role/position words
              const isBareNameOnlyPrompt =
                !imageBase64 &&
                !heuristicCandidate.hasExplicitRole &&
                /^(?:please\s+)?(?:hire|onboard)\s+[a-zA-Z\s.-]+$/i.test(prompt.trim());

              const resolvedRole =
                !isBareNameOnlyPrompt && llmRole && llmRole.toUpperCase() !== "MISSING"
                  ? llmRole
                  : heuristicCandidate.role;

              const hasValidName =
                Boolean(resolvedName) && resolvedName.toUpperCase() !== "MISSING";
              const hasValidRole =
                Boolean(resolvedRole) && resolvedRole.toUpperCase() !== "MISSING";

              if (!hasValidName || !hasValidRole) {
                let missingError =
                  "Missing required fields: Could not extract both the Candidate's Name and Target Role. Please provide both (e.g., 'Hire Sarah for Senior Dev').";
                if (hasValidName && !hasValidRole) {
                  missingError = `Missing required field (Target Role): Could not extract a job role for ${resolvedName}. Please specify the target role (e.g., 'Hire ${resolvedName} for Senior Dev').`;
                } else if (!hasValidName && hasValidRole) {
                  missingError = `Missing required field (Candidate Name): Could not extract the candidate's name for the ${resolvedRole} position.`;
                }
                return NextResponse.json({ error: missingError }, { status: 400 });
              }

              // Verify that the extracted role has an associated company HR policy band
              const matchedBand = findMatchingRoleBand(resolvedRole);
              if (!matchedBand) {
                return NextResponse.json(
                  {
                    error: `Unmapped Role Policy Error: The role "${resolvedRole}" does not have an associated HR policy band. Supported HR policy roles are: Junior/Mid/Senior Software Engineer, Senior AI/ML Engineer, Staff/Principal Engineer, Senior Product Designer, Product Manager, and HR & People Operations Specialist.`,
                  },
                  { status: 400 }
                );
              }

              heuristicCandidate.candidate_name = resolvedName;
              if (args.start_date) {
                heuristicCandidate.start_date = String(args.start_date);
              }
              if (
                Array.isArray(args.hardware_requests) &&
                args.hardware_requests.length > 0
              ) {
                heuristicCandidate.hardware_requests =
                  args.hardware_requests.map(String);
              }

              const roleArg = resolvedRole;

              // Default to highest salary range (matchedBand.maxSalarySAR) if salary was omitted
              let salaryArg = Number(args.salary || 0);
              if (!salaryArg || isNaN(salaryArg)) {
                salaryArg = heuristicCandidate.hasExplicitSalary
                  ? heuristicCandidate.salary
                  : matchedBand.maxSalarySAR;
              }
              if (salaryArg > 0 && salaryArg < 200) salaryArg *= 1000;

              let customReqArg = Array.isArray(args.custom_requests)
                ? args.custom_requests.map(String)
                : heuristicCandidate.custom_requests;

              // If user selected "cap_to_band", clamp salary & custom requests to policy limits
              if (overrideMode === "cap_to_band") {
                if (salaryArg > matchedBand.maxSalarySAR) {
                  salaryArg = matchedBand.maxSalarySAR;
                }
                customReqArg = [];
              }

              heuristicCandidate.role = roleArg;
              heuristicCandidate.salary = salaryArg;
              heuristicCandidate.custom_requests = customReqArg;

              const evaluation = evaluateHrPolicy(roleArg, salaryArg, customReqArg);

              if (overrideMode === "approve_exception" && !evaluation.is_approved) {
                evaluation.override_applied = true;
              }

              policyResult = evaluation;

              const effectiveApproved =
                evaluation.is_approved || overrideMode === "approve_exception";

              steps.push({
                id: `step-policy-${turnCount}`,
                phase: "policy",
                title: effectiveApproved
                  ? "HR Policy Verification Passed (verify_hr_policy)"
                  : "HR Policy Violation Flagged (verify_hr_policy)",
                detail: effectiveApproved
                  ? evaluation.override_applied
                    ? `Executive Override applied for ${matchedBand.title} (${salaryArg.toLocaleString()} SAR/mo). Proceeding to artifact generation.`
                    : `Verified ${salaryArg.toLocaleString()} SAR/mo is within ${matchedBand.title} cap (${matchedBand.maxSalarySAR.toLocaleString()} SAR/mo).`
                  : evaluation.policy_warnings.join(" "),
                status: effectiveApproved ? "completed" : "warning",
                timestamp: nowIso(),
                toolName: "verify_hr_policy",
                toolArgs: {
                  role: roleArg,
                  salary: salaryArg,
                  custom_requests: customReqArg,
                },
                toolResult: evaluation,
              });

              // Check Human-in-the-Loop Pause Gate!
              if (!effectiveApproved && overrideMode === "none") {
                haltedForHitl = true;
                steps.push({
                  id: "step-hitl-pause",
                  phase: "hitl",
                  title: "Paused for Human-in-the-Loop Governance Override",
                  detail:
                    "Autonomous agent halted contract generation due to HR policy violation(s). Awaiting human reviewer decision: Approve Exception, Auto-Adjust to Policy Cap, or Reject.",
                  status: "paused",
                  timestamp: nowIso(),
                });
                break;
              }

              toolResponseParts.push({
                functionResponse: {
                  ...(fnCall.id ? { id: fnCall.id } : {}),
                  name: "verify_hr_policy",
                  response: {
                    is_approved: effectiveApproved,
                    policy_warnings: evaluation.policy_warnings,
                    override_applied: Boolean(evaluation.override_applied),
                    approved_salary_sar: salaryArg,
                    instruction:
                      "Policy check complete and approved. Now call BOTH generate_offer_letter and create_it_ticket.",
                  },
                },
              });
            } else if (fnName === "generate_offer_letter") {
              const candidateNameArg = String(
                args.candidate_name || heuristicCandidate.candidate_name
              );
              const roleArg = String(args.role || heuristicCandidate.role);
              let salaryArg = Number(args.salary || heuristicCandidate.salary);
              if (salaryArg > 0 && salaryArg < 200) salaryArg *= 1000;
              if (overrideMode === "cap_to_band") {
                const band = matchRoleBand(roleArg);
                if (salaryArg > band.maxSalarySAR) salaryArg = band.maxSalarySAR;
              }
              const startDateArg = String(
                args.start_date || heuristicCandidate.start_date
              );

              heuristicCandidate.candidate_name = candidateNameArg;
              heuristicCandidate.role = roleArg;
              heuristicCandidate.salary = salaryArg;
              heuristicCandidate.start_date = startDateArg;

              offerLetterMarkdown = buildOfferLetterMarkdown({
                candidate_name: candidateNameArg,
                role: roleArg,
                salary: salaryArg,
                start_date: startDateArg,
                custom_notes: heuristicCandidate.custom_requests,
                override_approved: overrideMode === "approve_exception",
              });

              steps.push({
                id: `step-offer-${turnCount}`,
                phase: "offer",
                title: "Drafted Employment Offer Letter (generate_offer_letter)",
                detail: `Generated formal KSA Employment Contract for ${candidateNameArg} (${roleArg} @ ${salaryArg.toLocaleString()} SAR/mo, starting ${startDateArg}).`,
                status: "completed",
                timestamp: nowIso(),
                toolName: "generate_offer_letter",
                toolArgs: {
                  candidate_name: candidateNameArg,
                  role: roleArg,
                  salary: salaryArg,
                  start_date: startDateArg,
                },
                toolResult: {
                  contract_status: "GENERATED",
                  markdown_length: offerLetterMarkdown.length,
                },
              });

              toolResponseParts.push({
                functionResponse: {
                  ...(fnCall.id ? { id: fnCall.id } : {}),
                  name: "generate_offer_letter",
                  response: {
                    status: "success",
                    offer_letter_markdown: offerLetterMarkdown,
                  },
                },
              });
            } else if (fnName === "create_it_ticket") {
              const roleArg = String(args.role || heuristicCandidate.role);
              const hardwareReqsArg = Array.isArray(args.hardware_requests)
                ? args.hardware_requests.map(String)
                : heuristicCandidate.hardware_requests;

              heuristicCandidate.hardware_requests = hardwareReqsArg;

              itTicketPayload = buildItTicketPayload({
                candidate_name: heuristicCandidate.candidate_name,
                role: roleArg,
                start_date: heuristicCandidate.start_date,
                hardware_requests: hardwareReqsArg,
                override_approved: overrideMode === "approve_exception",
              });

              steps.push({
                id: `step-it-${turnCount}`,
                phase: "it_ticket",
                title: "Created IT & IAM Provisioning Ticket (create_it_ticket)",
                detail: `Dispatched ticket ${itTicketPayload.ticket_id} with ${itTicketPayload.hardware_bundle.length} hardware assets and ${itTicketPayload.zero_trust_access.length} Zero-Trust IAM groups.`,
                status: "completed",
                timestamp: nowIso(),
                toolName: "create_it_ticket",
                toolArgs: {
                  role: roleArg,
                  hardware_requests: hardwareReqsArg,
                },
                toolResult: itTicketPayload,
              });

              toolResponseParts.push({
                functionResponse: {
                  ...(fnCall.id ? { id: fnCall.id } : {}),
                  name: "create_it_ticket",
                  response: {
                    status: "success",
                    ticket: itTicketPayload,
                  },
                },
              });
            }
          }

          if (haltedForHitl) {
            break;
          }

          // If all 3 tools have finished executing, stop immediately without making
          // an extra round-trip API call to Gemini (saves API quota and latency!)
          if (policyResult && offerLetterMarkdown && itTicketPayload) {
            break;
          }

          if (toolResponseParts.length > 0) {
            contents.push({
              role: "user",
              parts: toolResponseParts,
            });

            const remainingFunctions: string[] = [];
            if (!offerLetterMarkdown) remainingFunctions.push("generate_offer_letter");
            if (!itTicketPayload) remainingFunctions.push("create_it_ticket");

            response = await ai.models.generateContent({
              model: usedModelName,
              contents,
              config: {
                systemInstruction: COMPANY_POLICY_SYSTEM_PROMPT,
                tools: AGENT_TOOLS,
                toolConfig: {
                  functionCallingConfig:
                    remainingFunctions.length > 0
                      ? {
                          mode: FunctionCallingConfigMode.ANY,
                          allowedFunctionNames: remainingFunctions,
                        }
                      : {
                          mode: FunctionCallingConfigMode.AUTO,
                        },
                },
                temperature: 0.1,
              },
            });
          } else {
            break;
          }
        }

        if (haltedForHitl) {
          return NextResponse.json({
            status: "awaiting_override",
            engineMode,
            model: usedModelName,
            candidate: heuristicCandidate,
            policyResult,
            offerLetterMarkdown: null,
            itTicket: null,
            steps,
            agentSummary:
              "Onboarding workflow paused at the Governance Gate. One or more HR policy thresholds were exceeded. Please review the flagged warnings and either Approve an Executive Override, Auto-Adjust to Policy Cap, or Reject the request.",
          });
        }

        // Ensure all 3 tools were executed if policy was approved (in case the LLM stopped early after 1 tool)
        if (!policyResult) {
          const band = matchRoleBand(heuristicCandidate.role);
          if (overrideMode === "cap_to_band" && heuristicCandidate.salary > band.maxSalarySAR) {
            heuristicCandidate.salary = band.maxSalarySAR;
            heuristicCandidate.custom_requests = [];
          }
          policyResult = evaluateHrPolicy(
            heuristicCandidate.role,
            heuristicCandidate.salary,
            heuristicCandidate.custom_requests
          );
          if (overrideMode === "approve_exception" && !policyResult.is_approved) {
            policyResult.override_applied = true;
          }
          const effectiveApproved =
            policyResult.is_approved || overrideMode === "approve_exception";

          steps.push({
            id: "step-policy-ensured",
            phase: "policy",
            title: effectiveApproved
              ? "HR Policy Verification Passed (verify_hr_policy)"
              : "HR Policy Violation Flagged (verify_hr_policy)",
            detail: effectiveApproved
              ? `Verified ${heuristicCandidate.salary.toLocaleString()} SAR/mo against ${band.title} band.`
              : policyResult.policy_warnings.join(" "),
            status: effectiveApproved ? "completed" : "warning",
            timestamp: nowIso(),
            toolName: "verify_hr_policy",
            toolArgs: {
              role: heuristicCandidate.role,
              salary: heuristicCandidate.salary,
              custom_requests: heuristicCandidate.custom_requests,
            },
            toolResult: policyResult,
          });

          if (!effectiveApproved && overrideMode === "none") {
            steps.push({
              id: "step-hitl-pause",
              phase: "hitl",
              title: "Paused for Human-in-the-Loop Governance Override",
              detail:
                "Autonomous agent halted contract generation due to HR policy violation(s).",
              status: "paused",
              timestamp: nowIso(),
            });
            return NextResponse.json({
              status: "awaiting_override",
              engineMode,
              model: usedModelName,
              candidate: heuristicCandidate,
              policyResult,
              offerLetterMarkdown: null,
              itTicket: null,
              steps,
              agentSummary:
                "Onboarding workflow paused at the Governance Gate due to HR policy violation(s).",
            });
          }
        }

        if (!offerLetterMarkdown) {
          offerLetterMarkdown = buildOfferLetterMarkdown({
            candidate_name: heuristicCandidate.candidate_name,
            role: heuristicCandidate.role,
            salary: heuristicCandidate.salary,
            start_date: heuristicCandidate.start_date,
            custom_notes: heuristicCandidate.custom_requests,
            override_approved: overrideMode === "approve_exception",
          });
          steps.push({
            id: "step-offer-ensured",
            phase: "offer",
            title: "Drafted Employment Offer Letter (generate_offer_letter)",
            detail: `Generated formal KSA Employment Contract for ${heuristicCandidate.candidate_name}.`,
            status: "completed",
            timestamp: nowIso(),
            toolName: "generate_offer_letter",
            toolArgs: {
              candidate_name: heuristicCandidate.candidate_name,
              role: heuristicCandidate.role,
              salary: heuristicCandidate.salary,
              start_date: heuristicCandidate.start_date,
            },
            toolResult: {
              contract_status: "GENERATED",
              markdown_length: offerLetterMarkdown.length,
            },
          });
        }

        if (!itTicketPayload) {
          itTicketPayload = buildItTicketPayload({
            candidate_name: heuristicCandidate.candidate_name,
            role: heuristicCandidate.role,
            start_date: heuristicCandidate.start_date,
            hardware_requests: heuristicCandidate.hardware_requests,
            override_approved: overrideMode === "approve_exception",
          });
          steps.push({
            id: "step-it-ensured",
            phase: "it_ticket",
            title: "Created IT & IAM Provisioning Ticket (create_it_ticket)",
            detail: `Dispatched ticket ${itTicketPayload.ticket_id} to ${itTicketPayload.assigned_queue}.`,
            status: "completed",
            timestamp: nowIso(),
            toolName: "create_it_ticket",
            toolArgs: {
              role: heuristicCandidate.role,
              hardware_requests: heuristicCandidate.hardware_requests,
            },
            toolResult: itTicketPayload,
          });
        }

        agentSummary = `Successfully onboarded ${heuristicCandidate.candidate_name} for ${heuristicCandidate.role} at ${heuristicCandidate.salary.toLocaleString()} SAR/month starting ${heuristicCandidate.start_date}. Both the Employment Contract and IT Ticket (${itTicketPayload.ticket_id}) have been generated.`;

        steps.push({
          id: "step-complete",
          phase: "complete",
          title: "Autonomous Onboarding Package Finalized",
          detail: `Offer contract and IT ticket ${itTicketPayload.ticket_id} synthesized and ready for dispatch.`,
          status: "completed",
          timestamp: nowIso(),
        });

        return NextResponse.json({
          status: "completed",
          engineMode,
          model: usedModelName,
          candidate: heuristicCandidate,
          policyResult,
          offerLetterMarkdown,
          itTicket: itTicketPayload,
          steps,
          agentSummary,
        });
      } catch (geminiError: unknown) {
        console.warn("Gemini API call failed:", geminiError);
        const errMsg =
          geminiError instanceof Error
            ? geminiError.message
            : "Failed to communicate with the Gemini API.";
        return NextResponse.json({
          status: "gemini_error",
          geminiError: true,
          errorMessage: `Gemini API Error: ${errMsg}`,
        });
      }
    }

    // ========================================================================
    // DETERMINISTIC TOOL EXECUTION ENGINE (When no API key is set or fallback)
    // ========================================================================
    if (!heuristicCandidate.candidate_name || !heuristicCandidate.role) {
      let missingError =
        "Missing required fields: Could not extract both the Candidate's Name and Target Role. Please provide both (e.g., 'Hire Sarah for Senior Dev').";
      if (heuristicCandidate.candidate_name && !heuristicCandidate.role) {
        missingError = `Missing required field (Target Role): Could not extract a job role for ${heuristicCandidate.candidate_name}. Please specify the target role (e.g., 'Hire ${heuristicCandidate.candidate_name} for Senior Dev').`;
      } else if (!heuristicCandidate.candidate_name && heuristicCandidate.role) {
        missingError = `Missing required field (Candidate Name): Could not extract the candidate's name for the ${heuristicCandidate.role} position.`;
      }
      return NextResponse.json({ error: missingError }, { status: 400 });
    }

    const matchedBand = findMatchingRoleBand(heuristicCandidate.role);
    if (!matchedBand) {
      return NextResponse.json(
        {
          error: `Unmapped Role Policy Error: The role "${heuristicCandidate.role}" does not have an associated HR policy band. Supported HR policy roles are: Junior/Mid/Senior Software Engineer, Senior AI/ML Engineer, Staff/Principal Engineer, Senior Product Designer, Product Manager, and HR & People Operations Specialist.`,
        },
        { status: 400 }
      );
    }
    if (!heuristicCandidate.hasExplicitSalary) {
      heuristicCandidate.salary = matchedBand.maxSalarySAR;
    }
    if (overrideMode === "cap_to_band") {
      if (heuristicCandidate.salary > matchedBand.maxSalarySAR) {
        heuristicCandidate.salary = matchedBand.maxSalarySAR;
      }
      heuristicCandidate.custom_requests = [];
    }

    policyResult = evaluateHrPolicy(
      heuristicCandidate.role,
      heuristicCandidate.salary,
      heuristicCandidate.custom_requests
    );

    if (overrideMode === "approve_exception" && !policyResult.is_approved) {
      policyResult.override_applied = true;
    }

    const effectiveApproved =
      policyResult.is_approved || overrideMode === "approve_exception";

    steps.push({
      id: "step-policy-sim",
      phase: "policy",
      title: effectiveApproved
        ? "HR Policy Verification Passed (verify_hr_policy)"
        : "HR Policy Violation Flagged (verify_hr_policy)",
      detail: effectiveApproved
        ? policyResult.override_applied
          ? `Executive Override applied for ${matchedBand.title} (${heuristicCandidate.salary.toLocaleString()} SAR/mo).`
          : `Verified ${heuristicCandidate.salary.toLocaleString()} SAR/mo is within ${matchedBand.title} maximum cap of ${matchedBand.maxSalarySAR.toLocaleString()} SAR/mo.`
        : policyResult.policy_warnings.join(" "),
      status: effectiveApproved ? "completed" : "warning",
      timestamp: nowIso(),
      toolName: "verify_hr_policy",
      toolArgs: {
        role: heuristicCandidate.role,
        salary: heuristicCandidate.salary,
        custom_requests: heuristicCandidate.custom_requests,
      },
      toolResult: policyResult,
    });

    if (!effectiveApproved && overrideMode === "none") {
      steps.push({
        id: "step-hitl-pause",
        phase: "hitl",
        title: "Paused for Human-in-the-Loop Governance Override",
        detail:
          "Autonomous agent halted contract generation due to HR policy violation(s). Awaiting human reviewer decision.",
        status: "paused",
        timestamp: nowIso(),
      });

      return NextResponse.json({
        status: "awaiting_override",
        engineMode,
        model: "deterministic-tool-engine",
        candidate: heuristicCandidate,
        policyResult,
        offerLetterMarkdown: null,
        itTicket: null,
        steps,
        agentSummary:
          "Onboarding workflow paused at the Governance Gate. One or more HR policy thresholds were exceeded. Please review the flagged warnings and either Approve an Executive Override, Auto-Adjust to Policy Cap, or Reject the request.",
      });
    }

    // Tool 2: generate_offer_letter
    offerLetterMarkdown = buildOfferLetterMarkdown({
      candidate_name: heuristicCandidate.candidate_name,
      role: heuristicCandidate.role,
      salary: heuristicCandidate.salary,
      start_date: heuristicCandidate.start_date,
      custom_notes: heuristicCandidate.custom_requests,
      override_approved: overrideMode === "approve_exception",
    });

    steps.push({
      id: "step-offer-sim",
      phase: "offer",
      title: "Drafted Employment Offer Letter (generate_offer_letter)",
      detail: `Generated formal KSA Employment Contract for ${heuristicCandidate.candidate_name} (${heuristicCandidate.role} @ ${heuristicCandidate.salary.toLocaleString()} SAR/mo, starting ${heuristicCandidate.start_date}).`,
      status: "completed",
      timestamp: nowIso(),
      toolName: "generate_offer_letter",
      toolArgs: {
        candidate_name: heuristicCandidate.candidate_name,
        role: heuristicCandidate.role,
        salary: heuristicCandidate.salary,
        start_date: heuristicCandidate.start_date,
      },
      toolResult: {
        contract_status: "GENERATED",
        markdown_length: offerLetterMarkdown.length,
      },
    });

    // Tool 3: create_it_ticket
    itTicketPayload = buildItTicketPayload({
      candidate_name: heuristicCandidate.candidate_name,
      role: heuristicCandidate.role,
      start_date: heuristicCandidate.start_date,
      hardware_requests: heuristicCandidate.hardware_requests,
      override_approved: overrideMode === "approve_exception",
    });

    steps.push({
      id: "step-it-sim",
      phase: "it_ticket",
      title: "Created IT & IAM Provisioning Ticket (create_it_ticket)",
      detail: `Dispatched ticket ${itTicketPayload.ticket_id} with ${itTicketPayload.hardware_bundle.length} hardware assets and ${itTicketPayload.zero_trust_access.length} Zero-Trust IAM groups.`,
      status: "completed",
      timestamp: nowIso(),
      toolName: "create_it_ticket",
      toolArgs: {
        role: heuristicCandidate.role,
        hardware_requests: heuristicCandidate.hardware_requests,
      },
      toolResult: itTicketPayload,
    });

    steps.push({
      id: "step-complete-sim",
      phase: "complete",
      title: "Autonomous Onboarding Package Finalized",
      detail: `Offer contract and IT ticket ${itTicketPayload.ticket_id} synthesized and ready for dispatch.`,
      status: "completed",
      timestamp: nowIso(),
    });

    agentSummary = `Successfully onboarded ${heuristicCandidate.candidate_name} for ${heuristicCandidate.role} at ${heuristicCandidate.salary.toLocaleString()} SAR/month starting ${heuristicCandidate.start_date}. Both the Employment Contract and IT Ticket (${itTicketPayload.ticket_id}) have been generated.`;

    return NextResponse.json({
      status: "completed",
      engineMode,
      model: "deterministic-tool-engine",
      candidate: heuristicCandidate,
      policyResult,
      offerLetterMarkdown,
      itTicket: itTicketPayload,
      steps,
      agentSummary,
    });
  } catch (error: unknown) {
    console.error("Agent API Error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected error in Autonomous Onboarding Agent.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

