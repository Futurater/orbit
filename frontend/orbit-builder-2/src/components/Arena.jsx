import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import YouTube from 'react-youtube';
import Editor from '@monaco-editor/react';
import {
  Play, Pause, ArrowLeft, CheckCircle2, Lock, Unlock, Mic, Square,
  Send, RefreshCw, AlertTriangle, Terminal, BookOpen, ArrowRight,
  Code2, MessageSquare, Video
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getCourseDetails, submitStudentCode, requestVivaQuestion,
  verifyVivaAnswer, askMentorDoubt
} from '../api';
import { Spinner, useUI } from './ui';

export default function Arena() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useUI();
  const courseId = searchParams.get('courseId');

  const [course, setCourse] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentCpIndex, setCurrentCpIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Mobile active tab: 'video' | 'code' | 'chat'
  const [activeTab, setActiveTab] = useState('code');

  // Video State
  const playerRef = useRef(null);
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [passedCheckpoints, setPassedCheckpoints] = useState(new Set());
  const trackerIntervalRef = useRef(null);

  // Editor & Terminal State
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(1);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [codePassed, setCodePassed] = useState(false);
  const [vivaPassed, setVivaPassed] = useState(false);
  const [currentVivaQuestion, setCurrentVivaQuestion] = useState(null);

  // Chat & Speech State
  const [chatInput, setChatInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [languagePref, setLanguagePref] = useState('hinglish');
  const recognitionRef = useRef(null);

  // Load Course and Checkpoints
  useEffect(() => {
    const loadArena = async () => {
      try {
        setLoading(true);
        let activeCourse = null;
        let cps = [];

        if (courseId) {
          const res = await getCourseDetails(courseId);
          activeCourse = res.course;
          cps = res.checkpoints || [];
          const completedSet = new Set();
          if (res.sessions) {
            Object.values(res.sessions).forEach((s) => {
              if (s.vivaStatus === 'COMPLETED') completedSet.add(s.checkpointId);
            });
          }
          setPassedCheckpoints(completedSet);
        } else {
          activeCourse = {
            title: 'Arrays & Control Flow | Lecture Demo',
            videoIds: ['NTHVTY6w2Co'],
          };
          cps = [
            {
              checkpointId: 'cp_01_array_iteration',
              timestampSeconds: 594,
              topic: 'Array Declaration & Loops',
              contextSummary: 'The instructor explained basic array iteration. Declare an array prices with 3 values {250, 400, 150} and print them.',
              starterCode: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: Declare prices array {250, 400, 150}\n        // TODO: Print each element in loop\n        \n    }\n}',
              expectedConcept: 'Declare prices array and loop with prices[i]',
              requiresViva: true,
            },
            {
              checkpointId: 'cp_02_array_input',
              timestampSeconds: 1206,
              topic: 'Array Input with Scanner',
              contextSummary: 'Use Scanner to read 3 integers into studentScores array dynamically.',
              starterCode: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int[] studentScores = new int[3];\n        // TODO: Read 3 integers\n        \n    }\n}',
              expectedConcept: 'studentScores[i] = sc.nextInt()',
              requiresViva: true,
            },
          ];
        }

        setCourse(activeCourse);
        setCheckpoints(cps);

        if (cps.length > 0) {
          setCode(cps[0].starterCode || '// Write code here');
        }
      } catch (err) {
        console.error('[Arena Load Error]:', err);
        toast('Failed to load course arena', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadArena();

    return () => {
      if (trackerIntervalRef.current) clearInterval(trackerIntervalRef.current);
    };
  }, [courseId]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (e) => {
        let transcript = '';
        for (let i = 0; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setChatInput(transcript);
      };

      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  }, []);

  // Update starter code when checkpoint changes
  useEffect(() => {
    const currentCp = checkpoints[currentCpIndex];
    if (currentCp) {
      setCode(currentCp.starterCode || '// Write code here');
      setCodePassed(passedCheckpoints.has(currentCp.checkpointId));
      setVivaPassed(passedCheckpoints.has(currentCp.checkpointId));
      setTerminalLogs([]);
    }
  }, [currentCpIndex, checkpoints]);

  // Video Tracker: Second-by-second checkpoint interruption
  const startTracker = (player) => {
    if (trackerIntervalRef.current) clearInterval(trackerIntervalRef.current);

    trackerIntervalRef.current = setInterval(() => {
      if (!player || isInterrupted) return;
      const currentTime = player.getCurrentTime();

      const currentCp = checkpoints[currentCpIndex];
      if (currentCp && !passedCheckpoints.has(currentCp.checkpointId) && currentTime >= currentCp.timestampSeconds) {
        player.pauseVideo();
        setIsInterrupted(true);
        setActiveTab('code');
        clearInterval(trackerIntervalRef.current);
        addLog('SYSTEM', `ACTIVE INTERCEPTION TRIGGERED at ${currentCp.timestampSeconds}s. Solve checkpoint challenge to unlock video playback.`, 'system');
      }
    }, 1000);
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    startTracker(event.target);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1 && !isInterrupted) {
      startTracker(event.target);
    } else {
      clearInterval(trackerIntervalRef.current);
    }
  };

  const addLog = (sender, message, type) => {
    setTerminalLogs((prev) => [...prev, { id: Date.now() + Math.random(), sender, message, type }]);
  };

  // Run Code Submission
  const handleRunCode = async () => {
    const currentCp = checkpoints[currentCpIndex];
    if (!currentCp) return;

    setIsEvaluating(true);
    addLog('SYSTEM', 'Evaluating code solution against checkpoint rubrics...', 'loading');

    try {
      const res = await submitStudentCode({
        checkpoint_id: currentCp.checkpointId,
        user_code: code,
        language_preference: languagePref,
      });

      setAttempts(res.attempt_count || attempts + 1);

      if (res.is_correct) {
        setCodePassed(true);
        addLog(res.persona_used === 'mentor' ? 'MENTOR' : 'STRICT DIDI', res.feedback_text, 'success');

        if (currentCp.requiresViva) {
          addLog('SYSTEM', 'Code accepted! Activating oral viva conceptual verification...', 'system');
          const vivaRes = await requestVivaQuestion(currentCp.checkpointId);
          setCurrentVivaQuestion(vivaRes.viva_question);
          addLog('VIVA EXAMINER', `VIVA QUESTION: ${vivaRes.viva_question}`, 'viva');
        } else {
          setVivaPassed(true);
          handlePassCheckpoint(currentCp.checkpointId);
        }
      } else {
        if (res.persona_used === 'mentor') {
          addLog('MENTOR', res.feedback_text, 'mentor');
          if (res.mermaid_diagram) {
            addLog('MENTOR', `\`\`\`mermaid\n${res.mermaid_diagram}\n\`\`\``, 'mermaid');
          }
        } else {
          addLog('STRICT DIDI', res.feedback_text, 'error');
        }
      }
    } catch (err) {
      addLog('SYSTEM', `Evaluation error: ${err.message}`, 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit Viva Response or Mentor Doubt
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput.trim();
    setChatInput('');
    addLog('YOU', msg, 'user');

    const currentCp = checkpoints[currentCpIndex];
    if (!currentCp) return;

    if (codePassed && !vivaPassed) {
      try {
        const res = await verifyVivaAnswer({
          checkpoint_id: currentCp.checkpointId,
          transcribed_text: msg,
          language_preference: languagePref,
        });

        if (res.viva_passed) {
          setVivaPassed(true);
          addLog('VIVA EXAMINER', `PASSED! ${res.feedback_text}`, 'success');
          handlePassCheckpoint(currentCp.checkpointId);
        } else {
          addLog('VIVA EXAMINER', `NOT YET: ${res.feedback_text}`, 'viva');
        }
      } catch (err) {
        addLog('SYSTEM', `Viva verification failed: ${err.message}`, 'error');
      }
    } else {
      try {
        const res = await askMentorDoubt({
          question: msg,
          checkpoint_id: currentCp.checkpointId,
          video_id: currentCp.videoId || course?.videoIds?.[0],
        });
        addLog('MENTOR', res.answer, 'mentor');
      } catch (err) {
        addLog('SYSTEM', `Could not get answer: ${err.message}`, 'error');
      }
    }
  };

  const handlePassCheckpoint = (cpId) => {
    setPassedCheckpoints((prev) => new Set([...prev, cpId]));
    toast('Checkpoint mastered! Video unblocked.', 'success');
  };

  const handleResumeVideo = () => {
    setIsInterrupted(false);
    if (playerRef.current) {
      playerRef.current.playVideo();
      startTracker(playerRef.current);
    }

    if (currentCpIndex < checkpoints.length - 1) {
      setCurrentCpIndex(currentCpIndex + 1);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      toast('Speech recognition not available. Please type your answer.', 'info');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setChatInput('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const currentCp = checkpoints[currentCpIndex];
  const videoId = currentCp?.videoId || course?.videoIds?.[0] || 'NTHVTY6w2Co';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdf0d5] flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8 text-[#003049]" />
        <span className="font-semibold text-sm text-[#003049]">Loading Arena workspace...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#fdf0d5] text-[#003049] flex flex-col overflow-hidden">
      {/* ── TOP NAV BAR ── */}
      <header className="h-14 border-b border-[rgba(0,48,73,0.14)] px-4 flex items-center justify-between bg-white shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="btn btn-ghost btn-sm text-xs font-semibold gap-1 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <span className="text-[rgba(0,48,73,0.2)]">|</span>
          <span className="text-sm font-bold text-[#003049] truncate max-w-xs md:max-w-md">
            {course?.title || 'Interactive Course Arena'}
          </span>
        </div>

        {/* Checkpoint Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {checkpoints.map((cp, idx) => {
            const isCleared = passedCheckpoints.has(cp.checkpointId);
            const isCurrent = idx === currentCpIndex;
            return (
              <button
                key={cp.checkpointId}
                onClick={() => setCurrentCpIndex(idx)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1 shrink-0 ${
                  isCurrent
                    ? 'bg-[#003049] text-[#fdf0d5]'
                    : isCleared
                    ? 'bg-[#669bbc]/20 text-[#003049]'
                    : 'bg-[#003049]/5 text-[#003049]/70 hover:bg-[#003049]/10'
                }`}
              >
                {isCleared ? (
                  <CheckCircle2 className="w-3 h-3 text-[#669bbc]" />
                ) : (
                  <Lock className="w-3 h-3 text-[#c1121f]" />
                )}
                <span>CP {idx + 1}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── MOBILE TAB SWITCHER (< lg) ── */}
      <div className="lg:hidden flex items-center border-b border-[rgba(0,48,73,0.12)] bg-white shrink-0">
        <button
          onClick={() => setActiveTab('video')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === 'video'
              ? 'border-[#003049] text-[#003049]'
              : 'border-transparent text-[#003049]/60'
          }`}
        >
          <Video className="w-3.5 h-3.5" /> Video {isInterrupted && '• Interrupted'}
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === 'code'
              ? 'border-[#003049] text-[#003049]'
              : 'border-transparent text-[#003049]/60'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Code Solution
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
            activeTab === 'chat'
              ? 'border-[#003049] text-[#003049]'
              : 'border-transparent text-[#003049]/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> AI Mentor
        </button>
      </div>

      {/* ── SPLIT WORKSPACE ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* LEFT: YOUTUBE VIDEO PLAYER */}
        <div
          className={`flex flex-col bg-black border-r border-[rgba(0,48,73,0.14)] relative overflow-hidden ${
            activeTab !== 'video' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="relative flex-1 flex items-center justify-center">
            <YouTube
              videoId={videoId}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: 1,
                  controls: 1,
                  modestbranding: 1,
                },
              }}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              className="w-full h-full aspect-video"
            />

            {/* Interception Overlay */}
            {isInterrupted && (
              <div className="absolute inset-0 bg-[#003049]/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <div className="p-6 rounded-2xl bg-white border border-[rgba(0,48,73,0.2)] shadow-xl max-w-sm w-full space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#780000] text-[#fdf0d5] flex items-center justify-center mx-auto">
                    <Lock className="w-5 h-5" />
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#c1121f] block">
                      Active Interception Barrier
                    </span>
                    <h3 className="text-lg font-bold text-[#003049] mt-0.5">
                      Checkpoint {currentCpIndex + 1}: {currentCp?.topic}
                    </h3>
                  </div>

                  <p className="text-xs text-[#003049]/70 leading-relaxed">
                    {currentCp?.contextSummary}
                  </p>

                  <div className="pt-2">
                    {vivaPassed ? (
                      <button
                        onClick={handleResumeVideo}
                        className="btn btn-primary w-full"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Resume Video Playback</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-[#003049]/80 bg-[#fff8ea] p-2.5 rounded-lg border border-[rgba(0,48,73,0.12)]">
                          Solve the checkpoint challenge in the editor to unlock playback.
                        </div>
                        <button
                          onClick={() => setActiveTab('code')}
                          className="btn btn-sm btn-accent w-full lg:hidden"
                        >
                          Switch to Code Editor →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Metadata Footer */}
          <div className="p-3 bg-[#fff8ea] border-t border-[rgba(0,48,73,0.1)] flex items-center justify-between text-xs font-semibold text-[#003049]">
            <span className="truncate max-w-md">{currentCp?.topic}</span>
            <span className="chip chip-navy text-[10px]">
              Barrier: {currentCp?.timestampSeconds}s
            </span>
          </div>
        </div>

        {/* RIGHT: MONACO IDE & AI CHAT CHANNEL */}
        <div
          className={`flex flex-col bg-white overflow-hidden ${
            activeTab === 'video' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top IDE Actions Bar */}
          <div className="h-11 px-4 border-b border-[rgba(0,48,73,0.1)] flex items-center justify-between bg-[#fffaf0] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#003049]">Solution Editor</span>
              <select
                value={languagePref}
                onChange={(e) => setLanguagePref(e.target.value)}
                className="bg-white border border-[rgba(0,48,73,0.2)] rounded-md px-2 py-0.5 text-xs font-medium text-[#003049]"
              >
                <option value="hinglish">Hinglish Mentor</option>
                <option value="english">English Mentor</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#003049]/60 font-mono">Attempt #{attempts}</span>
              <button
                onClick={handleRunCode}
                disabled={isEvaluating}
                className="btn btn-primary btn-sm h-7 text-xs"
              >
                {isEvaluating ? (
                  <>
                    <Spinner /> Evaluating
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" /> Run Solution
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Pane */}
          <div
            className={`h-[52%] border-b border-[rgba(0,48,73,0.1)] relative ${
              activeTab === 'chat' ? 'hidden lg:block' : 'block'
            }`}
          >
            <Editor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={code}
              onChange={setCode}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                padding: { top: 10 },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
              }}
            />
          </div>

          {/* AI Terminal & Viva Discussion Pane */}
          <div
            className={`flex-1 flex flex-col bg-[#fffaf0] overflow-hidden ${
              activeTab === 'code' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Terminal Header */}
            <div className="px-3 py-1.5 border-b border-[rgba(0,48,73,0.08)] flex items-center justify-between text-xs font-semibold bg-white shrink-0">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#780000]" />
                <span className="text-[#003049]">
                  {codePassed && !vivaPassed
                    ? 'Oral Viva Assessment'
                    : attempts >= 3
                    ? 'Mentor Guidance Channel'
                    : 'Strict Didi Evaluator'}
                </span>
              </div>
              <span className={`chip text-[10px] ${codePassed ? 'chip-navy' : ''}`}>
                {codePassed ? (vivaPassed ? 'Passed' : 'In Viva Oral') : 'Awaiting Run'}
              </span>
            </div>

            {/* Terminal Message Stream */}
            <div className="flex-1 p-3 overflow-y-auto text-xs space-y-2.5">
              {terminalLogs.length === 0 ? (
                <div className="text-[#003049]/50 text-center py-6">
                  Submit your code solution to receive feedback from Strict Didi or Mentor AI.
                </div>
              ) : (
                terminalLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      log.type === 'error'
                        ? 'bg-red-50 border-[#c1121f]/30 text-[#780000]'
                        : log.type === 'mentor'
                        ? 'bg-sky-50 border-[#669bbc]/40 text-[#003049]'
                        : log.type === 'viva'
                        ? 'bg-indigo-50 border-indigo-200 text-[#003049]'
                        : log.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-[#003049]'
                        : log.type === 'user'
                        ? 'bg-white border-[rgba(0,48,73,0.15)] text-[#003049] ml-4'
                        : 'bg-white border-[rgba(0,48,73,0.1)] text-[#003049]'
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-70">
                      {log.sender}
                    </span>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{log.message}</ReactMarkdown>
                  </div>
                ))
              )}
            </div>

            {/* Input / Voice Viva Bar */}
            <form onSubmit={handleChatSubmit} className="p-2.5 bg-white border-t border-[rgba(0,48,73,0.1)] flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={codePassed && !vivaPassed ? 'Speak or type viva oral answer...' : 'Ask Mentor AI a doubt...'}
                className="input h-9 text-xs flex-1"
              />

              <button
                type="button"
                onClick={toggleMic}
                title="Microphone for oral viva"
                className={`btn btn-icon h-9 w-9 shrink-0 ${
                  isRecording ? 'btn-accent animate-pulse' : 'btn-ghost'
                }`}
              >
                {isRecording ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="btn btn-primary btn-sm h-9 px-3 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
