'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  Clock,
  Shield,
  Zap,
  TrendingUp,
  FileText,
  Users,
  Calendar,
  CheckCircle,
  DollarSign
} from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into your invoice patterns, vendor performance, and cash flow trends with interactive charts and reports.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: Clock,
    title: "Real-time Tracking",
    description: "Monitor invoice status, payment schedules, and overdue items with live updates and automated notifications.",
    color: "from-green-500 to-green-600"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption, secure authentication, and compliance with industry standards to protect your sensitive data.",
    color: "from-purple-500 to-purple-600"
  },
  {
    icon: Zap,
    title: "Lightning Performance",
    description: "Optimized for speed with instant search, rapid data processing, and seamless user experience across all devices.",
    color: "from-amber-500 to-amber-600"
  },
  {
    icon: FileText,
    title: "Smart Document Management",
    description: "Organize, categorize, and search through thousands of invoices with AI-powered tagging and automated workflows.",
    color: "from-indigo-500 to-indigo-600"
  },
  {
    icon: TrendingUp,
    title: "Predictive Insights",
    description: "Forecast cash flow, identify payment patterns, and optimize your financial planning with machine learning algorithms.",
    color: "from-rose-500 to-rose-600"
  }
]

const stats = [
  { value: "99.9%", label: "Uptime Guarantee", icon: CheckCircle },
  { value: "2.4M+", label: "Invoices Processed", icon: FileText },
  { value: "500+", label: "Enterprise Clients", icon: Users },
  { value: "$50B+", label: "Transaction Volume", icon: DollarSign }
]

export function LandingFeatures() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:70px_70px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Built for Modern
            <span className="block bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
              Real Estate Professionals
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Every feature designed to streamline your workflow, reduce manual work,
            and provide the insights you need to make data-driven decisions.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="landing-feature-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group landing-card-hover"
            >
              <div className="relative bg-white rounded-2xl border border-slate-200 p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                {/* Icon */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-slate-900 mb-3 group-hover:text-slate-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-12 text-white"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">
              Trusted by Industry Leaders
            </h3>
            <p className="text-slate-300 text-lg">
              Join hundreds of real estate professionals who rely on our platform daily
            </p>
          </div>

          <div className="landing-stats-grid grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex p-3 bg-white/10 rounded-xl mb-4">
                  <stat.icon className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-300 text-sm lg:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mt-20"
        >
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Ready to Transform Your Invoice Management?
          </h3>
          <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
            Experience the power of RPD&apos;s invoice dashboard and see why leading real estate
            professionals choose our platform for their financial operations.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              Start Your Journey Today
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}