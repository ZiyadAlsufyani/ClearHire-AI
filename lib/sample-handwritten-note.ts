export interface SampleHandwrittenNote {
  dataUrl: string;
  mimeType: string;
  fileName: string;
  extractedHint: string;
}

/**
 * Generates a realistic lined-notebook image with handwritten interview notes
 * so users/judges can test Multimodal Handwritten Note extraction in 1 click
 * or upload their own photo.
 */
export function generateSampleHandwrittenNoteImage(
  variant: "compliant" | "violation" = "compliant"
): SampleHandwrittenNote {
  const canvas = document.createElement("canvas");
  canvas.width = 760;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return {
      dataUrl: "",
      mimeType: "image/png",
      fileName: "handwritten_notes.png",
      extractedHint: "",
    };
  }

  // Warm notebook paper background
  ctx.fillStyle = "#fdfaf1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Horizontal blue ruled lines
  ctx.strokeStyle = "rgba(147, 197, 253, 0.45)";
  ctx.lineWidth = 1;
  for (let y = 70; y < canvas.height; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Left vertical red margin line
  ctx.strokeStyle = "rgba(248, 113, 113, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(78, 0);
  ctx.lineTo(78, canvas.height);
  ctx.stroke();

  // Subtle coffee cup ring in top right corner
  ctx.strokeStyle = "rgba(180, 130, 80, 0.14)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(665, 82, 46, 0, Math.PI * 2);
  ctx.stroke();

  // Handwritten ink style
  ctx.fillStyle = "#1e293b";
  ctx.font = "italic bold 22px 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
  ctx.fillText("Panel Interview Notes — Riyadh KAFD HQ", 96, 54);

  ctx.font = "italic 19px 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive";
  ctx.fillStyle = "#1d4ed8"; // Blue ballpoint pen ink

  const lines =
    variant === "compliant"
      ? [
          "Candidate: Tariq Al-Dosari",
          "Target Role: Senior Software Engineer (Core Platform)",
          "Final Offer Comp: 23,500 SAR / month (approved by hiring mgr)",
          "Start Date: November 15, 2026",
          "Leave / Perks: Standard 21 days PTO, Hybrid in Riyadh",
          "IT Gear: Wants 16-inch MacBook Pro M3 Max + 4K Monitor",
          "Verdict: Strong Hire!! Send offer letter & IT ticket ASAP.",
        ]
      : [
          "Candidate: Yasser Al-Ghamdi",
          "Target Role: Senior Dev (Cloud Infra)",
          "Final Offer Comp: 32,000 SAR / month (above normal band!)",
          "Start Date: December 1, 2026",
          "Special Ask: Wants 30 days PTO + 100% Fully Remote",
          "IT Gear: MacBook Pro 16 M3 Max + Dual 4K Displays",
          "Verdict: Check HR policy & trigger override if needed.",
        ];

  lines.forEach((line, index) => {
    const yPos = 100 + index * 51;
    // Slight natural handwriting tilt
    ctx.save();
    ctx.translate(96, yPos);
    ctx.rotate((index % 2 === 0 ? -0.006 : 0.005));
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });

  // Underline "Strong Hire!!"
  ctx.strokeStyle = "#1d4ed8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(96, 415);
  ctx.lineTo(440, 412);
  ctx.stroke();

  const dataUrl = canvas.toDataURL("image/png");
  const extractedHint =
    variant === "compliant"
      ? "Hire Tariq Al-Dosari for Senior Software Engineer, 23,500 SAR/month, starts November 15, 2026. Standard 21 days PTO, hybrid in Riyadh. Wants 16-inch MacBook Pro M3 Max and 4K Monitor."
      : "Hire Yasser Al-Ghamdi for Senior Dev, 32,000 SAR/month, starts December 1, 2026. Requested 30 days PTO and 100% fully remote work. Wants MacBook Pro 16 M3 Max and Dual 4K Displays.";

  return {
    dataUrl,
    mimeType: "image/png",
    fileName:
      variant === "compliant"
        ? "interview_notes_tariq_23.5k.png"
        : "interview_notes_yasser_32k_violation.png",
    extractedHint,
  };
}

