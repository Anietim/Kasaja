import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Wallet, ArrowDownLeft, ArrowUpRight, Plus, Building2,
  CheckCircle2, Clock, AlertCircle, ChevronRight, Eye, EyeOff,
  Copy, RefreshCw, Shield, Info, X, Banknote, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { openPaystackCheckout, generateRef } from '@/lib/paystack'
import {
  canWithdraw, recordBankAccountChange, logActivity,
  TRANSACTION_PIN_THRESHOLD
} from '@/lib/security'
import TransactionPinGate from '@/components/TransactionPinGate'

const DEV_BYPASS = import.meta.env.DEV

// Nigerian banks list
const NG_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '063', name: 'Diamond Bank' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '103', name: 'Globus Bank' },
  { code: '120001', name: 'Kuda Microfinance Bank' },
  { code: '090405', name: 'Opay' },
  { code: '090175', name: 'PalmPay' },
  { code: '090303', name: 'Moniepoint MFB' },
]

interface BankAccount {
  id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  is_default: boolean
}

interface Transaction {
  id: string
  type: 'credit' | 'debit' | 'pending' | 'escrow_hold' | 'escrow_release'
  amount: number
  label: string
  reference: string
  status: 'completed' | 'pending' | 'failed'
  created_at: string
  metadata?: Record<string, string>
}

interface WalletSummary {
  available: number
  escrow_held: number
  pending_withdrawal: number
  total_earned: number
  today_earned: number
}

// Mock data for dev
const DEV_WALLET: WalletSummary = {
  available: 87450,
  escrow_held: 24000,
  pending_withdrawal: 0,
  total_earned: 523000,
  today_earned: 12500,
}

const DEV_BANKS: BankAccount[] = [
  { id: '1', bank_code: '058', bank_name: 'Guaranty Trust Bank', account_number: '0123456789', account_name: 'ADAEZE OKAFOR', is_default: true },
]

const DEV_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'credit', amount: 15000, label: 'Order #KSJ-2841 payment released', reference: 'ref_001', status: 'completed', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'escrow_hold', amount: 24000, label: 'Escrow hold — Order #KSJ-2845', reference: 'ref_002', status: 'pending', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'debit', amount: 50000, label: 'Withdrawal to GTBank ••••6789', reference: 'ref_003', status: 'completed', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', type: 'credit', amount: 8500, label: 'Order #KSJ-2830 payment released', reference: 'ref_004', status: 'completed', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: '5', type: 'credit', amount: 3200, label: 'Delivery fee — Yaba to Ikeja', reference: 'ref_005', status: 'completed', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: '6', type: 'escrow_release', amount: 18000, label: 'Escrow released — Order #KSJ-2822', reference: 'ref_006', status: 'completed', created_at: new Date(Date.now() - 345600000).toISOString() },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function txIcon(type: Transaction['type']) {
  switch (type) {
    case 'credit': return { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' }
    case 'debit': return { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/15' }
    case 'escrow_hold': return { icon: Shield, color: 'text-yellow-400', bg: 'bg-yellow-500/15' }
    case 'escrow_release': return { icon: CheckCircle2, color: 'text-brand-400', bg: 'bg-brand-500/15' }
    case 'pending': return { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/15' }
  }
}

function txAmount(t: Transaction) {
  const plus = t.type === 'credit' || t.type === 'escrow_release'
  return `${plus ? '+' : t.type === 'escrow_hold' ? '~' : '-'}₦${t.amount.toLocaleString()}`
}

function txAmountColor(t: Transaction) {
  if (t.type === 'credit' || t.type === 'escrow_release') return 'text-green-400'
  if (t.type === 'escrow_hold') return 'text-yellow-400'
  return 'text-red-400'
}

export default function WalletPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [wallet, setWallet] = useState<WalletSummary>(DEV_WALLET)
  const [banks, setBanks] = useState<BankAccount[]>(DEV_BANKS)
  const [transactions, setTransactions] = useState<Transaction[]>(DEV_TRANSACTIONS)
  const [loading, setLoading] = useState(!DEV_BYPASS)
  const [balanceHidden, setBalanceHidden]     = useState(false)
  const [showPinGate, setShowPinGate]         = useState(false)
  const [pendingWithdraw, setPendingWithdraw] = useState(false)

  // Sheets
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedBank, setSelectedBank] = useState<string>('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  // Add bank form
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [bankStep, setBankStep] = useState<'form' | 'confirm'>('form')

  // Top up
  const [topUpAmount, setTopUpAmount] = useState('')

  const loadWallet = useCallback(async () => {
    if (DEV_BYPASS || !user) return
    setLoading(true)
    try {
      const uid = user.id
      // Load wallet balance from wallet_transactions aggregate
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50)

      if (txs) {
        const mapped: Transaction[] = txs.map((t: Record<string, unknown>) => ({
          id: t.id as string,
          type: t.type as Transaction['type'],
          amount: t.amount as number,
          label: t.label as string,
          reference: t.reference as string,
          status: t.status as Transaction['status'],
          created_at: t.created_at as string,
        }))
        setTransactions(mapped)

        // Calculate balances
        let available = 0, escrow_held = 0, pending_withdrawal = 0, total_earned = 0
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        let today_earned = 0
        for (const t of txs as Record<string, unknown>[]) {
          const amt = t.amount as number
          const type = t.type as string
          const status = t.status as string
          const ts = new Date(t.created_at as string)
          if (type === 'credit' && status === 'completed') {
            available += amt; total_earned += amt
            if (ts >= todayStart) today_earned += amt
          }
          if (type === 'escrow_release' && status === 'completed') available += amt
          if (type === 'debit' && status === 'completed') available -= amt
          if (type === 'escrow_hold') escrow_held += amt
          if (type === 'debit' && status === 'pending') pending_withdrawal += amt
        }
        setWallet({ available: Math.max(0, available), escrow_held, pending_withdrawal, total_earned, today_earned })
      }

      // Load bank accounts from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('bank_accounts')
        .eq('id', uid)
        .single()
      if (profile?.bank_accounts) {
        setBanks(profile.bank_accounts as BankAccount[])
        const def = (profile.bank_accounts as BankAccount[]).find(b => b.is_default)
        if (def) setSelectedBank(def.id)
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void loadWallet() }, [loadWallet])

  // Verify account number (mock in dev, real Paystack call in prod)
  const verifyAccount = async () => {
    if (accountNumber.length !== 10 || !bankCode) {
      toast.error('Enter a valid 10-digit account number and select a bank')
      return
    }
    setVerifying(true)
    try {
      // In production this calls your backend which proxies to Paystack /bank/resolve
      await new Promise(r => setTimeout(r, 1200))
      const bank = NG_BANKS.find(b => b.code === bankCode)
      setAccountName(`VERIFIED — ${bank?.name ?? ''} Account`) // Replace with real name from Paystack
      setBankStep('confirm')
    } catch {
      toast.error('Could not verify account. Check the number and try again.')
    } finally {
      setVerifying(false)
    }
  }

  const saveBank = async () => {
    const bank = NG_BANKS.find(b => b.code === bankCode)
    if (!bank) return
    const newBank: BankAccount = {
      id: Date.now().toString(),
      bank_code: bankCode,
      bank_name: bank.name,
      account_number: accountNumber,
      account_name: accountName,
      is_default: banks.length === 0,
    }
    const updated = [...banks, newBank]
    setBanks(updated)
    if (!DEV_BYPASS && user) {
      await supabase.from('profiles').update({ bank_accounts: updated }).eq('id', user.id)
    }
    setSelectedBank(newBank.id)
    setShowAddBank(false)
    setBankStep('form')
    setBankCode(''); setAccountNumber(''); setAccountName('')
    recordBankAccountChange()
    logActivity('bank_account_added')
    toast.success('Bank account added')
  }

  const handleWithdraw = async () => {
    const amt = parseInt(withdrawAmount)
    if (!amt || amt < 500) { toast.error('Minimum withdrawal is ₦500'); return }
    if (amt > 100000) { toast.error('Maximum single withdrawal is ₦100,000'); return }
    if (amt > wallet.available) { toast.error('Insufficient available balance'); return }
    if (!selectedBank) { toast.error('Select a bank account first'); return }
    const bank = banks.find(b => b.id === selectedBank)
    if (!bank) return

    // ID must be verified before money leaves (also enforced in the database)
    if (!DEV_BYPASS && user) {
      const { data: idp } = await supabase.from('profiles').select('id_status').eq('id', user.id).maybeSingle()
      if ((idp as { id_status?: string } | null)?.id_status !== 'verified') {
        toast.error('Verify your ID to unlock withdrawals')
        void navigate('/verify-id')
        return
      }
    }

    // Withdrawal cooldown check
    const cooldown = canWithdraw()
    if (!cooldown.allowed && !DEV_BYPASS) {
      toast.error(`Withdrawals locked for ${cooldown.hoursLeft}h after a bank account change.`)
      return
    }

    // Require PIN for amounts above threshold
    if (amt >= TRANSACTION_PIN_THRESHOLD && !DEV_BYPASS) {
      setPendingWithdraw(true)
      setShowPinGate(true)
      return
    }

    setWithdrawLoading(true)
    try {
      if (!DEV_BYPASS && user) {
        // Insert pending withdrawal transaction
        await supabase.from('wallet_transactions').insert({
          user_id: user.id,
          type: 'debit',
          amount: amt,
          label: `Withdrawal to ${bank.bank_name} ••••${bank.account_number.slice(-4)}`,
          reference: generateRef(),
          status: 'pending',
          metadata: { bank_code: bank.bank_code, account_number: bank.account_number }
        })
        // In production: call your Edge Function which triggers Paystack Transfer API
      }
      logActivity('withdrawal_requested')
      toast.success(`₦${amt.toLocaleString()} withdrawal to ${bank.bank_name} initiated. Arrives within 30 minutes.`)
      setWithdrawAmount('')
      setPendingWithdraw(false)
      setShowWithdraw(false)
      void loadWallet()
    } catch {
      toast.error('Withdrawal failed. Try again.')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const handleTopUp = () => {
    const amt = parseInt(topUpAmount)
    if (!amt || amt < 100) { toast.error('Minimum top-up is ₦100'); return }
    if (amt > 100000) { toast.error('Maximum single top-up is ₦100,000'); return }
    if (!user?.email) { toast.error('Login required'); return }
    void openPaystackCheckout({
      email: DEV_BYPASS ? 'dev@kasaja.ng' : (user?.email ?? ''),
      amount: amt,
      ref: generateRef(),
      callback: () => {
        toast.success(`₦${amt.toLocaleString()} added to your wallet`)
        setShowTopUp(false)
        setTopUpAmount('')
        void loadWallet()
      },
      onClose: () => {},
    })
  }

  const defaultBank = banks.find(b => b.is_default) ?? banks[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-canvas pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-canvas/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => void navigate(-1)} className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
          <ArrowLeft size={18} className="text-white" />
        </button>
        <h1 className="flex-1 text-xl font-bold text-white font-display">My Wallet</h1>
        <button onClick={() => void loadWallet()} className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
          <RefreshCw size={15} className="text-zinc-400" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f97316 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Available Balance</p>
                <div className="flex items-center gap-3">
                  <p className="text-4xl font-extrabold text-white font-display">
                    {balanceHidden ? '••••••' : `₦${wallet.available.toLocaleString()}`}
                  </p>
                  <button onClick={() => setBalanceHidden(h => !h)} className="opacity-70">
                    {balanceHidden ? <Eye size={18} className="text-white" /> : <EyeOff size={18} className="text-white" />}
                  </button>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wallet size={22} className="text-white" />
              </div>
            </div>

            {/* Sub-balances */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/60 text-xs mb-0.5">In Escrow</p>
                <p className="text-white font-bold text-sm">₦{wallet.escrow_held.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Pending Out</p>
                <p className="text-white font-bold text-sm">₦{wallet.pending_withdrawal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-0.5">Today</p>
                <p className="text-white font-bold text-sm">+₦{wallet.today_earned.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ArrowUpRight, label: 'Withdraw', color: 'bg-zinc-800', action: () => setShowWithdraw(true) },
            { icon: Plus, label: 'Top Up', color: 'bg-brand-500/20 border border-brand-500/30', action: () => setShowTopUp(true) },
            { icon: TrendingUp, label: 'Earnings', color: 'bg-zinc-800', action: () => toast.info(`Total earned: ₦${wallet.total_earned.toLocaleString()}`) },
          ].map(({ icon: Icon, label, color, action }) => (
            <button key={label} onClick={action}
              className={`${color} rounded-2xl py-4 flex flex-col items-center gap-2 transition-opacity active:opacity-70`}>
              <Icon size={20} className={label === 'Top Up' ? 'text-brand-400' : 'text-white'} />
              <span className={`text-xs font-semibold ${label === 'Top Up' ? 'text-brand-300' : 'text-white'}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Default bank account */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white font-display text-sm">Payout Account</h3>
            <button onClick={() => setShowAddBank(true)}
              className="text-xs text-brand-400 font-semibold flex items-center gap-1">
              <Plus size={13} /> Add Bank
            </button>
          </div>

          {defaultBank ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center">
                <Building2 size={18} className="text-zinc-300" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{defaultBank.bank_name}</p>
                <p className="text-zinc-400 text-xs">{defaultBank.account_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-zinc-500 text-xs font-mono">••••••{defaultBank.account_number.slice(-4)}</p>
                  <button onClick={() => { void navigator.clipboard.writeText(defaultBank.account_number); toast.success('Account number copied') }}>
                    <Copy size={11} className="text-zinc-600" />
                  </button>
                </div>
              </div>
              {defaultBank.is_default && (
                <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">Default</span>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAddBank(true)}
              className="w-full border-2 border-dashed border-zinc-700 rounded-xl py-4 flex items-center justify-center gap-2 text-zinc-500 text-sm">
              <Plus size={16} /> Add your bank account to withdraw
            </button>
          )}
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white font-display">Transactions</h3>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Info size={12} /> Last 50
            </div>
          </div>

          <div className="space-y-2">
            {transactions.length === 0 && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
                <Banknote size={32} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400 text-sm">No transactions yet</p>
              </div>
            )}
            {transactions.map((t, i) => {
              const { icon: Icon, color, bg } = txIcon(t.type)
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-zinc-900 rounded-xl p-3 border border-zinc-800"
                >
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{t.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500">{timeAgo(t.created_at)}</p>
                      {t.status === 'pending' && (
                        <span className="text-xs bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded-full">Pending</span>
                      )}
                      {t.status === 'failed' && (
                        <span className="text-xs bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">Failed</span>
                      )}
                    </div>
                  </div>
                  <span className={`font-bold text-sm flex-shrink-0 ${txAmountColor(t)}`}>
                    {txAmount(t)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ───── WITHDRAW SHEET ───── */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div className="fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-zinc-900 rounded-t-3xl border-t border-zinc-700 p-6 pb-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white font-display">Withdraw Funds</h2>
                <button onClick={() => setShowWithdraw(false)} className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>

              {/* Available */}
              <div className="bg-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Available</span>
                <span className="text-white font-bold text-lg">₦{wallet.available.toLocaleString()}</span>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-2 block">Amount (₦500 min — ₦100,000 max)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">₦</span>
                  <input
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-4 py-3.5 text-white text-lg font-bold outline-none focus:border-brand-500"
                  />
                </div>
                {/* Quick amounts */}
                <div className="flex gap-2 mt-2">
                  {[1000, 5000, 10000, 50000].map(amt => (
                    <button key={amt} onClick={() => setWithdrawAmount(String(amt))}
                      className="flex-1 bg-zinc-800 text-zinc-300 text-xs py-1.5 rounded-lg font-medium">
                      ₦{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank selector */}
              <div>
                <label className="text-zinc-400 text-xs font-medium mb-2 block">To account</label>
                {banks.length === 0 ? (
                  <button onClick={() => { setShowWithdraw(false); setShowAddBank(true) }}
                    className="w-full border-2 border-dashed border-zinc-700 rounded-xl py-3 text-zinc-500 text-sm flex items-center justify-center gap-2">
                    <Plus size={14} /> Add a bank account first
                  </button>
                ) : (
                  <div className="space-y-2">
                    {banks.map(b => (
                      <button key={b.id} onClick={() => setSelectedBank(b.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          selectedBank === b.id ? 'border-brand-500 bg-brand-500/10' : 'border-zinc-700 bg-zinc-800'
                        }`}>
                        <Building2 size={16} className="text-zinc-400" />
                        <div className="flex-1 text-left">
                          <p className="text-white text-sm font-medium">{b.bank_name}</p>
                          <p className="text-zinc-500 text-xs font-mono">••••{b.account_number.slice(-4)}</p>
                        </div>
                        {selectedBank === b.id && <CheckCircle2 size={16} className="text-brand-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <AlertCircle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300/80 text-xs">Withdrawals are processed within 30 minutes on business days. Weekends may take up to 24 hours.</p>
              </div>

              <button
                onClick={() => void handleWithdraw()}
                disabled={withdrawLoading || !withdrawAmount || !selectedBank}
                className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl text-lg disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {withdrawLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {withdrawLoading ? 'Processing...' : `Withdraw ₦${parseInt(withdrawAmount || '0').toLocaleString() || '0'}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── ADD BANK SHEET ───── */}
      <AnimatePresence>
        {showAddBank && (
          <motion.div className="fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowAddBank(false); setBankStep('form') }} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-zinc-900 rounded-t-3xl border-t border-zinc-700 p-6 pb-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white font-display">
                  {bankStep === 'form' ? 'Add Bank Account' : 'Confirm Account'}
                </h2>
                <button onClick={() => { setShowAddBank(false); setBankStep('form') }}
                  className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>

              {bankStep === 'form' ? (
                <>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium mb-2 block">Select Bank</label>
                    <select
                      value={bankCode}
                      onChange={e => setBankCode(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-500"
                    >
                      <option value="">Choose your bank...</option>
                      {NG_BANKS.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 text-xs font-medium mb-2 block">Account Number</label>
                    <input
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.slice(0, 10))}
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit account number"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-500 font-mono tracking-widest"
                    />
                    <p className="text-zinc-600 text-xs mt-1">{accountNumber.length}/10 digits</p>
                  </div>

                  <button
                    onClick={() => void verifyAccount()}
                    disabled={verifying || accountNumber.length !== 10 || !bankCode}
                    className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {verifying
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                      : 'Verify Account'}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">{accountName}</p>
                      <p className="text-zinc-400 text-sm">{NG_BANKS.find(b => b.code === bankCode)?.name}</p>
                      <p className="text-zinc-500 text-xs font-mono mt-0.5">{accountNumber}</p>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm text-center">Is this the correct account?</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setBankStep('form')}
                      className="bg-zinc-800 text-white font-bold py-3.5 rounded-2xl">
                      No, go back
                    </button>
                    <button onClick={() => void saveBank()}
                      className="bg-brand-500 text-white font-bold py-3.5 rounded-2xl">
                      Yes, save it
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── TOP UP SHEET ───── */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div className="fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTopUp(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-zinc-900 rounded-t-3xl border-t border-zinc-700 p-6 pb-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white font-display">Top Up Wallet</h2>
                <button onClick={() => setShowTopUp(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <X size={16} className="text-zinc-400" />
                </button>
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-medium mb-2 block">Amount (₦100 min — ₦100,000 max)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">₦</span>
                  <input
                    value={topUpAmount}
                    onChange={e => setTopUpAmount(e.target.value)}
                    type="number"
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-8 pr-4 py-3.5 text-white text-lg font-bold outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[500, 1000, 5000, 10000].map(amt => (
                    <button key={amt} onClick={() => setTopUpAmount(String(amt))}
                      className="flex-1 bg-zinc-800 text-zinc-300 text-xs py-1.5 rounded-lg font-medium">
                      ₦{(amt / 1000) >= 1 ? `${(amt / 1000).toFixed(0)}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-500 text-xs">
                <Shield size={13} />
                <span>Secured by Paystack. Card details are never stored.</span>
              </div>

              <button
                onClick={handleTopUp}
                disabled={!topUpAmount || parseInt(topUpAmount) < 100}
                className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl text-lg disabled:opacity-40"
              >
                Pay ₦{parseInt(topUpAmount || '0').toLocaleString() || '0'} via Paystack
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info bar */}
      <div className="mx-4 mt-4 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        <Shield size={14} className="text-brand-400 flex-shrink-0" />
        <p className="text-zinc-500 text-xs">
          Earnings are released from escrow after buyer confirms delivery. Single transactions capped at ₦100,000.
        </p>
        <ChevronRight size={14} className="text-zinc-700 flex-shrink-0" />
      </div>
    </div>

    {/* Transaction PIN Gate */}
    <AnimatePresence>
      {showPinGate && (
        <TransactionPinGate
          amount={parseInt(withdrawAmount) || 0}
          title="Confirm Withdrawal"
          subtitle={`Enter your PIN to withdraw ₦${parseInt(withdrawAmount || '0').toLocaleString()}`}
          onVerified={() => {
            setShowPinGate(false)
            if (pendingWithdraw) void handleWithdraw()
          }}
          onCancel={() => {
            setShowPinGate(false)
            setPendingWithdraw(false)
          }}
        />
      )}
    </AnimatePresence>
    </>
  )
}
