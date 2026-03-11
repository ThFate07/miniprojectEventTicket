import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const featureCards = [
  {
    title: "Event setup without friction",
    description:
      "Build seated or general admission experiences with a cleaner organizer flow and launch-ready event pages.",
    icon: CalendarCheck2,
    accent: "from-[#ffb65c] to-[#f07c52]",
  },
  {
    title: "Ticketing that feels invisible",
    description:
      "Seat selection, confirmations, and attendee access stay in one place so booking feels fast instead of stressful.",
    icon: Ticket,
    accent: "from-[#2cc4b0] to-[#1d8f87]",
  },
  {
    title: "Confidence on event day",
    description: "Keep fraud low with QR validation, secure check-ins, and the guardrails organizers actually need.",
    icon: ShieldCheck,
    accent: "from-[#f4d58d] to-[#d7a45b]",
  },
  {
    title: "Audience insights that matter",
    description: "Track bookings, revenue, and post-event sentiment without exporting spreadsheets all afternoon.",
    icon: BarChart3,
    accent: "from-[#65c9ff] to-[#347fe7]",
  },
];

const spotlightMoments = [
  {
    label: "For organizers",
    title: "Create a show page that looks premium from day one.",
    copy: "Launch with schedules, pricing, and venue details that feel curated instead of assembled from separate tools.",
  },
  {
    label: "For attendees",
    title: "Go from discovery to seat selection in a single, clear flow.",
    copy: "Browse upcoming events, reserve seats, and keep your booking history close without bouncing between screens.",
  },
];

const dashboardStats = [
  { value: "48h", label: "Typical launch time for a new event" },
  { value: "3x", label: "Faster booking operations from one dashboard" },
  { value: "99%", label: "Ticket confidence with secure delivery" },
];

const showcaseCards = [
  {
    title: "Design Summit",
    meta: "Bengaluru • 380 seats",
    tone: "bg-[#f07c52]",
  },
  {
    title: "Night Market Sessions",
    meta: "Mumbai • 240 passes",
    tone: "bg-[#2cc4b0]",
  },
  {
    title: "Product Guild Live",
    meta: "Hyderabad • VIP seating",
    tone: "bg-[#f4d58d]",
  },
];

const Landing = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = () => {
    if (!testimonials.length) return;
    setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    if (!testimonials.length) return;
    setCurrentTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API}/review/top`);
        setTestimonials(response.data.reviews || []);
      } catch (error) {
        console.error("failed to fetch testimonials", error);
      }
    };

    fetchTestimonials();
  }, []);

  return (
    <div className="site-shell overflow-hidden text-white">
      <section className="relative px-4 pb-18 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717]/85 px-6 py-10 shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur md:px-10 md:py-14">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-r from-[#ffb65c]/18 via-transparent to-[#2cc4b0]/18" />
            <div className="absolute -left-16 top-14 h-44 w-44 rounded-full bg-[#f07c52]/18 blur-3xl" />
            <div className="absolute right-0 top-28 h-56 w-56 rounded-full bg-[#2cc4b0]/16 blur-3xl" />

            <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <Badge className="mb-6 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[0.72rem] uppercase tracking-[0.24em] text-[#f7e6c3] backdrop-blur">
                  <Sparkles className="mr-2 h-4 w-4 text-[#ffb65c]" />
                  Event operations, redesigned
                </Badge>

                <h1 className="font-display max-w-3xl text-5xl leading-[0.95] text-[#fff8ef] sm:text-6xl lg:text-7xl">
                  Live experiences should feel curated before the doors even open.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-[#d1d5db] sm:text-lg">
                  HostMyShow brings event creation, bookings, ticketing, reviews, and attendee communication into one
                  polished flow that feels modern on both sides of the stage.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link to="/organizer/dashboard">
                    <Button className="h-13 rounded-full bg-[#fff3dd] px-7 text-sm font-semibold text-[#1c1917] hover:bg-[#ffe2b3] sm:h-14 sm:px-8">
                      Start an event
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button
                      variant="outline"
                      className="h-13 rounded-full border-white/15 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:h-14 sm:px-8"
                    >
                      Explore events
                    </Button>
                  </Link>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                  {dashboardStats.map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 backdrop-blur"
                    >
                      <p className="text-3xl font-bold text-[#fff5e7]">{stat.value}</p>
                      <p className="mt-2 text-sm leading-6 text-[#b9c0ca]">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[34rem]">
                <div className="absolute -top-10 right-8 rounded-full border border-[#f4d58d]/30 bg-[#f4d58d]/12 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#fff3dd] backdrop-blur">
                  Curated booking flow
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-[#0f0f10] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                  <div className="rounded-[1.7rem] border border-white/8 bg-[#faf2e6] p-5 text-[#1f2937]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6f62]">
                          Tonight's spotlight
                        </p>
                        <h2 className="font-display mt-3 text-3xl leading-tight text-[#171717]">
                          Design people, music lovers, founders, all in one venue.
                        </h2>
                      </div>
                      <div className="rounded-2xl bg-[#171717] px-3 py-2 text-right text-[#faf2e6]">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#c8bda9]">Sell-through</p>
                        <p className="mt-1 text-2xl font-bold">84%</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                      <div className="rounded-[1.5rem] bg-[#171717] p-5 text-[#faf2e6]">
                        <div className="flex items-center gap-3 text-sm text-[#d7cab3]">
                          <CalendarCheck2 className="h-4 w-4 text-[#ffb65c]" />
                          Sat, 22 Jun
                          <Clock3 className="ml-3 h-4 w-4 text-[#2cc4b0]" />
                          7:30 PM
                        </div>
                        <div className="mt-5 rounded-[1.25rem] bg-white/6 p-4">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-[#d7cab3]">Occupancy</p>
                              <p className="mt-2 text-3xl font-bold">312 / 372</p>
                            </div>
                            <p className="rounded-full bg-[#2cc4b0]/16 px-3 py-1 text-xs font-semibold text-[#6de1d1]">
                              On track
                            </p>
                          </div>
                          <div className="mt-4 h-2 rounded-full bg-white/10">
                            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-[#ffb65c] via-[#f07c52] to-[#2cc4b0]" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {showcaseCards.map(card => (
                          <div
                            key={card.title}
                            className="rounded-[1.35rem] border border-[#e7ddcf] bg-white p-4 shadow-sm"
                          >
                            <div className={`mb-3 h-2 w-16 rounded-full ${card.tone}`} />
                            <p className="font-semibold text-[#171717]">{card.title}</p>
                            <p className="mt-1 text-sm text-[#6b7280]">{card.meta}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#4b5563]">
                      <span className="rounded-full bg-[#fff3dd] px-3 py-2 font-medium text-[#8a5d1d]">
                        Priority support
                      </span>
                      <span className="rounded-full bg-[#dff8f5] px-3 py-2 font-medium text-[#0c766d]">
                        QR ticketing
                      </span>
                      <span className="rounded-full bg-[#f3ede3] px-3 py-2 font-medium text-[#6b4e2e]">
                        Seat locking
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-7 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.28em] text-[#f4d58d]">Why it feels different</p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-[#fff8ef] sm:text-5xl">
                Less dashboard clutter. More confidence for every event team.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#bfc7d0]">
                The redesign direction moves away from generic SaaS gradients and toward a richer event brand language:
                warmer surfaces, stronger hierarchy, and more tactile panels.
              </p>

              <div className="mt-8 space-y-4">
                {spotlightMoments.map(moment => (
                  <div key={moment.title} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#ffb65c]">{moment.label}</p>
                    <h3 className="mt-3 text-2xl font-semibold text-[#fff5e7]">{moment.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#b9c0ca]">{moment.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {featureCards.map(feature => (
                <Card
                  key={feature.title}
                  className="rounded-[1.75rem] border-[#efe4d3] bg-[#fbf3e8] py-0 text-[#171717] shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
                >
                  <CardContent className="p-6 sm:p-7">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white`}
                    >
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 text-2xl font-semibold text-[#171717]">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#57534e]">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#201915] via-[#191717] to-[#101516] p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[#f4d58d]">Experience stack</p>
                <h2 className="font-display mt-4 text-4xl leading-tight text-[#fff5e7]">
                  Discovery, booking, and follow-up on one rhythm.
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-[#d6d3d1]">
                Built for hackathons, concerts, meetups, and conferences
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
                <Users className="h-6 w-6 text-[#ffb65c]" />
                <p className="mt-5 text-xl font-semibold text-white">Audience discovery</p>
                <p className="mt-3 text-sm leading-7 text-[#b9c0ca]">
                  Surface what is happening soon, where it is, and why it matters in seconds.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
                <MapPinned className="h-6 w-6 text-[#2cc4b0]" />
                <p className="mt-5 text-xl font-semibold text-white">Venue clarity</p>
                <p className="mt-3 text-sm leading-7 text-[#b9c0ca]">
                  Keep schedules, capacity, and seating context visible instead of buried inside forms.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
                <Star className="h-6 w-6 text-[#f4d58d]" />
                <p className="mt-5 text-xl font-semibold text-white">Better follow-through</p>
                <p className="mt-3 text-sm leading-7 text-[#b9c0ca]">
                  Collect reviews and feedback after the show while the experience is still fresh.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#f2e6d4] bg-[#f8efe1] p-7 text-[#171717] shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <p className="text-sm uppercase tracking-[0.28em] text-[#8a5d1d]">Quick pulse</p>
            <h3 className="font-display mt-4 text-4xl leading-tight">
              A landing direction with more identity and less template energy.
            </h3>
            <div className="mt-8 space-y-4">
              <div className="rounded-[1.4rem] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#78716c]">Primary palette</p>
                <div className="mt-4 flex gap-3">
                  <span className="h-10 w-10 rounded-full bg-[#171717]" />
                  <span className="h-10 w-10 rounded-full bg-[#ffb65c]" />
                  <span className="h-10 w-10 rounded-full bg-[#2cc4b0]" />
                  <span className="h-10 w-10 rounded-full border border-[#eadcca] bg-[#faf2e6]" />
                </div>
              </div>
              <div className="rounded-[1.4rem] bg-[#171717] p-5 text-[#faf2e6]">
                <p className="text-xs uppercase tracking-[0.2em] text-[#c8bda9]">Design notes</p>
                <p className="mt-3 text-sm leading-7 text-[#ddd6cc]">
                  Fraunces handles the hero and section headings, while Space Grotesk keeps everything else sharp and
                  contemporary.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section id="testimonials" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 backdrop-blur sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-[#f4d58d]">Proof from organizers</p>
                  <h2 className="font-display mt-4 text-4xl leading-tight text-[#fff8ef] sm:text-5xl">
                    People remember the event. Teams remember how smooth it was to run.
                  </h2>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevTestimonial}
                    className="h-11 w-11 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextTestimonial}
                    className="h-11 w-11 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-[#efe2cf] bg-[#faf2e6] p-6 text-[#171717] sm:p-8">
                <div className="flex items-center gap-2 text-[#f0a12a]">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} className="h-5 w-5 fill-current" />
                  ))}
                </div>

                <p className="font-display mt-6 text-3xl leading-tight text-[#171717] sm:text-4xl">
                  “{testimonials[currentTestimonial].review}”
                </p>

                <div className="mt-8 flex flex-col gap-4 border-t border-[#eadcca] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-[#eadcca]">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback className="bg-[#171717] text-[#faf2e6]">
                        {testimonials[currentTestimonial]?.user_id?.username
                          ?.split(" ")
                          .map(name => name[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-[#171717]">
                        {testimonials[currentTestimonial]?.user_id?.username || "Anonymous"}
                      </p>
                      <p className="text-sm text-[#6b7280]">Verified HostMyShow user</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {testimonials.map((_, index) => (
                      <span
                        key={index}
                        className={`h-2.5 rounded-full transition-all ${
                          index === currentTestimonial ? "w-8 bg-[#171717]" : "w-2.5 bg-[#d5c5b1]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 pb-18 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#f07c52] via-[#d66a4a] to-[#0f766e] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.28em] text-white/75">Next step</p>
                <h2 className="font-display mt-4 text-4xl leading-tight text-white sm:text-5xl">
                  If this style direction works, the rest of the product should inherit the same confidence.
                </h2>
                <p className="mt-5 text-base leading-8 text-white/80 sm:text-lg">
                  Start with the landing page, validate the palette and type system, then extend the same approach to
                  discovery, checkout, and organizer dashboards.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/organizer/dashboard">
                  <Button className="h-13 rounded-full bg-[#111827] px-7 text-sm font-semibold text-white hover:bg-[#030712] sm:h-14 sm:px-8">
                    Create your first event
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button
                    variant="outline"
                    className="h-13 rounded-full border-white/30 bg-white/10 px-7 text-sm font-semibold text-white hover:bg-white/15 hover:text-white sm:h-14 sm:px-8"
                  >
                    See live listings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
