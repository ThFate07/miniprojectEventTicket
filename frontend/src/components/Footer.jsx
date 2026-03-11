import React from 'react'
import { Sparkles } from "lucide-react"

const Footer = () => {
  return (
    <footer className="border-t border-blue-400/20 py-12 glass-dark">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:grid md:grid-cols-4 gap-8 items-start justify-between">
          <div className="flex flex-col items-center md:items-start space-y-2 col-span-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center glow-blue">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HostMyShow</span>
            </div>
            <p className="text-blue-200 text-sm text-center md:text-left">Your ultimate platform for seamless event experiences.</p>
          </div>

          <div className="flex flex-col items-center md:items-start col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#features" className="text-blue-200 hover:text-white transition-colors">Features</a>
              <a href="#testimonials" className="text-blue-200 hover:text-white transition-colors">Testimonials</a>
              <a href="#pricing" className="text-blue-200 hover:text-white transition-colors">Pricing</a>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-start col-span-1">
            <h3 className="text-lg font-semibold text-white mb-4">Legal</h3>
            <nav className="flex flex-col space-y-2">
              <a href="#privacy" className="text-blue-200 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#terms" className="text-blue-200 hover:text-white transition-colors">Terms of Service</a>
              <a href="#cookies" className="text-blue-200 hover:text-white transition-colors">Cookie Policy</a>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-end col-span-1 w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Platform</h3>
            <div className="text-blue-200 text-sm text-center md:text-right max-w-xs">
              Discover events, book seats, and manage shows from one place.
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-blue-200 text-sm border-t border-blue-400/20 pt-8">
          © {new Date().getFullYear()} HostMyShow. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer