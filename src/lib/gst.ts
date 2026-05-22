import { round2 } from './money';

/**
 * GST math.
 *
 *  - Intra-state sale (business state === customer state): tax splits into
 *    CGST (half) + SGST (half).
 *  - Inter-state sale: full amount goes to IGST.
 *  - If the customer has no state (walk-in), default to intra-state.
 */

export type GstBreakdown = {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number; // taxable + taxes
};

export function isInterState(
  businessStateCode: string | null | undefined,
  customerStateCode: string | null | undefined,
): boolean {
  if (!businessStateCode) return false;
  if (!customerStateCode) return false; // walk-in / unknown → treat as intra-state
  return businessStateCode.trim() !== customerStateCode.trim();
}

export function computeLineGst(args: {
  qty: number;
  unitPrice: number;
  discount?: number; // absolute amount, not %
  gstRate: number; // e.g. 18 means 18%
  interState: boolean;
}): GstBreakdown {
  const taxable = round2(args.qty * args.unitPrice - (args.discount ?? 0));
  const taxAmount = round2((taxable * args.gstRate) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (args.interState) {
    igst = taxAmount;
  } else {
    cgst = round2(taxAmount / 2);
    sgst = round2(taxAmount - cgst); // ensures cgst + sgst === taxAmount even with rounding
  }

  return {
    taxable,
    cgst,
    sgst,
    igst,
    total: round2(taxable + cgst + sgst + igst),
  };
}

/**
 * Indian financial year code for a given date.
 *   1 Apr 2025 → '25-26'
 *   31 Mar 2026 → '25-26'
 *   1 Apr 2026 → '26-27'
 */
export function financialYearCode(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed; April = 3
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}
