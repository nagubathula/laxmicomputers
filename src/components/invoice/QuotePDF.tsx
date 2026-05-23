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
  invMetaBlock: { width: 200, textAlign: 'right' },
  invTitle: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  partyBox: { flex: 1, padding: 8, border: '1pt solid #cbd5e1', borderRadius: 2 },
  partyLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
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
  banner: { marginTop: 12, padding: 6, backgroundColor: '#fef3c7', borderRadius: 2, fontSize: 9, color: '#78350f' },
});

export type QuoteDoc = {
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  currency: string;
  is_inter_state: boolean;
  subtotal: number; cgst_total: number; sgst_total: number; igst_total: number;
  discount_total: number; grand_total: number;
  notes: string | null;
  business_snapshot: any;
  customer_snapshot: any;
  lines: {
    product_name: string; hsn_code: string | null; qty: number;
    unit_price: number; discount_amount: number; taxable_amount: number;
    gst_rate: number; cgst_amount: number; sgst_amount: number; igst_amount: number; line_total: number;
  }[];
};

function addr(s: any) {
  if (!s) return '';
  return [s.address_line1, s.address_line2, [s.city, s.pincode].filter(Boolean).join(' '), [s.state, s.state_code && `(${s.state_code})`].filter(Boolean).join(' ')]
    .filter(Boolean).join('\n');
}

export function QuotePDF({ quote }: { quote: QuoteDoc }) {
  const c = (quote.currency || 'INR') as Currency;
  const biz = quote.business_snapshot ?? {};
  const cust = quote.customer_snapshot ?? { name: 'Prospective customer' };

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
          <View style={styles.invMetaBlock}>
            <Text style={styles.invTitle}>QUOTATION</Text>
            <Text style={styles.meta}>No: {quote.quote_number}</Text>
            <Text style={styles.meta}>Date: {quote.quote_date}</Text>
            {quote.valid_until && <Text style={styles.meta}>Valid until: {quote.valid_until}</Text>}
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>To</Text>
            <Text style={styles.partyName}>{cust.name ?? 'Prospective customer'}</Text>
            <Text style={styles.meta}>{addr(cust)}</Text>
            {cust.gstin && <Text style={styles.meta}>GSTIN: {cust.gstin}</Text>}
            {cust.phone && <Text style={styles.meta}>Phone: {cust.phone}</Text>}
          </View>
        </View>

        <View>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDesc]}>Description</Text>
            <Text style={[styles.th, styles.colHsn]}>HSN</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate</Text>
            <Text style={[styles.th, styles.colGst]}>GST%</Text>
            <Text style={[styles.th, styles.colAmt]}>Amount</Text>
          </View>
          {quote.lines.map((l, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.colDesc]}>{l.product_name}</Text>
              <Text style={[styles.td, styles.colHsn]}>{l.hsn_code ?? '-'}</Text>
              <Text style={[styles.td, styles.colQty]}>{l.qty}</Text>
              <Text style={[styles.td, styles.colRate]}>{pdfMoney(l.unit_price, c, false)}</Text>
              <Text style={[styles.td, styles.colGst]}>{l.gst_rate}%</Text>
              <Text style={[styles.td, styles.colAmt]}>{pdfMoney(l.line_total, c, false)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalRow}><Text>Subtotal</Text><Text>{pdfMoney(quote.subtotal, c)}</Text></View>
            {quote.discount_total > 0 && <View style={styles.totalRow}><Text>Discount</Text><Text>− {pdfMoney(quote.discount_total, c)}</Text></View>}
            {quote.is_inter_state ? (
              <View style={styles.totalRow}><Text>IGST</Text><Text>{pdfMoney(quote.igst_total, c)}</Text></View>
            ) : (
              <>
                <View style={styles.totalRow}><Text>CGST</Text><Text>{pdfMoney(quote.cgst_total, c)}</Text></View>
                <View style={styles.totalRow}><Text>SGST</Text><Text>{pdfMoney(quote.sgst_total, c)}</Text></View>
              </>
            )}
            <View style={styles.totalRowBold}><Text>Total</Text><Text>{pdfMoney(quote.grand_total, c)}</Text></View>
          </View>
        </View>

        <View style={styles.banner}>
          <Text>
            This is a quotation, not an invoice. Prices and availability are subject to change.
            {quote.valid_until ? ` Valid until ${quote.valid_until}.` : ''}
          </Text>
        </View>

        {quote.notes && (
          <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f8fafc' }}>
            <Text style={{ fontSize: 8, color: '#64748b', marginBottom: 2 }}>NOTES</Text>
            <Text style={{ fontSize: 9 }}>{quote.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Computer-generated quotation.</Text>
          <Text>{biz.legal_name}</Text>
        </View>
      </Page>
    </Document>
  );
}
