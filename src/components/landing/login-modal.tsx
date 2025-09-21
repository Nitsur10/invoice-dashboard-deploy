'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RPDLogo } from '@/components/ui/rpd-logo'
import { trackLoginAttempt, trackLoginSuccess } from '@/lib/analytics'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'email' | 'password'>('email')

  const supabase = createSupabaseBrowserClient()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    trackLoginAttempt('email_submitted')
    setStep('password')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    trackLoginAttempt('password_submitted')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        try {
          await fetch('/api/auth/set', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
            credentials: 'include',
          })
        } catch (sessionError) {
          console.warn('Session setting failed:', sessionError)
          // Continue anyway, the session is still valid
        }
      }

      trackLoginSuccess()
      setLoading(false)
      onClose()
      router.replace('/overview')
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred during login. Please try again.')
      setLoading(false)
    }
  }

  const resetToEmail = () => {
    setStep('email')
    setPassword('')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-900 to-blue-900 p-6 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Secure Access</h2>
                  <p className="text-slate-300 text-sm">Welcome back to RPD Dashboard</p>
                </div>
              </div>

              <RPDLogo size="sm" />
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 'email' ? (
                  <motion.form
                    key="email"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleEmailSubmit}
                    className="space-y-6"
                  >
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@example.com"
                          className="pl-10 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          required
                          autoComplete="email"
                          autoFocus
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={!email}
                    >
                      Continue
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="password"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handlePasswordSubmit}
                    className="space-y-6"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={resetToEmail}
                        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-4"
                      >
                        <Mail className="w-4 h-4" />
                        {email}
                      </button>

                      <label htmlFor="password" className="block text-sm font-medium mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-12 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          required
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={loading || !password}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Security Note */}
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Shield className="w-4 h-4" />
                  <span>Your connection is secured with enterprise-grade encryption</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}