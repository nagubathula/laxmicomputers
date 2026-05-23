/* eslint-disable react/no-unknown-property */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { type Currency } from '@/lib/money';
import { pdfMoney } from '@/lib/pdfMoney';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1pt solid #0f172a', paddingBottom: 12 },
  brandBlock: { flex: 1 },
  brandName: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: '#475569' },
  rightBlock: { width: 200, textAlign: 'right' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  partyBox: { flex: 1, padding: 8, border: '1pt solid #cbd5e1', borderRadius: 2 },
  partyLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  thead: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 4, borderTop: '1pt solid #0f172a', borderBottom: '1pt solid #0f172a' },
  th: { fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottom: '0.5pt solid #cbd5e1' },
  td: { fontSize: 9 },
  colNo: { width: 30 },
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
  banner: { marginTop: 12, padding: 8, backgroundColor: '#dbeafe', borderRadius: 2, fontSize: 9, color: '#1e3a8a' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, borderTop: '0.5pt solid #cbd5e1', paddingTop: 8, fontSize: 8, color: '#64748b', flexDirection: 'row', justifyContent: 'space-between' },
});

export type PODoc = {
  po_number: string;
  order_date: string;
  expected_date: string | null;
  status: string;
  currency: string;
  is_inter_state: boolean;
  subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  grand_total: number;
  notes: string | null;
  supplier_snapshot: any;
  business_snapshot: any;
  lines: {
    product_name: string; hsn_code: string | null;
    qty_ordered: number; unit_cost: number; gst_rate: number;
    taxable_amount: number; cgst_amount: number; sgst_amount: number; igst_amount: number; line_total: number;
  }[];
};

function addr(s: any) {
  if (!s) return '';
  return [s.address_line1, s.address_line2, [s.city, s.pincode].filter(Boolean).join(' '), [s.state, s.state_code && `(${s.state_code})`].filter(Boolean).join(' ')]
    .filter(Boolean).join('\n');
}

export function POPDF({ po }: { po: PODoc }) {
  const c = (po.currency || 'INR') as Currency;
  const biz = po.business_snapshot ?? {};
  const sup = po.supplier_snapshot ?? {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{biz.legal_name ?? 'Laxmi Computers'}</Text>
            <Text style={styles.meta}>{addr(biz)}</Text>
            {biz.phone && <Text style={styles.meta}>Phone: {biz.phone}</Text>}
            {biz.email && <Text style={styles.meta}>Email: {biz.email}</Text>}
            {biz.gstin && <Text style={styles.meta}>GSTIN: {biz.gstin}</Text>}
          </View>
          <View style={styles.rightBlock}>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <Text style={styles.meta}>No: {po.po_number}</Text>
            <Text style={styles.meta}>Order date: {po.order_date}</Text>
            {po.expected_date && <Text style={styles.meta}>Expected: {po.expected_date}</Text>}
            <Text style={styles.meta}>Status: {po.status}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>To (Supplier)</Text>
            <Text style={styles.partyName}>{sup.name ?? '—'}</Text>
            <Text style={styles.meta}>{addr(sup)}</Text>
            {sup.gstin && <Text style={styles.meta}>GSTIN: {sup.gstin}</Text>}
            {sup.phone && <Text style={styles.meta}>Phone: {sup.phone}</Text>}
          </View>
        </View>

        <View>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colNo]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Unit cost</Text>
            <Text style={[styles.th, styles.colGst]}>GST%</Text>
            <Text style={[styles.th, styles.colAmt]}>Amount</Text>
          </View>
          {po.lines.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.td, styles.colDesc]}>{l.product_name}</Text>
              <Text style={[styles.td, styles.colHsn]}>{l.hsn_code ?? '-'}</Text>
              <Text style={[styles.td, styles.colQty]}>{l.qty_ordered}</Text>
              <Text style={[styles.td, styles.colRate]}>{pdfMoney(l.unit_cost, c, false)}</Text>
              <Text style={[styles.td, styles.colGst]}>{l.gst_rate}%</Text>
              <Text style={[styles.td, styles.colAmt]}>{pdfMoney(l.line_total, c, false)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}><Text>Subtotal</Text><Text>{pdfMoney(po.subtotal, c)}</Text></View>
            {po.is_inter_state ? (
              <View style={styles.totalRow}><Text>IGST</Text><Text>{pdfMoney(po.igst_total, c)}</Text></View>
            ) : (
              <>
                <View style={styles.totalRow}><Text>CGST</Text><Text>{pdfMoney(po.cgst_total, c)}</Text></View>
                <View style={styles.totalRow}><Text>SGST</Text><Text>{pdfMoney(po.sgst_total, c)}</Text></View>
              </>
            )}
            <View style={styles.totalRowBold}><Text>Total</Text><Text>{pdfMoney(po.grand_total, c)}</Text></View>
          </View>
        </View>

        <View style={styles.banner}>
          <Text>
            Please supply the above goods as per the prices and quantities listed.
            This is a Purchase Order, not a payment authorization. Your tax invoice
            will be processed against this PO number on receipt of goods.
          </Text>
        </View>

        {po.notes && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>NOTES</Text>
            <Text style={{ fontSize: 9 }}>{po.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Computer-generated purchase order.</Text>
          <Text>{biz.legal_name}</Text>
        </View>
      </Page>
    </Document>
  );
}
