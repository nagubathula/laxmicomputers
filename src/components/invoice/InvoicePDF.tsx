/* eslint-disable react/no-unknown-property */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatMoney, type Currency } from '@/lib/money';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1pt solid #0f172a', paddingBottom: 12 },
  brandBlock: { flex: 1 },
  brandName: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: '#475569' },
  invMetaBlock: { width: 200, textAlign: 'right' },
  invTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  partyBox: { flex: 1, padding: 8, border: '1pt solid #cbd5e1', borderRadius: 2, marginRight: 8 },
  partyBoxLast: { marginRight: 0 },
  partyLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  table: { marginTop: 4, marginBottom: 8 },
  thead: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 4, borderTop: '1pt solid #0f172a', borderBottom: '1pt solid #0f172a' },
  th: { fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottom: '0.5pt solid #cbd5e1' },
  td: { fontSize: 9 },
  colDesc: { flex: 3 },
  colHsn: { flex: 1 },
  colQty: { width: 40, textAlign: 'right' },
  colRate: { width: 60, textAlign: 'right' },
  colGst: { width: 40, textAlign: 'right' },
  colAmt: { width: 70, textAlign: 'right' },
  totalsBlock: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  totalsTable: { width: 240 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalRowBold: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTop: '1pt solid #0f172a', marginTop: 4, fontWeight: 700, fontSize: 12 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, borderTop: '0.5pt solid #cbd5e1', paddingTop: 8, fontSize: 8, color: '#64748b', flexDirection: 'row', justifyContent: 'space-between' },
});

type Snapshot = {
  legal_name?: string; gstin?: string | null; pan?: string | null;
  address_line1?: string | null; address_line2?: string | null;
  city?: string | null; state?: string | null; state_code?: string | null;
  pincode?: string | null; phone?: string | null; email?: string | null;
  name?: string;
};

type Line = {
  product_name: string;
  hsn_code: string | null;
  qty: number;
  unit_price: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  line_total: number;
};

export type InvoiceDoc = {
  invoice_number: string;
  invoice_date: string;
  currency: string;
  is_inter_state: boolean;
  subtotal: number; cgst_total: number; sgst_total: number; igst_total: number;
  discount_total: number; round_off: number; grand_total: number; amount_paid: number;
  payment_method: string | null;
  notes: string | null;
  business_snapshot: Snapshot;
  customer_snapshot: Snapshot;
  lines: Line[];
};

function partyAddress(s: Snapshot | undefined) {
  if (!s) return '';
  return [s.address_line1, s.address_line2, [s.city, s.pincode].filter(Boolean).join(' '), [s.state, s.state_code && `(${s.state_code})`].filter(Boolean).join(' ')]
    .filter(Boolean).join('\n');
}

export function InvoicePDF({ invoice }: { invoice: InvoiceDoc }) {
  const c = (invoice.currency || 'INR') as Currency;
  const biz = invoice.business_snapshot ?? {};
  const cust = invoice.customer_snapshot ?? { name: 'Walk-in Customer' };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{biz.legal_name ?? 'Laxmi Computers'}</Text>
            <Text style={styles.meta}>{partyAddress(biz)}</Text>
            {biz.phone && <Text style={styles.meta}>Phone: {biz.phone}</Text>}
            {biz.email && <Text style={styles.meta}>Email: {biz.email}</Text>}
            {biz.gstin && <Text style={styles.meta}>GSTIN: {biz.gstin}</Text>}
          </View>
          <View style={styles.invMetaBlock}>
            <Text style={styles.invTitle}>TAX INVOICE</Text>
            <Text style={styles.meta}>No: {invoice.invoice_number}</Text>
            <Text style={styles.meta}>Date: {invoice.invoice_date}</Text>
            {invoice.payment_method && <Text style={styles.meta}>Payment: {invoice.payment_method}</Text>}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To</Text>
            <Text style={styles.partyName}>{cust.name ?? 'Walk-in Customer'}</Text>
            <Text style={styles.meta}>{partyAddress(cust)}</Text>
            {cust.gstin && <Text style={styles.meta}>GSTIN: {cust.gstin}</Text>}
            {cust.phone && <Text style={styles.meta}>Phone: {cust.phone}</Text>}
          </View>
          <View style={[styles.partyBox, styles.partyBoxLast]}>
            <Text style={styles.partyLabel}>Place of Supply</Text>
            <Text style={styles.partyName}>{cust.state ?? biz.state ?? '—'}{cust.state_code ? ` (${cust.state_code})` : ''}</Text>
            <Text style={styles.meta}>{invoice.is_inter_state ? 'Inter-state — IGST applicable' : 'Intra-state — CGST + SGST applicable'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colGst]}>GST%</Text>
            <Text style={[styles.th, styles.colAmt]}>Amount</Text>
          </View>
          {invoice.lines.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colDesc]}>{l.product_name}</Text>
              <Text style={[styles.td, styles.colHsn]}>{l.hsn_code ?? '-'}</Text>
              <Text style={[styles.td, styles.colQty]}>{l.qty}</Text>
              <Text style={[styles.td, styles.colRate]}>{formatMoney(l.unit_price, c, { withSymbol: false })}</Text>
              <Text style={[styles.td, styles.colGst]}>{l.gst_rate}%</Text>
              <Text style={[styles.td, styles.colAmt]}>{formatMoney(l.line_total, c, { withSymbol: false })}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}><Text>Subtotal (taxable)</Text><Text>{formatMoney(invoice.subtotal, c)}</Text></View>
            {invoice.discount_total > 0 && (
              <View style={styles.totalRow}><Text>Discount</Text><Text>− {formatMoney(invoice.discount_total, c)}</Text></View>
            )}
            {invoice.is_inter_state ? (
              <View style={styles.totalRow}><Text>IGST</Text><Text>{formatMoney(invoice.igst_total, c)}</Text></View>
            ) : (
              <>
                <View style={styles.totalRow}><Text>CGST</Text><Text>{formatMoney(invoice.cgst_total, c)}</Text></View>
                <View style={styles.totalRow}><Text>SGST</Text><Text>{formatMoney(invoice.sgst_total, c)}</Text></View>
              </>
            )}
            {invoice.round_off !== 0 && (
              <View style={styles.totalRow}><Text>Round off</Text><Text>{formatMoney(invoice.round_off, c)}</Text></View>
            )}
            <View style={styles.totalRowBold}><Text>Grand Total</Text><Text>{formatMoney(invoice.grand_total, c)}</Text></View>
            {invoice.amount_paid !== invoice.grand_total && (
              <View style={styles.totalRow}><Text>Amount paid</Text><Text>{formatMoney(invoice.amount_paid, c)}</Text></View>
            )}
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginTop: 16, padding: 8, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>NOTES</Text>
            <Text style={{ fontSize: 9 }}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Computer-generated invoice. Subject to {biz.city ?? biz.state ?? 'local'} jurisdiction.</Text>
          <Text>{biz.legal_name}</Text>
        </View>
      </Page>
    </Document>
  );
}
