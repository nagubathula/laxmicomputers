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
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  partyBox: { flex: 1, padding: 8, border: '1pt solid #cbd5e1', borderRadius: 2, marginRight: 8 },
  partyBoxLast: { marginRight: 0 },
  partyLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  transportBox: { marginBottom: 12, padding: 6, backgroundColor: '#f1f5f9', borderRadius: 2, flexDirection: 'row', gap: 16 },
  transportField: { flex: 1 },
  transportLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  transportValue: { fontSize: 10, fontWeight: 700 },
  thead: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 6, paddingHorizontal: 4, borderTop: '1pt solid #0f172a', borderBottom: '1pt solid #0f172a' },
  th: { fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderBottom: '0.5pt solid #cbd5e1' },
  td: { fontSize: 9 },
  colNo: { width: 30 },
  colDesc: { flex: 3 },
  colHsn: { flex: 1 },
  colQty: { width: 50, textAlign: 'right' },
  colRate: { width: 70, textAlign: 'right' },
  colAmt: { width: 80, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 6, borderTop: '1pt solid #0f172a' },
  totalBox: { width: 200, flexDirection: 'row', justifyContent: 'space-between' },
  banner: { marginTop: 16, padding: 8, backgroundColor: '#fef3c7', borderRadius: 2, fontSize: 9, color: '#78350f' },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  sigBox: { width: 200, paddingTop: 6, borderTop: '1pt solid #0f172a', textAlign: 'center', fontSize: 9, color: '#475569' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, borderTop: '0.5pt solid #cbd5e1', paddingTop: 8, fontSize: 8, color: '#64748b', flexDirection: 'row', justifyContent: 'space-between' },
});

const REASON_LABELS: Record<string, string> = {
  sale: 'Sale (invoice follows)',
  sale_on_approval: 'Sale on approval',
  job_work: 'Job work',
  sample: 'Sample',
  replacement: 'Replacement',
  return: 'Return',
  other: 'Other',
};

export type DCDoc = {
  dc_number: string;
  dc_date: string;
  reason: string;
  vehicle_number: string | null;
  transport_mode: string | null;
  lr_number: string | null;
  goods_value: number;
  notes: string | null;
  business_snapshot: any;
  customer_snapshot: any;
  lines: { product_name: string; hsn_code: string | null; qty: number; unit_price: number; line_total: number }[];
};

function addr(s: any) {
  if (!s) return '';
  return [s.address_line1, s.address_line2, [s.city, s.pincode].filter(Boolean).join(' '), [s.state, s.state_code && `(${s.state_code})`].filter(Boolean).join(' ')]
    .filter(Boolean).join('\n');
}

export function DeliveryChallanPDF({ dc, currency = 'INR' }: { dc: DCDoc; currency?: Currency }) {
  const biz = dc.business_snapshot ?? {};
  const cust = dc.customer_snapshot ?? { name: 'Self / not specified' };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{biz.legal_name ?? 'Laxmi Computers'}</Text>
            <Text style={styles.meta}>{addr(biz)}</Text>
            {biz.phone && <Text style={styles.meta}>Phone: {biz.phone}</Text>}
            {biz.gstin && <Text style={styles.meta}>GSTIN: {biz.gstin}</Text>}
          </View>
          <View style={styles.rightBlock}>
            <Text style={styles.title}>DELIVERY CHALLAN</Text>
            <Text style={styles.meta}>No: {dc.dc_number}</Text>
            <Text style={styles.meta}>Date: {dc.dc_date}</Text>
            <Text style={styles.meta}>Reason: {REASON_LABELS[dc.reason] ?? dc.reason}</Text>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Consignee / Bill to</Text>
            <Text style={styles.partyName}>{cust.name ?? 'Self / not specified'}</Text>
            <Text style={styles.meta}>{addr(cust)}</Text>
            {cust.gstin && <Text style={styles.meta}>GSTIN: {cust.gstin}</Text>}
            {cust.phone && <Text style={styles.meta}>Phone: {cust.phone}</Text>}
          </View>
          <View style={[styles.partyBox, styles.partyBoxLast]}>
            <Text style={styles.partyLabel}>Ship to</Text>
            <Text style={styles.partyName}>{cust.name ?? '—'}</Text>
            <Text style={styles.meta}>{addr(cust)}</Text>
          </View>
        </View>

        {(dc.vehicle_number || dc.transport_mode || dc.lr_number) && (
          <View style={styles.transportBox}>
            <View style={styles.transportField}>
              <Text style={styles.transportLabel}>Transport mode</Text>
              <Text style={styles.transportValue}>{dc.transport_mode ?? '—'}</Text>
            </View>
            <View style={styles.transportField}>
              <Text style={styles.transportLabel}>Vehicle no.</Text>
              <Text style={styles.transportValue}>{dc.vehicle_number ?? '—'}</Text>
            </View>
            <View style={styles.transportField}>
              <Text style={styles.transportLabel}>LR / Consignment no.</Text>
              <Text style={styles.transportValue}>{dc.lr_number ?? '—'}</Text>
            </View>
          </View>
        )}

        <View>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colNo]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colAmt]}>Value</Text>
          </View>
          {dc.lines.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.td, styles.colDesc]}>{l.product_name}</Text>
              <Text style={[styles.td, styles.colHsn]}>{l.hsn_code ?? '-'}</Text>
              <Text style={[styles.td, styles.colQty]}>{l.qty}</Text>
              <Text style={[styles.td, styles.colRate]}>{pdfMoney(l.unit_price, currency, false)}</Text>
              <Text style={[styles.td, styles.colAmt]}>{pdfMoney(l.line_total, currency, false)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <View style={styles.totalBox}>
            <Text style={{ fontWeight: 700 }}>Total goods value</Text>
            <Text style={{ fontWeight: 700, fontFamily: 'Helvetica' }}>{pdfMoney(dc.goods_value, currency)}</Text>
          </View>
        </View>

        <View style={styles.banner}>
          <Text>
            This is a Delivery Challan issued under Rule 55 of the CGST Rules, 2017.
            It is NOT a tax invoice. GST (if applicable) will be charged on the
            subsequent tax invoice. Goods are sent for the purpose stated above.
          </Text>
        </View>

        {dc.notes && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>NOTES</Text>
            <Text style={{ fontSize: 9 }}>{dc.notes}</Text>
          </View>
        )}

        <View style={styles.signatures}>
          <View style={styles.sigBox}><Text>Receiver&apos;s signature</Text></View>
          <View style={styles.sigBox}><Text>For {biz.legal_name ?? 'Laxmi Computers'}</Text></View>
        </View>

        <View style={styles.footer}>
          <Text>Computer-generated document. No GST is collected on this challan.</Text>
          <Text>{biz.legal_name}</Text>
        </View>
      </Page>
    </Document>
  );
}
