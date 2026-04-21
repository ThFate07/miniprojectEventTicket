import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers3,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const featureCards = [
  {
    title: "Plan the academic year early",
    description:
      "Committees can publish tentative events before everything is locked, helping students see the year ahead instead of waiting for last-minute announcements.",
    icon: CalendarCheck2,
    accent: "from-[#ffb65c] to-[#f07c52]",
  },
  {
    title: "Keep ownership structured",
    description:
      "Every event belongs to a committee and college, so organizers, college admins, and students operate inside a system that actually reflects campus structure.",
    icon: Building2,
    accent: "from-[#2cc4b0] to-[#1d8f87]",
  },
  {
    title: "Control who sees what",
    description:
      "Visibility expands from department to college to global without duplicating events or creating separate listings for every audience.",
    icon: Eye,
    accent: "from-[#f4d58d] to-[#d7a45b]",
  },
];

const workflowCards = [
  {
    title: "Tentative",
    copy: "Students can discover what is coming this year without committing too early.",
    icon: Layers3,
  },
  {
    title: "Finalized",
    copy: "Committees confirm the date, visibility, and audience once the event is ready.",
    icon: CalendarCheck2,
  },
  {
    title: "Registration Open",
    copy: "Free events become one-click registrations, while paid events reuse the existing secure payment flow.",
    icon: Users,
  },
];

const showcaseCards = [
  { title: "Tech Week Hackathon", meta: "CSE • Tentative planning", tone: "bg-[#f07c52]" },
  { title: "Founders Forum", meta: "College-wide • Registration open", tone: "bg-[#2cc4b0]" },
];

const heroNotes = ["Invite-based access", "Department-aware visibility"];

const Landing = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

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

  const nextTestimonial = () => {
    if (!testimonials.length) return;
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    if (!testimonials.length) return;
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="site-shell overflow-hidden text-white">
      <section className="relative px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="campus-hero-card relative overflow-hidden px-6 py-10 md:px-10 md:py-12">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-[#ffb65c]/14 via-transparent to-[#2cc4b0]/14" />
            <div className="absolute -left-16 top-14 h-36 w-36 rounded-full bg-[#f07c52]/14 blur-3xl" />
            <div className="absolute right-0 top-24 h-48 w-48 rounded-full bg-[#2cc4b0]/12 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <Badge className="mb-6 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[0.72rem] uppercase tracking-[0.24em] text-[#f7e6c3]">
                  <Sparkles className="mr-2 h-4 w-4 text-[#ffb65c]" />
                  College event planning, redesigned
                </Badge>

                <h1 className="font-display max-w-3xl text-5xl leading-[0.95] text-[#fff8ef] sm:text-6xl lg:text-7xl">
                  Build one shared campus calendar before the year even begins.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-8 text-[#d1d5db] sm:text-lg">
                  Book My Event turns the old marketplace into a structured college platform where committees plan early,
                  departments control visibility, and students register only when events are actually ready.
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-sm text-[#d6d3d1]">
                  {heroNotes.map((note) => (
                    <span key={note} className="rounded-full border border-white/10 bg-white/6 px-4 py-2">
                      {note}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link to="/organizer/dashboard">
                    <Button className="h-13 rounded-full bg-[#fff3dd] px-7 text-sm font-semibold text-[#1c1917] hover:bg-[#ffe2b3] sm:h-14 sm:px-8">
                      Open committee workspace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/events">
                    <Button
                      variant="outline"
                      className="h-13 rounded-full border-white/15 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white/10 hover:text-white sm:h-14 sm:px-8"
                    >
                      Explore campus events
                    </Button>
                  </Link>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-bold text-[#fff5e7] sm:text-3xl">1</p>
                    <p className="mt-2 text-sm leading-6 text-[#b9c0ca]">shared planner for organizers, admins, and students</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-bold text-[#fff5e7] sm:text-3xl">3</p>
                    <p className="mt-2 text-sm leading-6 text-[#b9c0ca]">visibility layers: department, college, global</p>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[32rem]">
                <div className="absolute -top-8 right-6 rounded-full border border-[#f4d58d]/30 bg-[#f4d58d]/12 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#fff3dd]">
                  Academic year board
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-[#0f0f10] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
                  <div className="rounded-[1.7rem] border border-white/8 bg-[#faf2e6] p-5 text-[#1f2937]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7c6f62]">Current rhythm</p>
                        <h2 className="font-display mt-3 text-2xl leading-tight text-[#171717] sm:text-3xl">
                          Draft the year early. Finalize only when each event is ready.
                        </h2>
                      </div>
                      <div className="rounded-2xl bg-[#171717] px-3 py-2 text-right text-[#faf2e6]">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#c8bda9]">Audience</p>
                        <p className="mt-1 text-2xl font-bold">Dept → Global</p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-[1.5rem] bg-[#171717] p-5 text-[#faf2e6]">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#d7cab3]">
                        <CalendarCheck2 className="h-4 w-4 text-[#ffb65c]" />
                        Tentative planning
                        <ShieldCheck className="h-4 w-4 text-[#2cc4b0]" />
                        Registration opens after finalization
                      </div>
                      <div className="mt-5 rounded-[1.25rem] bg-white/6 p-4">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#d7cab3]">System rule</p>
                            <p className="mt-2 text-3xl font-bold">Visible early, bookable later</p>
                          </div>
                          <p className="rounded-full bg-[#2cc4b0]/16 px-3 py-1 text-xs font-semibold text-[#6de1d1]">
                            No duplicate events
                          </p>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-white/10">
                          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#ffb65c] via-[#f07c52] to-[#2cc4b0]" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {showcaseCards.map((card) => (
                        <div key={card.title} className="rounded-[1.35rem] border border-[#e7ddcf] bg-white p-4 shadow-sm">
                          <div className={`mb-3 h-2 w-14 rounded-full ${card.tone}`} />
                          <p className="font-semibold text-[#171717]">{card.title}</p>
                          <p className="mt-1 text-sm text-[#6b7280]">{card.meta}</p>
                        </div>
                      ))}
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
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-7">
              <p className="campus-label">What stays central</p>
              <h2 className="font-display mt-4 text-4xl leading-tight text-[#fff8ef] sm:text-5xl">
                One product for planning, publishing, and running campus events.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#bfc7d0]">
                The product is simpler now: plan early, control visibility clearly, and only open booking when an event is ready.
              </p>

              <div className="mt-8 space-y-3">
                {workflowCards.map((step) => (
                  <div key={step.title} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                        <step.icon className="h-5 w-5 text-[#fff5e7]" />
                      </div>
                      <h3 className="text-xl font-semibold text-[#fff5e7]">{step.title}</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#b9c0ca]">{step.copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-1 xl:grid-cols-2">
              {featureCards.map((feature) => (
                <Card
                  key={feature.title}
                  className="rounded-[1.75rem] border-[#efe4d3] bg-[#fbf3e8] py-0 text-[#171717] shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
                >
                  <CardContent className="p-6 sm:p-7">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-white`}>
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

      {testimonials.length > 0 && (
        <section id="testimonials" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="campus-label">Proof from teams</p>
                  <h2 className="font-display mt-4 text-4xl leading-tight text-[#fff8ef] sm:text-5xl">
                    Students remember the event. Committees remember how calm it felt to run.
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
                          .map((name) => name[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-[#171717]">
                        {testimonials[currentTestimonial]?.user_id?.username || "Anonymous"}
                      </p>
                      <p className="text-sm text-[#6b7280]">Verified platform user</p>
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
                  Give every college a cleaner yearly event rhythm, from first draft to final check-in.
                </h2>
                <p className="mt-5 text-base leading-8 text-white/80 sm:text-lg">
                  Use the organizer workspace to draft events, then review the student flow to see how tentative and finalized states read differently.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link to="/organizer/dashboard">
                  <Button className="h-13 rounded-full bg-[#111827] px-7 text-sm font-semibold text-white hover:bg-[#030712] sm:h-14 sm:px-8">
                    Start planning the year
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/events">
                  <Button
                    variant="outline"
                    className="h-13 rounded-full border-white/30 bg-white/10 px-7 text-sm font-semibold text-white hover:bg-white/15 hover:text-white sm:h-14 sm:px-8"
                  >
                    Review student listings
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
