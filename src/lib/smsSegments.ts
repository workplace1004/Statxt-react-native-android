/**
 * SMS segment estimation (matches web lib/sms/segments).
 * Used for "Sent seg. / Failed" and cost calculation.
 */

const GSM7_BASIC_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ`¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED_CHARS = "^{}\\[~]|€";

const GSM7_BASIC_SET = new Set(Array.from(GSM7_BASIC_CHARS));
const GSM7_EXTENDED_SET = new Set(Array.from(GSM7_EXTENDED_CHARS));

function countGsm7Septets(text: string): number | null {
  let septets = 0;
  for (const ch of text) {
    if (GSM7_BASIC_SET.has(ch)) {
      septets += 1;
      continue;
    }
    if (GSM7_EXTENDED_SET.has(ch)) {
      septets += 2;
      continue;
    }
    return null;
  }
  return septets;
}

export type SmsSegmentEstimate = {
  segments: number;
  units: number;
};

export function estimateSmsSegments(text: string): SmsSegmentEstimate {
  const normalized = typeof text === "string" ? text.normalize("NFC") : "";
  const gsm7Septets = countGsm7Septets(normalized);
  if (gsm7Septets !== null) {
    const perSegment = 160;
    const perSegmentConcatenated = 153;
    const segments = gsm7Septets <= perSegment ? 1 : Math.ceil(gsm7Septets / perSegmentConcatenated);
    return {
      segments: Math.max(1, segments),
      units: gsm7Septets,
    };
  }
  const ucs2Units = normalized.length;
  const perSegment = 70;
  const perSegmentConcatenated = 67;
  const segments = ucs2Units <= perSegment ? 1 : Math.ceil(ucs2Units / perSegmentConcatenated);
  return {
    segments: Math.max(1, segments),
    units: ucs2Units,
  };
}
