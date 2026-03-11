import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

import { userStore } from "@/context/userContext";

import { Button } from "./ui/button";

const Navbar = () => {
  const isAuth = userStore((state) => state.isAuth);
  const user = userStore((state) => state.user);
  const logout = userStore((state) => state.logout);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/events", label: "Events" },
  ];

  if (!isAuth || user?.role === "Attendee") {
    navLinks.push({ to: "/my-bookings", label: "Bookings" });
  }

  if (isAuth && user?.role === "Organizer") {
    navLinks.push({ to: "/organizer/list-bookings", label: "Event Bookings" });
  }

  const handleLogout = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API}/user/logout`);
      if(res.data.success){
          logout();
          toast.success("Logout Successful");
          navigate("/login");
      }
    } catch (error) {
        console.log(error);
        toast.error("Error Occured");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [isAuth, user?.role]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#120f0d]/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3dd] text-lg font-bold text-[#171717] shadow-sm">
              H
            </span>
            <span className="font-display text-2xl text-[#fff8ef]">HostMyShow</span>
          </Link>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-[#d6d3d1] transition-colors hover:bg-white/6 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {!isAuth && (
            <Link to="/login">
              <Button
                variant="outline"
                className="rounded-full border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
              >
                Sign In
              </Button>
            </Link>
          )}

          {/* If logged in */}
          {isAuth && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#fff3dd] font-bold text-[#171717] transition-transform duration-200 hover:scale-105"
              >
                {user?.username?.[0]?.toUpperCase() || "U"}
              </button>

              {showDropdown && (
                <div className="absolute right-0 z-50 mt-5 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#171717]/95 text-white shadow-2xl backdrop-blur-xl">
                  <div className="border-b border-white/10 px-4 py-3 text-sm text-[#d6d3d1]">
                    Hello, <span className="font-semibold">{user?.username}</span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="block px-4 py-3 text-sm transition-colors hover:bg-white/8"
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm transition-colors hover:bg-white/8"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#120f0d]/96 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-[#f5f5f4] transition-colors hover:bg-white/6"
              >
                {link.label}
              </Link>
            ))}

            {!isAuth ? (
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button
                  variant="outline"
                  className="mt-3 w-full rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Sign In
                </Button>
              </Link>
            ) : (
              <div className="mt-3 flex flex-col gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <p className="px-2 text-sm text-[#d6d3d1]">Signed in as {user?.username}</p>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm text-white transition-colors hover:bg-white/8"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-xl px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/8"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
