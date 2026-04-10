import { formatDateRange, formatPersonName } from "./formatters";

const CERTIFICATE_SITE_NAME = "Помогаем вместе";
const CERTIFICATE_WIDTH = 1600;
const CERTIFICATE_HEIGHT = 1131;

const PALETTE = {
  ink: "#142132",
  muted: "#4d5d71",
  mutedSoft: "#768396",
  primary: "#466d9d",
  primaryStrong: "#274a73",
  primaryTint: "#dce7f5",
  line: "#d8e1ec",
  lineStrong: "#b9c8db",
  paper: "#fffdf9",
  paperWarm: "#f5efe6",
  paperCool: "#eef4fb",
  accentWarm: "#ddc7a4",
};

function sanitizeFileName(value) {
  const cleaned = String(value || "certificate")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, "_");

  return cleaned || "certificate";
}

function waitForCertificateFonts() {
  if (typeof document === "undefined" || !document.fonts?.ready) {
    return Promise.resolve();
  }

  return Promise.allSettled([
    document.fonts.ready,
    document.fonts.load('600 64px "Newsreader"'),
    document.fonts.load('700 72px "Newsreader"'),
    document.fonts.load('500 28px "Manrope"'),
    document.fonts.load('700 42px "Manrope"'),
  ]).then(() => undefined);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function getWrappedLines(ctx, text, maxWidth, maxLines = Number.POSITIVE_INFINITY) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return [""];

  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    lines.push(current);
    current = words[index];

    if (lines.length === maxLines - 1) {
      const remaining = [current, ...words.slice(index + 1)].join(" ");
      let truncated = remaining;
      while (truncated && ctx.measureText(`${truncated}...`).width > maxWidth) {
        truncated = truncated.slice(0, -1).trimEnd();
      }
      lines.push(truncated ? `${truncated}...` : "...");
      return lines;
    }
  }

  lines.push(current);
  return lines.slice(0, maxLines);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  const { align = "left", color = PALETTE.ink, maxLines = Number.POSITIVE_INFINITY } = options;
  const lines = getWrappedLines(ctx, text, maxWidth, maxLines);

  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  ctx.restore();
  return lines.length;
}

function fitFontSize(ctx, text, maxWidth, preferredSize, minSize, fontFamily, fontWeight = 700) {
  let fontSize = preferredSize;

  while (fontSize > minSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return fontSize;
    }
    fontSize -= 2;
  }

  return minSize;
}

function fitWrappedFontSize(ctx, text, maxWidth, maxHeight, preferredSize, minSize, fontFamily, options = {}) {
  const {
    fontWeight = 700,
    maxLines = Number.POSITIVE_INFINITY,
    lineHeightMultiplier = 1.2,
  } = options;
  let fontSize = preferredSize;

  while (fontSize > minSize) {
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const lines = getWrappedLines(ctx, text, maxWidth, maxLines);
    const lineHeight = Math.round(fontSize * lineHeightMultiplier);
    const textBlockHeight = lines.length * lineHeight;
    const widestLine = Math.max(...lines.map((line) => ctx.measureText(line).width));

    if (widestLine <= maxWidth && textBlockHeight <= maxHeight) {
      return { fontSize, lineHeight, lines };
    }

    fontSize -= 1;
  }

  ctx.font = `${fontWeight} ${minSize}px ${fontFamily}`;

  return {
    fontSize: minSize,
    lineHeight: Math.round(minSize * lineHeightMultiplier),
    lines: getWrappedLines(ctx, text, maxWidth, maxLines),
  };
}

function drawBackground(ctx, width, height) {
  const baseGradient = ctx.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, PALETTE.paperWarm);
  baseGradient.addColorStop(0.55, PALETTE.paper);
  baseGradient.addColorStop(1, PALETTE.paperCool);
  ctx.fillStyle = baseGradient;
  ctx.fillRect(0, 0, width, height);

  const warmGlow = ctx.createRadialGradient(210, 150, 40, 210, 150, 330);
  warmGlow.addColorStop(0, "rgba(221, 199, 164, 0.42)");
  warmGlow.addColorStop(1, "rgba(221, 199, 164, 0)");
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, 0, width, height);

  const coolGlow = ctx.createRadialGradient(width - 220, height - 170, 50, width - 220, height - 170, 360);
  coolGlow.addColorStop(0, "rgba(70, 109, 157, 0.20)");
  coolGlow.addColorStop(1, "rgba(70, 109, 157, 0)");
  ctx.fillStyle = coolGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = "rgba(39, 74, 115, 0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 120);
  ctx.bezierCurveTo(420, 20, 920, 20, 1280, 180);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width - 120, height - 120);
  ctx.bezierCurveTo(width - 420, height + 10, width - 940, height - 10, 300, height - 220);
  ctx.stroke();
  ctx.restore();
}

function drawFrame(ctx, width, height) {
  strokeRoundedRect(ctx, 34, 34, width - 68, height - 68, 30, PALETTE.lineStrong, 4);
  strokeRoundedRect(ctx, 58, 58, width - 116, height - 116, 24, "rgba(70, 109, 157, 0.16)", 2);

  const badgeX = 96;
  const badgeY = 88;
  const badgeWidth = 356;
  const badgeHeight = 78;
  const badgePaddingX = 28;
  const badgePaddingY = 14;
  const badgeTextLayout = fitWrappedFontSize(
    ctx,
    "Волонтерская платформа",
    badgeWidth - badgePaddingX * 2,
    badgeHeight - badgePaddingY * 2,
    24,
    17,
    '"Manrope", "Segoe UI", sans-serif',
    {
      fontWeight: 800,
      maxLines: 2,
      lineHeightMultiplier: 1.12,
    }
  );

  fillRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, "rgba(70, 109, 157, 0.12)");
  strokeRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, "rgba(39, 74, 115, 0.08)", 1.5);
  ctx.save();
  ctx.fillStyle = PALETTE.primaryStrong;
  ctx.font = `800 ${badgeTextLayout.fontSize}px "Manrope", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const badgeTextHeight = badgeTextLayout.lines.length * badgeTextLayout.lineHeight;
  const badgeTextY = badgeY + (badgeHeight - badgeTextHeight) / 2;
  badgeTextLayout.lines.forEach((line, index) => {
    ctx.fillText(line, badgeX + badgeWidth / 2, badgeTextY + index * badgeTextLayout.lineHeight);
  });
  ctx.restore();
}

function drawInfoCard(ctx, x, y, width, height, label, value) {
  fillRoundedRect(ctx, x, y, width, height, 28, "rgba(255, 255, 255, 0.72)");
  strokeRoundedRect(ctx, x, y, width, height, 28, "rgba(39, 74, 115, 0.12)", 2);

  ctx.save();
  ctx.fillStyle = PALETTE.mutedSoft;
  ctx.font = '800 20px "Manrope", "Segoe UI", sans-serif';
  ctx.textBaseline = "top";
  ctx.fillText(label.toUpperCase(), x + 28, y + 24);

  ctx.fillStyle = PALETTE.ink;
  ctx.font = '700 29px "Manrope", "Segoe UI", sans-serif';
  drawWrappedText(ctx, value, x + 28, y + 60, width - 56, 36, {
    color: PALETTE.ink,
    maxLines: 2,
  });
  ctx.restore();
}

function drawCertificateCanvas({ participantName, projectTitle, dateLabel, locationLabel, siteName, siteUrl }) {
  const canvas = document.createElement("canvas");
  canvas.width = CERTIFICATE_WIDTH;
  canvas.height = CERTIFICATE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas API недоступен в этом браузере.");
  }

  drawBackground(ctx, canvas.width, canvas.height);
  drawFrame(ctx, canvas.width, canvas.height);

  ctx.save();
  ctx.fillStyle = PALETTE.primaryStrong;
  ctx.font = '700 78px "Newsreader", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Сертификат", canvas.width / 2, 182);

  ctx.fillStyle = PALETTE.muted;
  ctx.font = '500 28px "Manrope", "Segoe UI", sans-serif';
  ctx.fillText("об участии в волонтерском проекте", canvas.width / 2, 270);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(70, 109, 157, 0.28)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(470, 332);
  ctx.lineTo(1130, 332);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '500 26px "Manrope", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Настоящим подтверждается, что", canvas.width / 2, 382);
  ctx.restore();

  const maxNameWidth = canvas.width - 280;
  const nameFontSize = fitFontSize(
    ctx,
    participantName,
    maxNameWidth,
    72,
    48,
    '"Newsreader", Georgia, serif'
  );

  ctx.save();
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `700 ${nameFontSize}px "Newsreader", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(participantName, canvas.width / 2, 438);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '500 25px "Manrope", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("принял(а) участие в проекте", canvas.width / 2, 546);
  ctx.restore();

  const projectPanelX = 220;
  const projectPanelY = 610;
  const projectPanelWidth = canvas.width - projectPanelX * 2;
  const projectPanelHeight = 162;
  fillRoundedRect(ctx, projectPanelX, projectPanelY, projectPanelWidth, projectPanelHeight, 34, "rgba(255, 255, 255, 0.72)");
  strokeRoundedRect(ctx, projectPanelX, projectPanelY, projectPanelWidth, projectPanelHeight, 34, "rgba(39, 74, 115, 0.14)", 2);

  ctx.save();
  ctx.fillStyle = PALETTE.primaryStrong;
  ctx.font = '700 20px "Manrope", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Название проекта", canvas.width / 2, projectPanelY + 22);

  ctx.fillStyle = PALETTE.ink;
  const projectTitleLayout = fitWrappedFontSize(
    ctx,
    projectTitle,
    projectPanelWidth - 110,
    86,
    38,
    24,
    '"Manrope", "Segoe UI", sans-serif',
    {
      fontWeight: 700,
      maxLines: 3,
      lineHeightMultiplier: 1.14,
    }
  );
  ctx.font = `700 ${projectTitleLayout.fontSize}px "Manrope", "Segoe UI", sans-serif`;
  const projectTextBlockHeight = projectTitleLayout.lines.length * projectTitleLayout.lineHeight;
  const projectTextAreaY = projectPanelY + 56;
  const projectTextY = projectTextAreaY + Math.max(0, (86 - projectTextBlockHeight) / 2);
  projectTitleLayout.lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, projectTextY + index * projectTitleLayout.lineHeight);
  });
  ctx.restore();

  const cardsY = 828;
  const cardWidth = 370;
  const cardGap = 36;
  const firstCardX = (canvas.width - cardWidth * 3 - cardGap * 2) / 2;
  drawInfoCard(ctx, firstCardX, cardsY, cardWidth, 150, "Участник", participantName);
  drawInfoCard(ctx, firstCardX + cardWidth + cardGap, cardsY, cardWidth, 150, "Дата проведения", dateLabel);
  drawInfoCard(ctx, firstCardX + (cardWidth + cardGap) * 2, cardsY, cardWidth, 150, "Место проведения", locationLabel);

  ctx.save();
  ctx.fillStyle = PALETTE.mutedSoft;
  ctx.font = '500 18px "Manrope", "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`Сформировано на платформе «${siteName}»`, canvas.width / 2, 1036);
  ctx.fillStyle = PALETTE.primaryStrong;
  ctx.font = '700 18px "Manrope", "Segoe UI", sans-serif';
  ctx.fillText(siteUrl, canvas.width / 2, 1064);
  ctx.restore();

  return canvas;
}

export async function generateCertificatePdf(participant, participation, options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Сертификат можно сформировать только в браузере.");
  }

  await waitForCertificateFonts();

  const siteName = options.siteName || CERTIFICATE_SITE_NAME;
  const siteUrl = options.siteUrl || window.location.origin || "http://localhost";
  const project = participation?.project || {};

  const participantName =
    formatPersonName(participant, participant?.email || "Участник платформы") || "Участник платформы";
  const projectTitle = project.title || "Волонтерский проект";
  const dateLabel =
    formatDateRange(project.startDate || participation?.createdAt, project.endDate || project.startDate || participation?.createdAt) ||
    "Не указано";
  const locationLabel = project.location || "Место не указано";

  const canvas = drawCertificateCanvas({
    participantName,
    projectTitle,
    dateLabel,
    locationLabel,
    siteName,
    siteUrl,
  });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageData = canvas.toDataURL("image/png", 1);

  pdf.addImage(imageData, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

  const scaleX = pageWidth / CERTIFICATE_WIDTH;
  const scaleY = pageHeight / CERTIFICATE_HEIGHT;
  pdf.link((CERTIFICATE_WIDTH / 2 - 240) * scaleX, 1056 * scaleY, 480 * scaleX, 34 * scaleY, {
    url: siteUrl,
  });

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFileName(`certificate_${projectTitle}`)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
