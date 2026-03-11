import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from "lucide-react"

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#100e0c]/92 py-14 text-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_0.8fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3dd] text-[#171717] shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-display text-3xl text-[#fff8ef]">HostMyShow</span>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#c9c5bf]">
              A more polished way to launch events, sell seats, and keep attendee journeys feeling deliberate from discovery to check-in.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Explore</h3>
            <nav className="flex flex-col gap-3 text-sm text-[#d6d3d1]">
              <a href="#features" className="transition-colors hover:text-white">Features</a>
              <a href="#testimonials" className="transition-colors hover:text-white">Testimonials</a>
              <Link to="/events" className="transition-colors hover:text-white">Browse events</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Roles</h3>
            <nav className="flex flex-col gap-3 text-sm text-[#d6d3d1]">
              <Link to="/organizer/dashboard" className="transition-colors hover:text-white">Organizer workspace</Link>
              <Link to="/my-bookings" className="transition-colors hover:text-white">Attendee bookings</Link>
              <Link to="/profile" className="transition-colors hover:text-white">Profile</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Current direction</h3>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-[#d6d3d1]">
              Warm neutrals, stronger typography, and cleaner information hierarchy.
              <div className="mt-4 inline-flex items-center gap-2 text-[#fff3dd]">
                Landing page refresh in progress
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-sm text-[#b9b2aa]">
          © {new Date().getFullYear()} HostMyShow. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer