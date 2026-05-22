'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { financialYearCode } from '@/lib/gst';
import { round2 } from '@/lib/money';

/**
 * Recompute today's (or any day's) totals on the fly so the cashier sees
 * fresh numbers when opening the close-shift screen.
 */
export async function computeDayTotals(date: string) {
  await requireUser();
  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('grand_total, subtotal, cgst_total, sgst_total, igst_total, payment_method, status')
    .eq('invoice_date', date)
    .neq('status', 'cancelled');

  if (error) return { ok: false as const, error: error.message };

  const totals = (invoices ?? []).reduce((acc, inv) => {
    const t = Number(inv.grand_total);
    const gst = Number(inv.cgst_total) + Number(inv.sgst_total) + Number(inv.igst_total);
    acc.count += 1;
    acc.netTaxable += Number(inv.subtotal);
    acc.gst += gst;
    acc.gross += t;
    switch (inv.payment_method) {
      case 'cash':          acc.cash += t; break;
      case 'upi':           acc.upi += t; break;
      case 'card':          acc.card += t; break;
      case 'bank_transfer': acc.bank += t; break;
      case 'credit':        acc.credit += t; break;
      case 'mixed':         acc.cash += t; break;
    }
    return acc;
  }, { count: 0, netTaxable: 0, gst: 0, gross: 0, cash: 0, upi: 0, card: 0, bank: 0, credit: 0 });

  return {
    ok: true as const,
    totals: {
      count: totals.count,
      netTaxable: round2(totals.netTaxable),
      gst: round2(totals.gst),
      gross: round2(totals.gross),
      cash: round2(totals.cash),
      upi: round2(totals.upi),
      card: round2(totals.card),
      bank: round2(totals.bank),
      credit: round2(totals.credit),
    },
  };
}

export async function createZReport(prevState: any, formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const reportDate = (formData.get('report_date') as string) || new Date().toISOString().slice(0, 10);
  const openingFloat = parseFloat(formData.get('opening_float') as string) || 0;
  const countedCash = parseFloat(formData.get('counted_cash') as string) || 0;
  const notes = ((formData.get('notes') as string) || '').trim() || null;

  const totalsResult = await computeDayTotals(reportDate);
  if (!totalsResult.ok) return { error: totalsResult.error };
  const t = totalsResult.totals;

  const expectedCash = round2(openingFloat + t.cash);
  const variance = round2(countedCash - expectedCash);

  const fy = financialYearCode(new Date(reportDate));
  const { data: seq, error: seqErr } = await supabase.rpc('next_z_seq', { p_fy: fy });
  if (seqErr || typeof seq !== 'number') return { error: seqErr?.message ?? 'Z-report numbering failed' };
  const zNumber = `Z/${fy}/${String(seq).padStart(4, '0')}`;

  const { data: z, error } = await supabase.from('z_reports').insert({
    z_number: zNumber,
    report_date: reportDate,
    opening_float: openingFloat,
    invoice_count: t.count,
    cash_sales: t.cash,
    upi_sales: t.upi,
    card_sales: t.card,
    bank_sales: t.bank,
    credit_sales: t.credit,
    net_taxable: t.netTaxable,
    gst_collected: t.gst,
    gross_total: t.gross,
    expected_cash: expectedCash,
    counted_cash: countedCash,
    variance,
    notes,
    closed_by: user.id,
  }).select('id, z_number').single();

  if (error || !z) return { error: error?.message ?? 'Failed to save Z-report' };

  await audit(supabase, 'zreport.close', {
    entityType: 'z_report',
    entityId: z.id,
    details: { z_number: z.z_number, report_date: reportDate, variance },
  });

  revalidatePath('/admin/reports/zreport');
  redirect(`/admin/reports/zreport/${z.id}`);
}
