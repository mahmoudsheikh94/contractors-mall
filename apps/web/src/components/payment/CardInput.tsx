/**
 * Card Input Component
 * ====================
 * Credit/Debit card input form with validation
 */

'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Lock, Calendar, User } from 'lucide-react'

interface CardInputProps {
  onCardValid: (cardData: CardData) => void
  onCardInvalid: () => void
  saveCard?: boolean
  onSaveCardChange?: (save: boolean) => void
  disabled?: boolean
}

export interface CardData {
  number: string
  holder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  saveCard?: boolean
}

export function CardInput({
  onCardValid,
  onCardInvalid,
  saveCard = false,
  onSaveCardChange,
  disabled = false
}: CardInputProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'unknown'>('unknown')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saveCardLocal, setSaveCardLocal] = useState(saveCard)

  // Detect card type
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s/g, '')
    if (cleanNumber.startsWith('4')) {
      setCardType('visa')
    } else if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) {
      setCardType('mastercard')
    } else {
      setCardType('unknown')
    }
  }, [cardNumber])

  // Validate card data
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Card number validation
    const cleanNumber = cardNumber.replace(/\s/g, '')
    if (touched.number) {
      if (!cleanNumber) {
        newErrors.number = 'رقم البطاقة مطلوب'
      } else if (cleanNumber.length < 13 || cleanNumber.length > 19) {
        newErrors.number = 'رقم البطاقة غير صحيح'
      } else if (!luhnCheck(cleanNumber)) {
        newErrors.number = 'رقم البطاقة غير صالح'
      }
    }

    // Card holder validation
    if (touched.holder) {
      if (!cardHolder.trim()) {
        newErrors.holder = 'اسم حامل البطاقة مطلوب'
      } else if (cardHolder.length < 3) {
        newErrors.holder = 'الاسم قصير جداً'
      }
    }

    // Expiry validation
    if (touched.expiry) {
      if (!expiryMonth || !expiryYear) {
        newErrors.expiry = 'تاريخ انتهاء البطاقة مطلوب'
      } else {
        const now = new Date()
        const currentYear = now.getFullYear() % 100
        const currentMonth = now.getMonth() + 1
        const expYear = parseInt(expiryYear)
        const expMonth = parseInt(expiryMonth)

        if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
          newErrors.expiry = 'البطاقة منتهية الصلاحية'
        }
      }
    }

    // CVV validation
    if (touched.cvv) {
      if (!cvv) {
        newErrors.cvv = 'رمز CVV مطلوب'
      } else if (cvv.length < 3 || cvv.length > 4) {
        newErrors.cvv = 'رمز CVV غير صحيح'
      }
    }

    setErrors(newErrors)

    // Check if card is valid
    const isValid =
      Object.keys(newErrors).length === 0 &&
      cleanNumber.length >= 13 &&
      cardHolder.length >= 3 &&
      expiryMonth &&
      expiryYear &&
      cvv.length >= 3

    if (isValid) {
      onCardValid({
        number: cleanNumber,
        holder: cardHolder,
        expiryMonth,
        expiryYear,
        cvv,
        saveCard: saveCardLocal
      })
    } else {
      onCardInvalid()
    }
  }, [cardNumber, cardHolder, expiryMonth, expiryYear, cvv, touched, saveCardLocal])

  // Luhn algorithm for card number validation
  function luhnCheck(num: string): boolean {
    let sum = 0
    let isEven = false

    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i])

      if (isEven) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }

      sum += digit
      isEven = !isEven
    }

    return sum % 10 === 0
  }

  // Format card number with spaces
  function formatCardNumber(value: string): string {
    const cleanValue = value.replace(/\s/g, '')
    const groups = cleanValue.match(/.{1,4}/g) || []
    return groups.join(' ')
  }

  function handleCardNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\s/g, '')
    if (/^\d*$/.test(value) && value.length <= 19) {
      setCardNumber(formatCardNumber(value))
    }
  }

  function handleExpiryChange(type: 'month' | 'year', value: string) {
    if (/^\d*$/.test(value)) {
      if (type === 'month' && value.length <= 2) {
        const month = parseInt(value)
        if (month >= 0 && month <= 12) {
          setExpiryMonth(value)
        }
      } else if (type === 'year' && value.length <= 2) {
        setExpiryYear(value)
      }
    }
  }

  function handleCvvChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (/^\d*$/.test(value) && value.length <= 4) {
      setCvv(value)
    }
  }

  return (
    <div className="space-y-4">
      {/* Card Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          رقم البطاقة
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={handleCardNumberChange}
            onBlur={() => setTouched({ ...touched, number: true })}
            placeholder="0000 0000 0000 0000"
            className={`w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 ${
              errors.number ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={disabled}
            dir="ltr"
          />
          <div className="absolute left-3 top-3.5">
            {cardType === 'visa' ? (
              <span className="text-blue-600 font-bold text-sm">VISA</span>
            ) : cardType === 'mastercard' ? (
              <span className="text-red-500 font-bold text-sm">MC</span>
            ) : (
              <CreditCard className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
        {errors.number && touched.number && (
          <p className="mt-1 text-sm text-red-600">{errors.number}</p>
        )}
      </div>

      {/* Card Holder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          اسم حامل البطاقة
        </label>
        <div className="relative">
          <input
            type="text"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
            onBlur={() => setTouched({ ...touched, holder: true })}
            placeholder="الاسم كما هو مكتوب على البطاقة"
            className={`w-full pl-10 pr-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 ${
              errors.holder ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={disabled}
          />
          <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
        </div>
        {errors.holder && touched.holder && (
          <p className="mt-1 text-sm text-red-600">{errors.holder}</p>
        )}
      </div>

      {/* Expiry and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تاريخ الانتهاء
          </label>
          <div className="relative flex gap-2">
            <input
              type="text"
              value={expiryMonth}
              onChange={(e) => handleExpiryChange('month', e.target.value)}
              onBlur={() => setTouched({ ...touched, expiry: true })}
              placeholder="MM"
              maxLength={2}
              className={`w-20 px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 text-center ${
                errors.expiry ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={disabled}
              dir="ltr"
            />
            <span className="self-center text-gray-500">/</span>
            <input
              type="text"
              value={expiryYear}
              onChange={(e) => handleExpiryChange('year', e.target.value)}
              onBlur={() => setTouched({ ...touched, expiry: true })}
              placeholder="YY"
              maxLength={2}
              className={`w-20 px-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 text-center ${
                errors.expiry ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={disabled}
              dir="ltr"
            />
          </div>
          {errors.expiry && touched.expiry && (
            <p className="mt-1 text-sm text-red-600">{errors.expiry}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رمز CVV
          </label>
          <div className="relative">
            <input
              type="text"
              value={cvv}
              onChange={handleCvvChange}
              onBlur={() => setTouched({ ...touched, cvv: true })}
              placeholder="000"
              maxLength={4}
              className={`w-full pr-10 pl-3 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-500 text-center ${
                errors.cvv ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={disabled}
              dir="ltr"
            />
            <Lock className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
          </div>
          {errors.cvv && touched.cvv && (
            <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
          )}
        </div>
      </div>

      {/* Save Card Option */}
      {onSaveCardChange && (
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="save-card"
            checked={saveCardLocal}
            onChange={(e) => {
              setSaveCardLocal(e.target.checked)
              onSaveCardChange(e.target.checked)
            }}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            disabled={disabled}
          />
          <label htmlFor="save-card" className="text-sm text-gray-700 cursor-pointer">
            حفظ البطاقة للاستخدام المستقبلي
          </label>
        </div>
      )}

      {/* Security Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-2">
        <Lock className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600">
          معلومات البطاقة محمية بتشفير 256-bit SSL. نحن لا نحتفظ بتفاصيل البطاقة على خوادمنا.
        </p>
      </div>
    </div>
  )
}