'use client'

import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react'
import { RPDLogo } from '@/components/ui/rpd-logo'

export function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RPDLogo size="md" />
            <span className="text-sm">© {new Date().getFullYear()} RPD. All rights reserved.</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}