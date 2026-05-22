import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatMoney, type Currency } from '@/lib/money';
import PrintButton from './PrintButton';

export default async function ZReportDetail(props: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await props.params;
  const supabase = await createClient();

  const [{ data: z }, { data: settings }] = await Promise.all([
    supabase.from('z_reports').select('*').eq('id', id).single(),
    supabase.from('business_settings').select('*').eq('id', 1).single(),
  ]);
  if (!z) notFound();
  const currency = (settings?.default_currency ?? 'INR') as Currency;

  return (
    <div className="container mx-auto p-6 lg:p-10 max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/admin/reports/zreport" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Z-report
        </Link>
        <PrintButton />
      </div>

      <div id="zreport-print" className="rounded-md border bg-white p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
        <div className="text-center mb-6 pb-4 border-b">
          <h1 className="text-2xl font-bold">{settings?.legal_name ?? 'Laxmi Computers'}</h1>
          <p className="text-sm text-slate-500">Day-end Z-report</p>
        </div>

        <div className="flex justify-between mb-6 text-sm">
          <div>
            <div className="text-xs uppercase text-slate-500">Z-report #</div>
            <div className="font-mono font-bold">{z.z_number}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">For date</div>
            <div className="font-mono font-bold">{z.report_date}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-500">Closed at</div>
            <div className="font-mono">{new Date(z.closed_at).toLocaleString()}</div>
          </div>
        </div>

        <Section title="Sales summary">
          <Row label="Invoice count" value={String(z.invoice_count)} />
          <Row label="Net taxable" value={formatMoney(Number(z.net_taxable), currency)} />
          <Row label="GST collected" value={formatMoney(Number(z.gst_collected), currency)} />
          <Row label="Gross total" value={formatMoney(Number(z.gross_total), currency)} bold />
        </Section>

        <Section title="Payment breakdown">
          <Row label="Cash" value={formatMoney(Number(z.cash_sales), currency)} />
          <Row label="UPI" value={formatMoney(Number(z.upi_sales), currency)} />
          <Row label="Card" value={formatMoney(Number(z.card_sales), currency)} />
          <Row label="Bank transfer" value={formatMoney(Number(z.bank_sales), currency)} />
          <Row label="On credit" value={formatMoney(Number(z.credit_sales), currency)} muted />
        </Section>

        <Section title="Cash drawer reconciliation">
          <Row label="Opening float" value={formatMoney(Number(z.opening_float), currency)} />
          <Row label="+ Cash sales" value={formatMoney(Number(z.cash_sales), currency)} />
          <Row label="= Expected cash" value={formatMoney(Number(z.expected_cash), currency)} bold />
          <Row label="Counted cash" value={formatMoney(Number(z.counted_cash), currency)} />
          <Row
            label="Variance"
            value={`${Number(z.variance) > 0 ? '+' : ''}${formatMoney(Number(z.variance), currency)}`}
            bold
            valueClassName={
              Number(z.variance) === 0 ? 'text-emerald-700' :
              Number(z.variance) > 0 ? 'text-blue-700' : 'text-red-700'
            }
          />
        </Section>

        {z.notes && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-xs uppercase text-slate-500 mb-1">Notes</div>
            <div className="text-sm whitespace-pre-wrap">{z.notes}</div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t text-center text-xs text-slate-400">
          Closed by user {z.closed_by ? z.closed_by.slice(0, 8) + '…' : 'unknown'} · This is a final record. Variances require investigation.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-xs uppercase font-semibold text-slate-500 mb-2 border-b pb-1">{title}</div>
      <table className="w-full text-sm">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Row({ label, value, bold, muted, valueClassName }: { label: string; value: string; bold?: boolean; muted?: boolean; valueClassName?: string }) {
  return (
    <tr>
      <td className={`py-1 ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-400' : ''}`}>{label}</td>
      <td className={`py-1 text-right font-mono ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-400' : ''} ${valueClassName ?? ''}`}>{value}</td>
    </tr>
  );
}

