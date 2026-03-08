import React, { useState, useRef, useEffect, useContext } from 'react';
import YouTube from 'react-youtube';
import SpaceTimeline from './SpaceTimeline';
import CodeEditor from './CodeEditor';
import { Maximize, Zap } from 'lucide-react';

// 🔥 IMPORTED YOUR DEEP SPACE AND SHOOTING STARS
import DeepSpace from './DeepSpace';
import ShootingStar from './ShootingStar';

import { getCurriculumByDay, getStudentProgress } from '../api';
import { AppContext } from '../context/AppContext';

// 🎵 Ambient space drone using Web Audio API
function useSpaceAmbience(isPlaying) {
  const ctxRef = useRef(null);
  const nodesRef = useRef(null);
  const gainRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      // Create audio context on first play (requires user gesture context)
      if (!ctxRef.current) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
        gainRef.current = masterGain;

        // Layer 1: Deep bass drone (55Hz)
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = 55;
        const bassGain = ctx.createGain();
        bassGain.gain.value = 0.3;
        bass.connect(bassGain);
        bassGain.connect(masterGain);
        bass.start();

        // Layer 2: Mid-range atmospheric hum (110Hz)
        const mid = ctx.createOscillator();
        mid.type = 'triangle';
        mid.frequency.value = 110;
        const midGain = ctx.createGain();
        midGain.gain.value = 0.12;
        mid.connect(midGain);
        midGain.connect(masterGain);
        mid.start();

        // Layer 3: High shimmer with tremolo (330Hz)
        const high = ctx.createOscillator();
        high.type = 'sine';
        high.frequency.value = 330;
        const highGain = ctx.createGain();
        highGain.gain.value = 0.06;
        // Tremolo LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.03;
        lfo.connect(lfoGain);
        lfoGain.connect(highGain.gain);
        lfo.start();
        high.connect(highGain);
        highGain.connect(masterGain);
        high.start();

        nodesRef.current = [bass, mid, high, lfo];
      }

      // Resume and fade in
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      gainRef.current.gain.cancelScheduledValues(ctxRef.current.currentTime);
      gainRef.current.gain.linearRampToValueAtTime(0.15, ctxRef.current.currentTime + 2);
    } else if (gainRef.current && ctxRef.current) {
      // Fade out
      gainRef.current.gain.cancelScheduledValues(ctxRef.current.currentTime);
      gainRef.current.gain.linearRampToValueAtTime(0, ctxRef.current.currentTime + 1.5);
    }
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      nodesRef.current?.forEach(n => { try { n.stop(); } catch (e) { } });
      ctxRef.current?.close();
    };
  }, []);
}

export default function MainWorkspace() {
  const { user } = useContext(AppContext);
  const studentId = user?.email || (JSON.parse(localStorage.getItem('orbit_user')) || {}).email || 'dev@company.com';

  const [topics, setTopics] = useState([]);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const [phase, setPhase] = useState('flying');
  const [videoInterrupted, setVideoInterrupted] = useState(false);
  const [currentCheckpointIndex, setCurrentCheckpointIndex] = useState(0);

  // 🎵 Play ambient drone during spaceship flight
  useSpaceAmbience(phase === 'flying');

  // TEMPORARY FIX: Clear localStorage so stale checkpoint IDs from old curriculum tests don't permanently skip the new ones
  localStorage.removeItem('orbit_completed_cps');

  const [completedCheckpoints, setCompletedCheckpoints] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('orbit_completed_cps') || '[]'));
    } catch {
      return new Set();
    }
  });

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const loadCurriculum = async () => {
      try {
        const progressData = await getStudentProgress(studentId);

        // Filter to only unlocked days, then fetch their curriculum mapping
        const unlockedDays = progressData.days.filter(d => d.is_unlocked);

        const fullTopics = await Promise.all(
          unlockedDays.map(async (day, index) => {
            const data = await getCurriculumByDay(day.day_id).catch(() => null);
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

        setTopics(fullTopics.filter(Boolean));
      } catch (e) {
        console.error("Failed to fetch curriculum", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadCurriculum();

    return () => clearInterval(progressIntervalRef.current);
  }, [studentId]);

  const currentTopic = topics[currentTopicIndex];
  const isCourseComplete = topics.length > 0 && currentTopicIndex >= topics.length;

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

      const nextCpIndex = currentTopic.checkpoints.findIndex((cp) =>
        !completedCheckpoints.has(cp.id) && currentTime >= cp.time
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

    setCompletedCheckpoints(prev => {
      const updated = new Set(prev);
      updated.add(currentCheckpoint.id);
      localStorage.setItem('orbit_completed_cps', JSON.stringify([...updated]));

      const allCompleted = currentTopic.checkpoints.every(cp => updated.has(cp.id));

      if (!allCompleted) {
        setPhase('video');
        setVideoInterrupted(false);
        if (playerRef.current) {
          playerRef.current.seekTo(currentCheckpoint.time + 2);
          playerRef.current.playVideo();
        }
      } else {
        setVideoInterrupted(false);
        setPhase('flying');
        setCurrentTopicIndex(prevTopic => prevTopic + 1);
      }
      return updated;
    });
  };

  if (isLoading) {
    return <div className="w-screen h-screen bg-black flex items-center justify-center text-cyan-400 font-mono">LOADING CURRICULUM DATA...</div>;
  }

  if (isCourseComplete) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center font-sans text-white overflow-hidden relative"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, #0c1829 0%, #060a14 50%, #000000 100%)' }}
      >
        {/* Animated star particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Radial glow behind content */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(4,170,109,0.4) 0%, transparent 70%)' }}
        />

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center text-center px-8">

          {/* Animated check icon with layered rings */}
          <div className="relative w-28 h-28 mb-10 flex items-center justify-center">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full border border-[#04AA6D]/20"
              style={{ animation: 'ringPulse 3s ease-in-out infinite', boxShadow: '0 0 40px rgba(4,170,109,0.15)' }}
            />
            {/* Middle ring */}
            <div className="absolute inset-2 rounded-full border border-[#04AA6D]/30"
              style={{ animation: 'ringPulse 3s ease-in-out infinite 0.5s' }}
            />
            {/* Inner filled circle */}
            <div className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(4,170,109,0.25), rgba(4,170,109,0.08))',
                boxShadow: '0 0 30px rgba(4,170,109,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                border: '1px solid rgba(4,170,109,0.35)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <svg className="w-10 h-10 text-[#04AA6D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 8px rgba(4,170,109,0.5))' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-mont text-5xl md:text-6xl font-black mb-3 tracking-[0.15em] uppercase"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 40%, #04AA6D 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 20px rgba(4,170,109,0.3))'
            }}
          >
            Sector Cleared
          </h1>

          {/* Subtitle */}
          <p className="font-mont text-sm md:text-base font-bold tracking-[0.3em] uppercase mb-2"
            style={{ color: 'rgba(4,170,109,0.7)' }}
          >
            Assessment Successfully Completed
          </p>

          {/* Divider line */}
          <div className="w-40 h-px my-6"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(4,170,109,0.4), transparent)' }}
          />

          {/* Flavor text */}
          <p className="font-mont text-white/40 text-sm max-w-sm mb-10 leading-relaxed font-medium">
            Your technical evaluation has been recorded and verified. You may now return to the learning module.
          </p>

          {/* CTA Button */}
          <button
            onClick={() => window.location.reload()}
            className="font-mont group relative px-10 py-4 rounded-full font-bold text-white text-sm tracking-[0.15em] uppercase transition-all duration-300 hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #04AA6D, #059862)',
              boxShadow: '0 4px 20px rgba(4,170,109,0.3), 0 0 0 1px rgba(4,170,109,0.2)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 40px rgba(4,170,109,0.5), 0 0 0 1px rgba(4,170,109,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 20px rgba(4,170,109,0.3), 0 0 0 1px rgba(4,170,109,0.2)'}
          >
            Return to Base
          </button>
        </div>

        {/* Inline keyframes */}
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.2; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.4); }
          }
          @keyframes ringPulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.08); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }


  return (
    <div className="relative w-screen h-screen overflow-hidden text-white" style={{ background: 'transparent' }}>

      {/* Only show the SpaceTimeline (with planets) when NOT in IDE phase */}
      <div className={`absolute inset-0 z-[2] transition-opacity duration-500 ${phase === 'ide' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <SpaceTimeline
          currentTopicIndex={currentTopicIndex}
          isFlying={phase === 'flying'}
          onArrival={handleArrival}
        />
      </div>

      <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-opacity duration-500 ${phase === 'video' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        <div className="relative w-full h-full overflow-hidden" style={{ background: 'transparent' }}>

          <div className={`absolute inset-0 ${videoInterrupted ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-black'} transition-opacity duration-300`}>
            {currentTopic && (
              <YouTube
                videoId={currentTopic.videoId}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, disablekb: 1, showinfo: 0, origin: typeof window !== 'undefined' ? window.location.origin : '' }
                }}
                className="absolute top-0 left-0 w-full h-full"
                iframeClassName="w-full h-full"
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
              />
            )}
          </div>

          {videoInterrupted && (
            // 🔥 REMOVED THE BLUR, ADDED A SOLID BACKGROUND SO IT HIDES THE SPACESHIP COMPLETELY
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500 overflow-hidden">

              {/* 🔥 ADDED YOUR DEEP SPACE AND SHOOTING STAR HERE */}
              <div className="absolute inset-0 z-0 bg-[#020617]">
                <DeepSpace />
                <ShootingStar />
              </div>

              <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, black 2px, black 4px)' }}></div>

              {/* EVERYTHING ELSE SITS ABOVE THE STARS (z-30) */}
              <div className="relative z-30 flex flex-col items-center">
                <div className="w-20 h-20 mb-6 flex items-center justify-center text-cyan-400 relative">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/10 animate-pulse border border-cyan-500/30"></div>
                  <Zap className="w-10 h-10 animate-pulse" strokeWidth={1.5} />
                </div>

                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-[0.2em] mb-2 text-white">
                  Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-400 animate-pulse">Restricted</span>
                </h2>
                <h3 className="text-lg font-bold text-amber-400 mb-10 tracking-widest uppercase px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/20">
                  {currentTopic?.checkpoints[currentCheckpointIndex]?.title}
                </h3>

                <div className="max-w-md p-6 glass-box rounded-xl mb-12 shadow-2xl">
                  <p className="text-slate-300 mb-6 leading-relaxed text-sm">
                    A security checkpoint has been triggered. Video playback is paused until you successfully complete the required coding assessment in the secure terminal.
                  </p>
                </div>

                <button
                  onClick={enterFullscreenIDE}
                  className="group flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white px-10 py-4 rounded font-bold text-lg hover:from-cyan-500 hover:to-indigo-500 transition-all shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transform hover:scale-105"
                >
                  <Maximize className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                  INITIATE SECURE TERMINAL LINK
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {phase === 'ide' && (
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
      )}
    </div>
  );
}