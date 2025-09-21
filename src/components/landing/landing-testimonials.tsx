'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Chief Financial Officer",
    company: "Premier Property Group",
    image: "/api/placeholder/64/64",
    content: "RPD's invoice dashboard transformed our financial operations. We've reduced processing time by 75% and gained invaluable insights into our cash flow patterns. The real-time analytics are game-changing.",
    rating: 5
  },
  {
    name: "David Chen",
    role: "Portfolio Manager",
    company: "Urban Development Corp",
    image: "/api/placeholder/64/64",
    content: "The level of detail and automation in RPD's system is extraordinary. What used to take our team days now happens in hours. The predictive insights help us make better investment decisions.",
    rating: 5
  },
  {
    name: "Maria Rodriguez",
    role: "Director of Operations",
    company: "Skyline Realty Solutions",
    image: "/api/placeholder/64/64",
    content: "Security and reliability are paramount in our industry. RPD delivers both while providing an intuitive interface that our entire team adopted quickly. Customer support is exceptional.",
    rating: 5
  }
]

const companies = [
  "Premier Property Group",
  "Urban Development Corp",
  "Skyline Realty Solutions",
  "Metropolitan Estates",
  "Horizon Real Estate",
  "Pinnacle Properties"
]

export function LandingTestimonials() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl" />

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
            What Our Clients Say
            <span className="block bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
              About RPD
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Don&apos;t just take our word for it. Here&apos;s what real estate professionals
            are saying about their experience with our platform.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="landing-testimonial-grid grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -5 }}
              className="group"
            >
              <div className="relative bg-white rounded-2xl border border-slate-200 p-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Quote className="w-12 h-12 text-slate-900" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Content */}
                <blockquote className="text-slate-700 mb-8 text-lg leading-relaxed">
                  &ldquo;{testimonial.content}&rdquo;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-slate-600">
                      {testimonial.role}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      {testimonial.company}
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-slate-600 mb-8">
            Trusted by Leading Real Estate Companies
          </h3>

          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
            {companies.map((company, index) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
              >
                <div className="bg-white rounded-xl border border-slate-200 px-6 py-4 shadow-sm hover:shadow-md transition-all duration-300 group-hover:border-blue-300">
                  <div className="text-slate-600 font-medium text-sm lg:text-base group-hover:text-blue-600 transition-colors">
                    {company}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-6 bg-white rounded-2xl border border-slate-200 px-8 py-6 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-slate-600 text-sm ml-3">500+ happy clients</span>
            </div>

            <div className="w-px h-8 bg-slate-200" />

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-slate-600 text-sm">4.9/5 average rating</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}