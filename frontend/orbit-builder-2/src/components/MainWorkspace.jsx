import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import SpaceTimeline from './SpaceTimeline';
import CodeEditor from './CodeEditor';
import { Maximize, Zap, Rocket } from 'lucide-react';

// 🔥 IMPORTED YOUR DEEP SPACE AND SHOOTING STARS
import DeepSpace from './DeepSpace';
import ShootingStar from './ShootingStar';

import { getCurriculumByDay, getStudentProgress, getSessionState } from '../api';
import { AppContext } from '../context/AppContext';

export default function MainWorkspace() {
  const { user } = useContext(AppContext);
  const navigate = useNavigate();
  const studentId = user?.email || (JSON.parse(localStorage.getItem('orbit_user')) || {}).email || 'dev@company.com';

  // Track session time and streak in localStorage for Dashboard
  useEffect(() => {
    const sessionStart = Date.now();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Update last active date and streak
    try {
      const stats = JSON.parse(localStorage.getItem('orbit_stats') || '{}');
      const lastActive = stats.lastActiveDate || '';

      if (lastActive !== today) {
        // Check if yesterday → streak continues, else reset
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        stats.streak = (lastActive === yesterday) ? (stats.streak || 1) + 1 : 1;
        stats.lastActiveDate = today;
        localStorage.setItem('orbit_stats', JSON.stringify(stats));
      }
    } catch (e) { /* ignore */ }

    // On unmount, accumulate session time
    return () => {
      const elapsed = Math.round((Date.now() - sessionStart) / 60000); // minutes
      try {
        const stats = JSON.parse(localStorage.getItem('orbit_stats') || '{}');
        stats.totalMinutes = (stats.totalMinutes || 0) + elapsed;
        localStorage.setItem('orbit_stats', JSON.stringify(stats));
      } catch (e) { /* ignore */ }
    };
  }, []);

  const [topics, setTopics] = useState([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const [phase, setPhase] = useState('flying');
  const [videoInterrupted, setVideoInterrupted] = useState(false);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);

  const [isNearPlanet, setIsNearPlanet] = useState(null); // null or planet index

  const [completedCheckpoints, setCompletedCheckpoints] = useState(new Set());
  const [sessionDismissedCheckpoints, setSessionDismissedCheckpoints] = useState(new Set());

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const progressData = await getStudentProgress(studentId);

        // The AWS progress API only returns unlocked days, but we need the FULL map
        // so the spaceship can navigate between planets. We manually fetch all 3 days.
        const allDays = ["day_1", "day_2", "day_3"];

        const fullTopics = await Promise.all(
          allDays.map(async (dayId, index) => {
            const data = await getCurriculumByDay(dayId).catch(() => null);
            if (!data || !data.checkpoints) return null;

            const mappedCheckpoints = data.checkpoints.map((cp, idx) => ({
              id: cp.checkpoint_id,
              time: cp.timestamp_seconds,
              title: cp.topic,
              description: cp.context_summary,
              template: cp.starter_code,
              isFinal: idx === data.checkpoints.length - 1
            }));

            return {
              id: index,
              title: data.video_title,
              videoId: data.video_id,
              checkpoints: mappedCheckpoints
            };
          })
        );

        // FALLBACK: If day_2 API doesn't exist, insert a mock so the indexes align with PLANETS array
        if (!fullTopics[1]) {
          fullTopics[1] = {
            id: 1,
            title: "Linked Lists",
            videoId: "7m1DMYAbdiY", // Or any fallback video ID
            checkpoints: [
              {
                id: "cp_01_node_class",
                time: 120, // 2 minutes in
                title: "Create Node Class",
                description: "Write a Node class for a singly linked list.",
                template: "class Node {\n  // your code here\n}",
                isFinal: false
              },
              {
                id: "cp_02_add_first",
                time: 240,
                title: "Add First",
                description: "Implement addFirst method.",
                template: "public void addFirst(int data) {\n  // your code here\n}",
                isFinal: true
              }
            ]
          };
        }

        const validTopics = fullTopics.filter(Boolean);
        setTopics(validTopics);

        // Load completed checkpoints from localStorage first (primary source)
        const alreadyCompleted = new Set();
        try {
          const localCps = JSON.parse(localStorage.getItem('orbit_completed_cps') || '[]');
          if (Array.isArray(localCps)) localCps.forEach(id => alreadyCompleted.add(id));
        } catch (e) { /* ignore */ }

        // Also check DynamoDB for any server-side completions
        for (const topic of validTopics) {
          for (const cp of topic.checkpoints) {
            try {
              const session = await getSessionState(studentId, cp.id);
              if (session.viva_status === 'COMPLETED') {
                alreadyCompleted.add(cp.id);
              }
            } catch (e) {
              // Session not found = not completed, that's fine
            }
          }
        }
        // Persist merged set back to localStorage
        localStorage.setItem('orbit_completed_cps', JSON.stringify([...alreadyCompleted]));
        setCompletedCheckpoints(alreadyCompleted);

        // Ignore the backend is_unlocked flag and load all planets from the progression payload.
        for (let i = 0; i < validTopics.length; i++) {
          const t = validTopics[i];
          t.isUnlocked = true; // Unconditionally unlock all planets to allow seamless progression
        }

        // Skip to the first topic that has incomplete checkpoints AND is unlocked
        const firstIncompleteTopic = validTopics.findIndex(topic =>
          topic.isUnlocked && topic.checkpoints.some(cp => !alreadyCompleted.has(cp.id))
        );
        if (firstIncompleteTopic > 0) {
          setCurrentTopicIndex(firstIncompleteTopic);
        } else if (firstIncompleteTopic === -1 && validTopics.length > 0) {
          // All unlocked topics are complete
          setCurrentTopicIndex(validTopics.length);
        }

        // Add debug log to console so we can see what's happening
        console.log("== ORBIT PROGRESS DEBUG ==");
        console.log("Valid Topics length:", validTopics.length);
        console.log("Already Completed Set:", Array.from(alreadyCompleted));
        validTopics.forEach((t, i) => {
          console.log(`Topic ${i} (${t.title}) - isUnlocked: ${t.isUnlocked}, API locked: ${progressData?.days?.find(d => d.day_id === `day_${i + 1}`)?.is_unlocked}`);
        });

      } catch (e) {
        console.error("Failed to fetch curriculum", e);
      } finally {
        // ALWAYS load completed checkpoints from localStorage, even if API failed
        try {
          const localCps = JSON.parse(localStorage.getItem('orbit_completed_cps') || '[]');
          if (Array.isArray(localCps) && localCps.length > 0) {
            setCompletedCheckpoints(prev => {
              const merged = new Set([...prev, ...localCps]);
              return merged;
            });
          }
        } catch (e) { /* ignore */ }

        setIsLoading(false);
      }
    };
    loadCurriculum();

    return () => clearInterval(progressIntervalRef.current);
  }, [studentId]);

  const currentTopic = topics[currentTopicIndex];
  // A course is complete if we exceeded the normal valid topics. We will treat index 3 (Planet Graphs) as the end trigger.
  const isCourseComplete = topics.length > 0 && currentTopicIndex >= topics.length;

  useEffect(() => {
    // Automatically transition to the end card if we've completed all active planets
    if (isCourseComplete && phase !== 'end_card') {
      setPhase('end_card');
    }
  }, [isCourseComplete, phase]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ESC → go back to dashboard from any phase
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => { });
        }
        navigate('/dashboard');
        return;
      }

      // DESKTOP ENTER KEY LOGIC
      if (e.key === 'Enter') {
        if (isNearPlanet !== null && phase === 'flying') {
          const targetPlanet = topics[isNearPlanet];
          if (!targetPlanet || targetPlanet.title?.includes("(Soon)") || !targetPlanet.isUnlocked) return;

          setCurrentTopicIndex(isNearPlanet);
          setCurrentCheckpointIndex(0);
          setSessionDismissedCheckpoints(new Set());
          handleArrival();
          setIsNearPlanet(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNearPlanet, phase, isCourseComplete, topics, currentTopicIndex]);

  const handleArrival = () => {
    setPhase('video');
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo();
    }
  };

  const startProgressTracker = (player) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (videoInterrupted || !currentTopic) return;

      const currentTime = player.getCurrentTime();

      // Trigger interruptions for ALL checkpoints (including completed ones)
      // We track which ones we've already shown THIS session in sessionDismissedCheckpoints
      const nextCpIndex = currentTopic.checkpoints.findIndex((cp) =>
        !sessionDismissedCheckpoints.has(cp.id) && currentTime >= cp.time
      );

      if (nextCpIndex !== -1) {
        setCurrentCheckpointIndex(nextCpIndex);
        player.pauseVideo();
        setVideoInterrupted(true);
        clearInterval(progressIntervalRef.current);
      }
    }, 1000);
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    if (phase === 'video') {
      event.target.playVideo();
    }
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1 && !videoInterrupted) {
      startProgressTracker(event.target);
    } else {
      clearInterval(progressIntervalRef.current);
    }

    // event.data === 0 means the video has ended
    if (event.data === 0 && currentTopic) {
      const allCompleted = currentTopic.checkpoints.every(cp => completedCheckpoints.has(cp.id));
      if (allCompleted) {
        setVideoInterrupted(false);
        setPhase('flying');
        // Fix: Use currentTopicIndex to prevent double increments from racing events
        setCurrentTopicIndex(currentTopicIndex + 1);
      }
    }
  };

  const enterFullscreenIDE = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
    }
    setPhase('ide');
  };

  const handleIdeSuccess = () => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log(e));
    }

    const currentCheckpoint = currentTopic.checkpoints[currentCheckpointIndex];

    // Mark as dismissed for this session so we don't interrupt again if they rewind
    setSessionDismissedCheckpoints(prev => new Set([...prev, currentCheckpoint.id]));

    setCompletedCheckpoints(prev => {
      const updated = new Set(prev);
      const wasAlreadyCompleted = updated.has(currentCheckpoint.id);

      updated.add(currentCheckpoint.id);

      // Persist to localStorage so Dashboard can track progress
      localStorage.setItem('orbit_completed_cps', JSON.stringify([...updated]));

      // Check if ALL checkpoints for this topic are now completed
      const allDone = currentTopic.checkpoints.every(cp => updated.has(cp.id));
      const isFinalCheckpoint = currentCheckpointIndex === currentTopic.checkpoints.length - 1;

      if (allDone && isFinalCheckpoint) {
        // We are on the final checkpoint and all are complete → fly to next planet immediately
        setVideoInterrupted(false);
        setPhase('flying');
        // Fix: Use currentTopicIndex to prevent double increments from racing events
        setCurrentTopicIndex(currentTopicIndex + 1);
      } else {
        // More checkpoints remain, OR we are just skipping an early checkpoint
        setPhase('video');
        setVideoInterrupted(false);
        if (playerRef.current) {
          playerRef.current.seekTo(currentCheckpoint.time + 1);
          playerRef.current.playVideo();
        }
      }

      return updated;
    });
  };

  if (isLoading) {
    return <div className="w-screen h-screen bg-black flex items-center justify-center text-cyan-400 font-mono">LOADING CURRICULUM DATA...</div>;
  }

  // Determine if all topics are done
  const isAllTopicsComplete = topics.length > 0 && currentTopicIndex >= topics.length;

  // Check if the current checkpoint has already been completed (for skip button)
  const currentCheckpointCompleted = currentTopic && currentTopic.checkpoints[currentCheckpointIndex]
    ? completedCheckpoints.has(currentTopic.checkpoints[currentCheckpointIndex].id)
    : false;

  return (
    <div className="relative w-screen h-screen overflow-hidden text-white" style={{ background: 'transparent' }}>

      {/* 📱 PORTRAIT BLOCKER 📱 */}
      <div className="force-landscape-overlay">
        <svg className="w-16 h-16 text-cyan-400 mb-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-4">Rotate Device</h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-mono">
          Project Orbit requires a landscape orientation for optimal mission control and terminal access.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 text-cyan-500/50">
          <span className="text-xs tracking-widest uppercase">Rotate to Continue</span>
        </div>
      </div>

      <div className="absolute inset-0 z-[2]">
        <SpaceTimeline
          topics={topics}
          currentTopicIndex={Math.min(currentTopicIndex, topics.length > 0 ? topics.length - 1 : 0)}
          isFlying={phase === 'flying'}
          onNearPlanet={setIsNearPlanet}
        />
      </div>

      {phase === 'flying' && isNearPlanet !== null && (
        <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 flex flex-col items-end gap-3 lg:gap-3">
          {/* DESKTOP UI OVERLAY (Non-clickable, just visual prompt) */}
          <div className="hidden lg:flex items-center gap-4 bg-[#0a192f]/90 border border-cyan-500/50 px-8 py-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md animate-bounce">
            <div className="w-10 h-10 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold font-mono text-xl shrink-0">
              ↵
            </div>
            <span className="text-white font-bold tracking-[0.2em] uppercase text-lg">
              {(() => {
                const targetIndex = isNearPlanet !== null ? isNearPlanet : currentTopicIndex;
                const targetPlanet = topics[targetIndex];
                if (targetIndex >= (topics.length > 0 ? topics.length : 3)) return "Transmission Locked";
                if (targetIndex !== 0 && (!targetPlanet || !targetPlanet.isUnlocked)) return "Planet Locked - Complete Previous";

                const isHoveredPlanetCompleted = targetPlanet?.checkpoints?.length > 0 &&
                  targetPlanet.checkpoints.every(cp => cp && cp.id && completedCheckpoints.has(cp.id));

                if (isHoveredPlanetCompleted) return "Initiate Replay (Enter)";
                return "Initiate Mission (Enter)";
              })()}
            </span>
          </div>

          {/* MOBILE UI TAPPABLE BUTTON (Hidden on Desktop) */}
          <button
            onClick={() => {
              if (isNearPlanet === null || phase !== 'flying') return;
              const targetPlanet = topics[isNearPlanet];
              if (!targetPlanet || targetPlanet.title?.includes("(Soon)") || !targetPlanet.isUnlocked) return;

              setCurrentTopicIndex(isNearPlanet);
              setCurrentCheckpointIndex(0);
              setSessionDismissedCheckpoints(new Set());
              handleArrival();
              setIsNearPlanet(null);
            }}
            className="lg:hidden flex items-center gap-3 bg-[#0a192f]/90 border border-cyan-500/50 px-5 py-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md animate-bounce active:scale-95 transition-transform">
            <div className="w-8 h-8 rounded bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-bold font-mono text-base shrink-0">
              ↵
            </div>
            <span className="text-white font-bold tracking-widest uppercase text-xs">
              {(() => {
                const targetIndex = isNearPlanet !== null ? isNearPlanet : currentTopicIndex;
                const targetPlanet = topics[targetIndex];
                if (targetIndex >= (topics.length > 0 ? topics.length : 3)) return "Transmission Locked";
                if (targetIndex !== 0 && (!targetPlanet || !targetPlanet.isUnlocked)) return "Planet Locked";

                const isHoveredPlanetCompleted = targetPlanet?.checkpoints?.length > 0 &&
                  targetPlanet.checkpoints.every(cp => cp && cp.id && completedCheckpoints.has(cp.id));

                if (isHoveredPlanetCompleted) return "Tap To Replay";
                return "Tap To Initiate";
              })()}
            </span>
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center justify-center w-[160px] lg:w-[200px] gap-2 bg-black/60 border border-white/10 px-3 py-1.5 lg:px-5 lg:py-2 rounded-full backdrop-blur-md active:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <span className="font-mono text-[9px] lg:text-xs tracking-widest">[ ESC ] DASHBOARD</span>
          </button>
        </div>
      )
      }

      {
        phase === 'flying' && isNearPlanet === null && (
          <div className="absolute top-6 left-6 lg:top-10 lg:left-10 z-40 max-w-[80vw]">
            <p className="text-slate-400 font-mono text-[9px] lg:text-sm tracking-widest opacity-60 leading-relaxed lg:leading-normal hidden lg:block">
              HOLD [ W ] TO FLY FORWARD  •  [ S ] TO REVERSE  •  [ ESC ] DASHBOARD
            </p>
            <p className="text-slate-400 font-mono text-[9px] tracking-widest opacity-60 leading-relaxed lg:hidden">
              USE ON-SCREEN CONTROLS TO FLY
            </p>
          </div>
        )
      }

      {/* 📱 MOBILE ON-SCREEN FLYING CONTROLS 📱 */}
      {
        phase === 'flying' && (
          <div className="lg:hidden absolute bottom-6 left-6 z-50 flex items-center gap-3">
            <button
              className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white/70 font-mono font-bold text-lg active:bg-cyan-500/40 active:border-cyan-400 active:text-cyan-100 backdrop-blur-md shadow-lg transition-colors select-none"
              onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' })); }}
              onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' })); }}
              onPointerCancel={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 's' })); }}
            >
              S
            </button>
            <button
              className="w-14 h-14 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white font-mono font-bold text-xl active:bg-cyan-500/40 active:border-cyan-400 active:text-cyan-100 backdrop-blur-md shadow-lg transition-colors select-none"
              onPointerDown={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); }}
              onPointerUp={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })); }}
              onPointerCancel={(e) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' })); }}
            >
              W
            </button>
          </div>
        )
      }

      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 ${(phase === 'video' || phase === 'flying' || phase === 'flying_to_end') ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        <div className="relative w-full h-full overflow-hidden" style={{ background: 'transparent' }}>

          {/* SOLID BLACK FULL SCREEN VIDEO */}
          <div className={`absolute inset-0 ${videoInterrupted || phase !== 'video' ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-black'} transition-opacity duration-300`}>
            {currentTopic && (
              <YouTube
                videoId={currentTopic.videoId}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 0, modestbranding: 1, rel: 0, origin: typeof window !== 'undefined' ? window.location.origin : '' }
                }}
                className="absolute top-0 left-0 w-full h-full"
                iframeClassName="w-full h-full"
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
            )}
          </div>

          {videoInterrupted && phase === 'video' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4 md:p-8 animate-in fade-in duration-500 overflow-y-auto overflow-x-hidden">

              <div className="absolute inset-0 z-0 bg-[#020617]">
                <DeepSpace />
                <ShootingStar />
              </div>

              <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, black 2px, black 4px)' }}></div>

              <div className="relative z-30 flex flex-col items-center pb-8">
                <div className="w-12 h-12 md:w-20 md:h-20 mb-2 md:mb-6 flex items-center justify-center text-cyan-400 relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-pulse border border-cyan-500/30"></div>
                  <Zap className="w-6 h-6 md:w-10 md:h-10 animate-pulse" strokeWidth={1.5} />
                </div>

                <h2 className="text-lg md:text-5xl font-black uppercase tracking-widest md:tracking-[0.2em] mb-1 md:mb-2 text-white shrink-0">
                  Concept <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-400 animate-pulse">Checkpoint</span>
                </h2>
                <h3 className="text-sm md:text-lg font-bold text-amber-400 mb-4 md:mb-10 tracking-widest uppercase px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/20 shrink-0">
                  {currentTopic?.checkpoints[currentCheckpointIndex]?.title}
                </h3>

                <div className="max-w-xs md:max-w-md p-3 md:p-6 glass-box rounded-xl mb-4 md:mb-12 shadow-2xl shrink-0">
                  <p className="text-slate-300 mb-1 md:mb-6 leading-relaxed text-xs md:text-sm">
                    An AI-timed checkpoint has been reached. Video playback is paused until you prove your understanding in the secure terminal.
                  </p>
                </div>

                <button
                  onClick={enterFullscreenIDE}
                  className="group flex items-center gap-2 md:gap-3 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white px-5 py-2.5 md:px-10 md:py-4 rounded font-bold text-xs md:text-lg hover:from-cyan-500 hover:to-indigo-500 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transform hover:scale-105 shrink-0"
                >
                  <Maximize className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform" />
                  INITIATE SECURE TERMINAL
                </button>
              </div>

              {/* Skip button — fixed at bottom-right for already-completed checkpoints */}
              {currentCheckpointCompleted && (
                <button
                  onClick={handleIdeSuccess}
                  className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex items-center gap-2 md:gap-3 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-[10px] md:text-sm tracking-widest md:tracking-wider uppercase transition-all hover:bg-emerald-500/20 hover:border-emerald-400/50 hover:text-emerald-300 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  Skip
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {
        phase === 'ide' && (
          <div className="fixed inset-0 z-[9999] bg-transparent w-screen h-screen flex flex-col pointer-events-auto">
            {/* Explicitly render space background behind the IDE so stars are guaranteed visible */}
            <div className="absolute inset-0 z-[-1] pointer-events-none">
              <DeepSpace />
            </div>

            <div className="w-full h-12 panel-header flex items-center px-5 justify-between shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}
            >
              <span className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                Orbit Secure Terminal <span className="text-white/20 mx-2">│</span> <span className="text-[#04AA6D]/80 font-normal">{currentTopic?.title}</span>
              </span>
            </div>
            <div className="flex-grow relative overflow-hidden flex items-center justify-center">
              {currentTopic && (
                <CodeEditor
                  onComplete={handleIdeSuccess}
                  buttonText="Resume Transmission"
                  checkpointId={currentTopic.checkpoints[currentCheckpointIndex]?.id}
                  questionData={currentTopic.checkpoints[currentCheckpointIndex]}
                  videoId={currentTopic.videoId}
                />
              )}
            </div>
          </div>
        )
      }
      {/* END CARD UI */}
      {
        phase === 'end_card' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center opacity-100 transition-opacity duration-1000 bg-[#020617]/90 backdrop-blur-sm pointer-events-auto">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <DeepSpace />
              <ShootingStar />
            </div>
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl transform scale-100 transition-transform duration-1000">
              <Rocket className="w-24 h-24 text-cyan-400 mb-8 animate-bounce" strokeWidth={1.5} />
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight uppercase">
                Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Accomplished</span>
              </h1>
              <p className="text-xl text-slate-300 mb-10 leading-relaxed font-light">
                You Have Successfully Intercepted All Active Orbital Transmissions.
                Planet Graphs and Further Frontiers are currently under construction.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="group flex items-center gap-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white px-10 py-5 rounded-full font-bold text-xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] transform hover:-translate-y-1 hover:scale-105"
              >
                RETURN TO COMMAND CENTER (DASHBOARD)
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}