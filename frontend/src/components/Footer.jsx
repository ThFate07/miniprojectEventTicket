import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, School } from "lucide-react"

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#100e0c] py-14 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_0.8fr]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff3dd] text-[#171717] shadow-sm">
                <School className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-3xl text-[#fff8ef]">Book My Event</div>
                <div className="text-[10px] uppercase tracking-[0.32em] text-[#d6d3d1]">College Events OS</div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#c9c5bf]">
              Plan the academic year, publish by committee, and give every student a clearer path from discovery to registration.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Explore</h3>
            <nav className="flex flex-col gap-3 text-sm text-[#d6d3d1]">
              <a href="#features" className="transition-colors hover:text-white">Features</a>
              <a href="#testimonials" className="transition-colors hover:text-white">Testimonials</a>
              <Link to="/events" className="transition-colors hover:text-white">Browse campus events</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Roles</h3>
            <nav className="flex flex-col gap-3 text-sm text-[#d6d3d1]">
              <Link to="/organizer/dashboard" className="transition-colors hover:text-white">Committee workspace</Link>
              <Link to="/my-bookings" className="transition-colors hover:text-white">Student bookings</Link>
              <Link to="/profile" className="transition-colors hover:text-white">Profile</Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#f4d58d]">Current direction</h3>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-[#d6d3d1]">
              Multi-college planning, scoped visibility, and invite-based access for a calmer campus workflow.
              <div className="mt-4 inline-flex items-center gap-2 text-[#fff3dd]">
                Campus workflow refresh shipped
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-sm text-[#b9b2aa]">
          © {new Date().getFullYear()} Book My Event. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
