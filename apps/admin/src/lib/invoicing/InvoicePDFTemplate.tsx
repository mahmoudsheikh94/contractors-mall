/**
 * Jordan E-Invoice PDF Template
 * ==============================
 *
 * Generates Jordan-compliant invoice PDFs with Arabic/RTL support
 * Uses @react-pdf/renderer for server-side PDF generation
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font
} from '@react-pdf/renderer'

// Register Arabic font (using Noto Sans Arabic from Google Fonts CDN)
// Note: In production, host fonts locally for better reliability
Font.register({
  family: 'NotoSansArabic',
  src: 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyG2vu3CBFQLaig.ttf'
})

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansArabic',
    fontSize: 11,
    direction: 'rtl',
    lineHeight: 1.5
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: '2 solid #2563EB'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
    textAlign: 'right'
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'right'
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 10,
    textAlign: 'right'
  },
  statusBadge: {
    backgroundColor: '#10B981',
    color: 'white',
    padding: '4 12',
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 'bold',
    alignSelf: 'flex-end',
    marginTop: 10
  },
  row: {
    flexDirection: 'row-reverse',
    marginBottom: 20
  },
  column: {
    flex: 1,
    paddingRight: 10
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1 solid #E2E8F0',
    textAlign: 'right'
  },
  infoRow: {
    flexDirection: 'row-reverse',
    marginBottom: 8,
    fontSize: 10,
    lineHeight: 1.6
  },
  label: {
    color: '#475569',
    marginLeft: 8,
    width: '45%'
  },
  value: {
    color: '#0F172A',
    fontWeight: 'bold',
    flex: 1
  },
  table: {
    marginTop: 20,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#E2E8F0',
    padding: '10 8',
    borderRadius: 4,
    marginBottom: 4
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'right'
  },
  tableRow: {
    flexDirection: 'row-reverse',
    padding: '8 6',
    borderBottom: '0.5 solid #E2E8F0',
    minHeight: 32
  },
  tableCell: {
    fontSize: 10,
    color: '#0F172A',
    textAlign: 'right',
    paddingVertical: 4
  },
  totalsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 8
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 10,
    paddingLeft: 10
  },
  totalLabel: {
    fontSize: 11,
    color: '#475569'
  },
  totalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A'
  },
  grandTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    paddingRight: 10,
    paddingLeft: 10,
    borderTop: '2 solid #2563EB'
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E40AF'
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB'
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1 solid #E2E8F0',
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 1.6
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 6
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 6,
    textAlign: 'right'
  },
  notesText: {
    fontSize: 10,
    color: '#78350F',
    textAlign: 'right',
    lineHeight: 1.6
  }
})

interface InvoicePDFData {
  invoice: {
    invoice_number: string
    invoice_type: string
    invoice_category: string
    issue_date: string
    status: string
    seller_name: string
    seller_name_en?: string
    seller_tax_number: string
    seller_phone?: string
    seller_address?: string
    seller_city?: string
    buyer_name: string
    buyer_id_type?: string
    buyer_id_number?: string
    buyer_phone?: string
    buyer_city?: string
    buyer_postal_code?: string
    subtotal_jod: number
    discount_total_jod: number
    general_tax_total_jod: number
    special_tax_total_jod: number
    grand_total_jod: number
    currency: string
    notes?: string
  }
  lineItems: Array<{
    description: string
    quantity: number
    unit_price_jod: number
    discount_jod: number
    general_tax_rate: number
    general_tax_amount_jod: number
    line_total_jod: number
  }>
  orderNumber?: string
}

const invoiceTypeLabels: Record<string, string> = {
  income: 'فاتورة ضريبة دخل',
  sales_tax: 'فاتورة ضريبة مبيعات',
  special_tax: 'فاتورة ضريبة خاصة'
}

const invoiceCategoryLabels: Record<string, string> = {
  local: 'فاتورة محلية',
  export: 'فاتورة تصدير',
  development_zone: 'فاتورة مناطق تنموية'
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  issued: 'صادرة',
  submitted_to_portal: 'مرسلة للبوابة',
  cancelled: 'ملغاة'
}

export function InvoicePDF({ invoice, lineItems, orderNumber }: InvoicePDFData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {invoiceTypeLabels[invoice.invoice_type]}
          </Text>
          <Text style={styles.subtitle}>
            {invoiceCategoryLabels[invoice.invoice_category]}
          </Text>
          <Text style={styles.invoiceNumber}>
            رقم الفاتورة: {invoice.invoice_number}
          </Text>
          {orderNumber && (
            <Text style={{ fontSize: 9, color: '#64748B', marginTop: 4, textAlign: 'right' }}>
              رقم الطلب: {orderNumber}
            </Text>
          )}
          <View style={styles.statusBadge}>
            <Text>{statusLabels[invoice.status]}</Text>
          </View>
        </View>

        {/* Seller and Buyer Info */}
        <View style={styles.row}>
          {/* Seller Info */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>بيانات البائع</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>الاسم التجاري:</Text>
              <Text style={styles.value}>{invoice.seller_name}</Text>
            </View>
            {invoice.seller_name_en && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>الاسم بالإنجليزية:</Text>
                <Text style={styles.value}>{invoice.seller_name_en}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>الرقم الضريبي:</Text>
              <Text style={styles.value}>{invoice.seller_tax_number}</Text>
            </View>
            {invoice.seller_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>الهاتف:</Text>
                <Text style={styles.value}>{invoice.seller_phone}</Text>
              </View>
            )}
            {invoice.seller_address && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>العنوان:</Text>
                <Text style={styles.value}>{invoice.seller_address}</Text>
              </View>
            )}
            {invoice.seller_city && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>المدينة:</Text>
                <Text style={styles.value}>{invoice.seller_city}</Text>
              </View>
            )}
          </View>

          {/* Buyer Info */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>بيانات المشتري</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>الاسم:</Text>
              <Text style={styles.value}>{invoice.buyer_name || '-'}</Text>
            </View>
            {invoice.buyer_id_type && invoice.buyer_id_number && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>
                  {invoice.buyer_id_type === 'tax_number' ? 'الرقم الضريبي:' :
                   invoice.buyer_id_type === 'national_id' ? 'الرقم الوطني:' : 'الرقم الشخصي:'}
                </Text>
                <Text style={styles.value}>{invoice.buyer_id_number}</Text>
              </View>
            )}
            {invoice.buyer_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>الهاتف:</Text>
                <Text style={styles.value}>{invoice.buyer_phone}</Text>
              </View>
            )}
            {invoice.buyer_city && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>المدينة:</Text>
                <Text style={styles.value}>{invoice.buyer_city}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>تاريخ الإصدار:</Text>
              <Text style={styles.value}>
                {new Date(invoice.issue_date).toLocaleDateString('ar-JO')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>العملة:</Text>
              <Text style={styles.value}>{invoice.currency}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>الوصف</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>الكمية</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>السعر</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>الخصم</Text>
            {invoice.invoice_type !== 'income' && (
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>الضريبة</Text>
            )}
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>الإجمالي</Text>
          </View>

          {lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.description}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.quantity.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.unit_price_jod.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.discount_jod.toFixed(2)}</Text>
              {invoice.invoice_type !== 'income' && (
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {item.general_tax_amount_jod.toFixed(2)}
                  {item.general_tax_rate > 0 && ` (${item.general_tax_rate.toFixed(0)}%)`}
                </Text>
              )}
              <Text style={[styles.tableCell, { flex: 1 }]}>{item.line_total_jod.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
            <Text style={styles.totalValue}>{invoice.subtotal_jod.toFixed(2)} {invoice.currency}</Text>
          </View>

          {invoice.discount_total_jod > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الخصم:</Text>
              <Text style={[styles.totalValue, { color: '#DC2626' }]}>
                -{invoice.discount_total_jod.toFixed(2)} {invoice.currency}
              </Text>
            </View>
          )}

          {invoice.invoice_type !== 'income' && invoice.general_tax_total_jod > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ضريبة المبيعات العامة (16%):</Text>
              <Text style={styles.totalValue}>
                {invoice.general_tax_total_jod.toFixed(2)} {invoice.currency}
              </Text>
            </View>
          )}

          {invoice.invoice_type === 'special_tax' && invoice.special_tax_total_jod > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>الضريبة الخاصة:</Text>
              <Text style={styles.totalValue}>
                {invoice.special_tax_total_jod.toFixed(2)} {invoice.currency}
              </Text>
            </View>
          )}

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>الإجمالي:</Text>
            <Text style={styles.grandTotalValue}>
              {invoice.grand_total_jod.toFixed(2)} {invoice.currency}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>ملاحظات:</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>تم إنشاء هذه الفاتورة إلكترونياً بواسطة نظام المقاول مول</Text>
          <Text style={{ marginTop: 4 }}>
            Contractors Mall E-Invoicing System | portal.jofotara.gov.jo
          </Text>
          <Text style={{ marginTop: 4 }}>
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-JO')} {new Date().toLocaleTimeString('ar-JO')}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
