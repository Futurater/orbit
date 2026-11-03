import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2, ShieldAlert, Cpu, Calendar, Sparkles, Youtube, BookOpen, Clock, Lock, Zap } from 'lucide-react';
import GlassNav from '../components/motion/GlassNav';

export default function Landing() {
  const token = localStorage.getItem('orbit_token');

  return (
    <div className="min-h-screen bg-[#fdf0d5] text-[#003049] selection:bg-[#669bbc] selection:text-[#003049]">
      <GlassNav />

      {/* ── HERO SECTION (PAPAYA WHIP + DEEP SPACE BLUE + BRICK RED) ── */}
      <section className="relative pt-28 pb-20 px-6 md:px-16 bg-[#fdf0d5] border-b-2.5 border-[#003049] overflow-hidden">
        {/* Editorial organic curve lines */}
        <div className="absolute inset-0 pointer-events-none opacity-25">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,25 Q30,75 60,35 T100,55" fill="none" stroke="#003049" strokeWidth="0.6" />
            <path d="M0,65 Q35,15 70,75 T100,25" fill="none" stroke="#c1121f" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#003049] text-[#fdf0d5] text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#c1121f] animate-ping" />
              <span>The Inescapable Arena // MERN + LangChain</span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black text-[#003049] leading-[1.05] tracking-tight">
              Stop watching tutorials. <br />
              <span className="text-[#c1121f]">Start surviving the code.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#003049]/85 font-normal leading-relaxed max-w-xl">
              Passive video tutorials create an illusion of competence. <strong className="font-bold text-[#003049]">Project Orbit</strong> turns any YouTube video or playlist into an active arena: the video automatically pauses at critical checkpoints until you write real code and articulate an oral viva.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                to={token ? '/dashboard' : '/signup'}
                className="aardvark-btn text-base py-3 px-6"
              >
                <span>{token ? 'Open Your Arena Shelf' : 'Launch Orbit Arena — Free'}</span>
                <span className="btn-arrow w-9 h-9">
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </span>
              </Link>

              <Link
                to="/arena"
                className="aardvark-btn-secondary text-sm"
              >
                <Play className="w-4 h-4 mr-2 fill-[#c1121f] text-[#c1121f]" />
                <span>Try Demo Arena</span>
              </Link>
            </div>

            <div className="pt-2">
              <span className="font-handwritten text-2xl text-[#c1121f] font-bold block">
                Paste any YouTube lecture • Second-by-second active pause interception
              </span>
            </div>
          </div>

          {/* Right Column: Tactile Arena Box (Orbit Palette) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="p-8 rounded-[2.5rem] bg-white border-3 border-[#003049] shadow-[8px_10px_0px_#003049] space-y-5">
                <div className="flex items-center justify-between border-b-2 border-[#003049]/15 pb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#c1121f] block">
                      Active Arena Chamber
                    </span>
                    <h3 className="font-display text-xl font-black text-[#003049]">
                      YouTube Video Interceptor
                    </h3>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-[#669bbc] border-2 border-[#003049] text-[#fdf0d5] flex items-center justify-center font-bold text-xs shadow-sm">
                    ⚡
                  </span>
                </div>

                <div className="aspect-video rounded-2xl overflow-hidden border-2.5 border-[#003049] bg-[#003049] relative shadow-inner">
                  <img
                    src="https://img.youtube.com/vi/NTHVTY6w2Co/hqdefault.jpg"
                    alt="Active Interception"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#003049]/90 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[#fdf0d5] text-xs font-bold uppercase tracking-wider bg-[#c1121f] px-3 py-1 rounded-full border border-[#fdf0d5]">
                      Barrier Engaged at 594s
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="tag-pill bg-[#669bbc] text-[#003049]">3 Checkpoints</span>
                    <span className="tag-pill bg-[#780000] text-[#fdf0d5]">Strict Didi</span>
                    <span className="tag-pill bg-[#fdf0d5] text-[#003049]">Oral Viva</span>
                  </div>
                  <p className="text-xs text-[#003049]/80 font-normal leading-relaxed pt-1">
                    The player locks playback. Monaco Editor activates with compiler tests, followed by spoken voice viva evaluation.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/arena"
                    className="w-full aardvark-btn justify-between py-2.5 px-4 text-xs"
                  >
                    <span>Enter Live Arena</span>
                    <span className="btn-arrow w-7 h-7">
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: HARDCOVER ARENAS (AARDVARK SHELF IN ORBIT PALETTE) ── */}
      <section className="py-24 px-6 md:px-16 bg-[#ffffff] border-b-2.5 border-[#003049]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-handwritten text-2xl text-[#c1121f] font-bold block mb-1">
                Turn any video or playlist link into a challenge volume
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-black text-[#003049] tracking-tight">
                Curated Arenas & Custom Volumes
              </h2>
            </div>
            <p className="text-sm text-[#003049]/80 max-w-md font-medium">
              Every video ingested into Orbit is analyzed via LangChain and divided into 3 non-abrupt coding checkpoints.
            </p>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Deep Space Blue */}
            <div className="book-card flex flex-col justify-between p-6 bg-[#003049] text-[#fdf0d5] border-2.5 border-[#003049]">
              <div>
                <div className="aspect-[4/3] rounded-2xl bg-[#001f30] border-2 border-[#fdf0d5]/30 overflow-hidden mb-4 relative shadow-md">
                  <img
                    src="https://img.youtube.com/vi/NTHVTY6w2Co/hqdefault.jpg"
                    alt="Arrays"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 tag-pill bg-[#c1121f] text-white">
                    Volume 01
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="tag-pill bg-[#669bbc] text-[#003049]">Arrays</span>
                  <span className="tag-pill bg-[#fdf0d5] text-[#003049]">Traversals</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#fdf0d5] mb-1.5">
                  Array Memory & Bounds
                </h3>
                <p className="text-xs text-[#fdf0d5]/80 line-clamp-2 font-light leading-relaxed">
                  Declaring contiguous allocations, element mutation, and linear bounds checking.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/arena"
                  className="w-full aardvark-btn bg-[#fdf0d5] text-[#003049] hover:bg-[#669bbc] justify-between py-2 px-3 text-xs"
                >
                  <span>Launch Arena</span>
                  <span className="btn-arrow w-6 h-6 bg-[#003049] text-[#fdf0d5]">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Card 2: Molten Lava */}
            <div className="book-card flex flex-col justify-between p-6 bg-[#780000] text-[#fdf0d5] border-2.5 border-[#003049]">
              <div>
                <div className="aspect-[4/3] rounded-2xl bg-[#450000] border-2 border-[#fdf0d5]/30 overflow-hidden mb-4 relative shadow-md">
                  <img
                    src="https://img.youtube.com/vi/oAja8-Ulz6o/hqdefault.jpg"
                    alt="Pointers"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 tag-pill bg-[#fdf0d5] text-[#780000]">
                    Volume 02
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="tag-pill bg-[#669bbc] text-[#003049]">Pointers</span>
                  <span className="tag-pill bg-[#fdf0d5] text-[#003049]">Nodes</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#fdf0d5] mb-1.5">
                  Linked List Architecture
                </h3>
                <p className="text-xs text-[#fdf0d5]/80 line-clamp-2 font-light leading-relaxed">
                  Node linking, head/tail adjustments, and preventing NullPointer references.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/arena"
                  className="w-full aardvark-btn bg-[#fdf0d5] text-[#780000] hover:bg-[#fdf0d5] justify-between py-2 px-3 text-xs"
                >
                  <span>Launch Arena</span>
                  <span className="btn-arrow w-6 h-6 bg-[#780000] text-[#fdf0d5]">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Card 3: Steel Blue */}
            <div className="book-card flex flex-col justify-between p-6 bg-[#669bbc] text-[#003049] border-2.5 border-[#003049]">
              <div>
                <div className="aspect-[4/3] rounded-2xl bg-[#003049] border-2 border-[#003049] overflow-hidden mb-4 relative shadow-md">
                  <img
                    src="https://img.youtube.com/vi/7m1DMYAbdiY/hqdefault.jpg"
                    alt="Stacks"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 tag-pill bg-[#003049] text-[#fdf0d5]">
                    Volume 03
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="tag-pill bg-[#003049] text-[#fdf0d5]">Stacks</span>
                  <span className="tag-pill bg-[#fdf0d5] text-[#003049]">LIFO</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#003049] mb-1.5">
                  Stack Primitives & State
                </h3>
                <p className="text-xs text-[#003049]/80 line-clamp-2 font-medium leading-relaxed">
                  Push, pop, and peak operations implemented with Java collections.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/arena"
                  className="w-full aardvark-btn bg-[#003049] text-[#fdf0d5] justify-between py-2 px-3 text-xs"
                >
                  <span>Launch Arena</span>
                  <span className="btn-arrow w-6 h-6 bg-[#c1121f] text-[#fdf0d5]">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Card 4: Papaya Whip (Custom Ingestion) */}
            <div className="book-card flex flex-col justify-between p-6 bg-[#fdf0d5] text-[#003049] border-2.5 border-[#003049]">
              <div>
                <div className="aspect-[4/3] rounded-2xl bg-white border-2 border-[#003049] flex flex-col items-center justify-center p-4 mb-4 text-center">
                  <Youtube className="w-10 h-10 text-[#c1121f] mb-2" />
                  <span className="font-display font-bold text-sm text-[#003049]">Paste Any URL</span>
                  <span className="text-[10px] font-mono text-[#003049]/70">Video or Playlist</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="tag-pill bg-[#780000] text-[#fdf0d5]">Custom</span>
                  <span className="tag-pill bg-[#003049] text-[#fdf0d5]">AI Checkpoints</span>
                </div>
                <h3 className="font-display text-lg font-bold text-[#003049] mb-1.5">
                  Create New Arena
                </h3>
                <p className="text-xs text-[#003049]/80 line-clamp-2 font-medium leading-relaxed">
                  Orbit extracts the lecture transcript and divides it into active barriers.
                </p>
              </div>

              <div className="pt-6">
                <Link
                  to="/dashboard"
                  className="w-full aardvark-btn bg-[#003049] text-[#fdf0d5] justify-between py-2 px-3 text-xs"
                >
                  <span>+ Ingest YouTube</span>
                  <span className="btn-arrow w-6 h-6 bg-[#c1121f] text-[#fdf0d5]">
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE 3 ARENA PILLARS (PAPAYA WHIP RETRO CARDS) ── */}
      <section className="py-24 px-6 md:px-16 bg-[#fdf0d5] border-b-2.5 border-[#003049]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="tag-pill bg-[#003049] text-[#fdf0d5] uppercase text-xs">
              The Orbit Active Loop
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-[#003049] tracking-tight">
              Why Orbit Kills Tutorial Hell
            </h2>
            <p className="text-sm text-[#003049]/80 font-medium">
              Passive watching creates a false sense of security. Orbit enforces active recall at the exact timestamp of instruction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-8 rounded-[2rem] bg-white border-2.5 border-[#003049] shadow-[6px_6px_0px_#003049] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="w-12 h-12 rounded-2xl bg-[#003049] text-[#fdf0d5] border-2 border-[#003049] flex items-center justify-center font-display font-black text-2xl shadow-[2px_2px_0px_#c1121f]">
                  1
                </span>
                <h3 className="font-display text-xl font-black text-[#003049]">
                  Active Video Interception
                </h3>
                <p className="text-xs text-[#003049]/80 font-normal leading-relaxed">
                  As the instructor finishes explaining a concept, Orbit pauses the video and locks scrubbing. You cannot scrub forward to copy the answer.
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#003049]/10 flex items-center gap-2 text-xs font-bold text-[#c1121f]">
                <ShieldAlert className="w-4 h-4" /> No skipping through solutions
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-8 rounded-[2rem] bg-white border-2.5 border-[#003049] shadow-[6px_6px_0px_#003049] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="w-12 h-12 rounded-2xl bg-[#780000] text-[#fdf0d5] border-2 border-[#003049] flex items-center justify-center font-display font-black text-2xl shadow-[2px_2px_0px_#003049]">
                  2
                </span>
                <h3 className="font-display text-xl font-black text-[#003049]">
                  Dual Persona Evaluation
                </h3>
                <p className="text-xs text-[#003049]/80 font-normal leading-relaxed">
                  Attempts 1–2 activate Strict Didi (harsh compiler hints without giving away the answer). Attempt 3+ unlocks Mentor Mode with Mermaid visual logic diagrams.
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#003049]/10 flex items-center gap-2 text-xs font-bold text-[#780000]">
                <Cpu className="w-4 h-4" /> Adaptive Guidance
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-8 rounded-[2rem] bg-white border-2.5 border-[#003049] shadow-[6px_6px_0px_#003049] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="w-12 h-12 rounded-2xl bg-[#669bbc] text-[#003049] border-2 border-[#003049] flex items-center justify-center font-display font-black text-2xl shadow-[2px_2px_0px_#003049]">
                  3
                </span>
                <h3 className="font-display text-xl font-black text-[#003049]">
                  Oral Viva Verification
                </h3>
                <p className="text-xs text-[#003049]/80 font-normal leading-relaxed">
                  Writing code isn't enough. You must articulate the reason why your solution works via voice or chat before video playback unlocks.
                </p>
              </div>
              <div className="pt-4 border-t-2 border-[#003049]/10 flex items-center gap-2 text-xs font-bold text-[#003049]">
                <CheckCircle2 className="w-4 h-4 text-[#c1121f]" /> True comprehension verified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PRODUCTIVITY ENGINE (DYNAMIC RESCHEDULING) ── */}
      <section className="py-24 px-6 md:px-16 bg-[#ffffff] border-b-2.5 border-[#003049]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="tag-pill bg-[#780000] text-[#fdf0d5] uppercase text-xs font-bold">
              Dynamic Timetable Engine
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-black text-[#003049] tracking-tight leading-tight">
              Couldn't finish today's work? <br />
              <span className="text-[#c1121f]">Zero guilt. Dynamic slots.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#003049]/85 leading-relaxed font-normal">
              Traditional calendars make you feel bad when tasks pile up. Project Orbit includes an intelligent <strong className="font-bold text-[#003049]">Dynamic Slot Finder</strong> that analyzes your circadian energy and finds open empty intervals across tomorrow or the week.
            </p>

            <ul className="space-y-3 text-sm text-[#003049]/80 font-medium">
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#003049] text-[#fdf0d5] flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>Slot Discovery Quiz:</strong> Calibrates your wake/sleep rhythm and blocks fixed class hours.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#003049] text-[#fdf0d5] flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>No Manual Deletions:</strong> Incomplete work prompts 1-click move to verified open slots.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#c1121f] text-[#fdf0d5] flex items-center justify-center text-xs font-bold">✓</span>
                <span><strong>Peak Focus Matching:</strong> Prioritizes times when your mental energy is at its highest.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link to="/timetable" className="aardvark-btn">
                <span>Explore Weekly Timetable</span>
                <span className="btn-arrow">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </Link>
            </div>
          </div>

          {/* Interactive Card Mockup */}
          <div className="lg:col-span-6">
            <div className="p-6 md:p-8 rounded-[2.5rem] bg-[#fdf0d5] border-3 border-[#003049] shadow-[8px_10px_0px_#003049] space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#003049]/15 pb-3">
                <span className="font-display font-black text-sm uppercase text-[#003049]">
                  Today's Mission Agenda
                </span>
                <span className="tag-pill bg-[#780000] text-[#fdf0d5] border-[#003049]">
                  1 Task Incomplete
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border-2 border-[#003049] flex items-start justify-between gap-3 shadow-sm">
                <div>
                  <h4 className="font-display font-bold text-sm text-[#003049]">
                    Linked List Reverse Pointer Traversal
                  </h4>
                  <span className="text-xs font-mono text-[#003049]/70">
                    45 mins • Checkpoint Challenge
                  </span>
                </div>
                <span className="tag-pill bg-[#669bbc] text-[#003049]">Missed</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border-2 border-[#003049] space-y-2 shadow-sm">
                <span className="font-handwritten text-lg font-bold text-[#c1121f] block">
                  Orbit Discovered 2 Empty Slots This Week:
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#fdf0d5] border border-[#003049] text-xs font-medium">
                  <span>Tomorrow 10:00 AM <strong className="text-[#003049]">(Morning Prime)</strong></span>
                  <span className="tag-pill bg-[#c1121f] text-white">Recommended ★</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#003049] text-xs font-medium text-neutral-600">
                  <span>Wednesday 6:00 PM (Evening Slot)</span>
                  <span className="text-xs font-mono">Rank #2</span>
                </div>
              </div>

              <button className="w-full aardvark-btn bg-[#003049] text-[#fdf0d5] justify-center py-3">
                <span>Auto-Reschedule to Tomorrow 10:00 AM</span>
                <span className="btn-arrow">
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (DEEP SPACE BLUE) ── */}
      <footer className="py-16 px-6 md:px-16 bg-[#003049] text-[#fdf0d5]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-center md:text-left">
            <span className="font-display text-2xl font-black text-[#fdf0d5] block">
              Project Orbit
            </span>
            <p className="text-xs text-[#fdf0d5]/70 font-medium">
              Autonomous active video interception & productivity engine. Built with MERN + LangChain.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
            <Link to="/dashboard" className="text-[#fdf0d5] hover:text-[#669bbc] transition-colors">Courses</Link>
            <Link to="/timetable" className="text-[#fdf0d5] hover:text-[#669bbc] transition-colors">Timetable</Link>
            <Link to="/login" className="text-[#fdf0d5] hover:text-[#669bbc] transition-colors">Sign In</Link>
            <Link to="/signup" className="text-[#fdf0d5] hover:text-[#669bbc] transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
