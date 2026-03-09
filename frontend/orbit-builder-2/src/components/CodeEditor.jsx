import React, { useState, useRef, useEffect, useContext } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal, Lock, Send, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Rocket, Mic, Square, Code2, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { submitStudentCode, requestVivaQuestion, verifyVivaAnswer, askMentorDoubt, getSessionState } from '../api';
import { AppContext } from '../context/AppContext';

// 🔥 Added videoId prop to load the video thumbnail
export default function CodeEditor({ onComplete, requiresViva = true, buttonText = "Initiate Hyperjump", checkpointId = "q1_arrays", questionData, videoId }) {
  const { user } = useContext(AppContext);
  const studentId = user?.email || (JSON.parse(localStorage.getItem('orbit_user')) || {}).email || 'dev@company.com';
  const studentName = user?.name || (JSON.parse(localStorage.getItem('orbit_user')) || {}).name || 'Developer';

  const [code, setCode] = useState(questionData?.template || "// Write your solution here");
  const [attempts, setAttempts] = useState(1);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Sync with AWS DynamoDB so attempts survive page reloads
  useEffect(() => {
    // 1. Reset all local state when a new checkpoint loads!
    setCode(questionData?.template || "// Write your solution here");
    setAttempts(1);
    setCodePassed(false);
    setVivaPassed(false);
    setTerminalLogs([]);
    setCompilerOutput({ type: "idle", message: "You must run your code first" });
    setChatInput("");

    // 2. Fetch remote session state (Commented out so attempts always reset to 1 on UI)
    /* 
    async function fetchSession() {
      try {
        const session = await getSessionState(studentId, checkpointId);
        if (session && session.attempt_count) {
          setAttempts(session.attempt_count);
        }
      } catch (e) {
        console.error("Could not sync session state:", e);
      }
    }
    fetchSession();
    */
  }, [checkpointId, studentId, questionData]);

  const [compilerOutput, setCompilerOutput] = useState({ type: "idle", message: "You must run your code first" });

  const [codePassed, setCodePassed] = useState(false);
  const [vivaPassed, setVivaPassed] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([]);
  const chatEndRef = useRef(null);

  const [languagePref, setLanguagePref] = useState("hinglish");

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const wantsRecordingRef = useRef(false);  // tracks user intent separately

  const [isBlurred, setIsBlurred] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  useEffect(() => {
    // Blur window when it loses focus to prevent snipping tools
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    // Intercept keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        try { navigator.clipboard.writeText(''); } catch (err) { }
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'p', 'C', 'V', 'X', 'P'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Intercept copy/paste events at window level (capture phase)
    const preventClipboard = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Disable right click context menu to prevent easy copying
    const preventContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('copy', preventClipboard, true);
    window.addEventListener('paste', preventClipboard, true);
    window.addEventListener('cut', preventClipboard, true);
    window.addEventListener('contextmenu', preventContextMenu, true);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('copy', preventClipboard, true);
      window.removeEventListener('paste', preventClipboard, true);
      window.removeEventListener('cut', preventClipboard, true);
      window.removeEventListener('contextmenu', preventContextMenu, true);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setChatInput(currentTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        if (event.error === 'network' || event.error === 'not-allowed') {
          alert("Microphone access blocked. Please allow microphone permissions in your browser settings.");
          wantsRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      recognitionRef.current.onend = () => {
        if (wantsRecordingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            wantsRecordingRef.current = false;
            setIsRecording(false);
          }
          return;
        }
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      wantsRecordingRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setChatInput('');
      try {
        wantsRecordingRef.current = true;
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (err) {
        wantsRecordingRef.current = false;
        setIsRecording(false);
      }
    }
  };

  const handleCodeSubmit = async () => {
    setIsEvaluating(true);
    setCompilerOutput({ type: "loading", message: "Evaluating with AWS Lambda..." });

    try {
      const result = await submitStudentCode({
        student_id: studentId,
        student_name: studentName,
        checkpoint_id: checkpointId,
        user_code: code,
        language_preference: languagePref
      });

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (result.is_correct) {
        setCompilerOutput({ type: "success", message: "✦ Compilation Successful. Refer to the Secure Terminal for your assessment." });

        // Code Passed logic
        setCodePassed(true);

        const personaSender = result.persona_used === "mentor" ? "MENTOR" : "STRICT DIDI";
        const logColor = result.persona_used === "mentor" ? "mentor" : "success";

        addLog(personaSender, result.feedback_text, logColor);

        if (requiresViva) {
          addLog("SYSTEM", "All Protocols Verified. System Override Successful.", "success");
          addLog("SYSTEM", "Fetching Secure Viva Question...", "loading");

          const vivaRes = await requestVivaQuestion(studentId, checkpointId, code, languagePref);
          addLog("VIVA_SYSTEM", `VIVA LOCK ACTIVATED: ${vivaRes.viva_question}`, "viva");
        } else {
          // Mid-video checkpoint
          setVivaPassed(true);
          addLog("SYSTEM", "Mid-Point Checkpoint Cleared. No Viva required.", "success");
        }
      } else {
        if (result.persona_used === "mentor") {
          setCompilerOutput({
            type: "error",
            message: "Compilation Failed. Incoming transmission from Mentor AI in the Secure Terminal..."
          });
          addLog("MENTOR", result.feedback_text, "mentor");
        } else {
          setCompilerOutput({
            type: "error",
            message: result.feedback_text
          });
        }
      }
    } catch (error) {
      console.error(error);
      setCompilerOutput({ type: "error", message: "Failed to connect to AWS Backend." });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    addLog("USER", userMessage, "user");

    if (codePassed && !vivaPassed) {
      // Viva Verification
      try {
        const result = await verifyVivaAnswer({
          student_id: studentId,
          student_name: studentName,
          checkpoint_id: checkpointId,
          transcribed_text: userMessage,
          language_preference: languagePref
        });
        if (result.viva_passed) {
          setVivaPassed(true);
          addLog("SYSTEM", result.feedback_text + "\nViva Verified. Clearance Granted.", "success");
        } else {
          addLog("VIVA_SYSTEM", result.feedback_text, "viva");
        }
      } catch (err) {
        console.error("VIVA ERROR FULL DETAILS:", err);
        addLog("SYSTEM", `Error verifying Viva Answer: ${err.message}`, "error");
      }
    } else {
      // Mentor Doubt Routing
      try {
        const result = await askMentorDoubt({
          student_id: studentId,
          student_name: studentName,
          checkpoint_id: checkpointId,
          question: userMessage,
          language_preference: languagePref
        });
        addLog("MENTOR", result.answer, "mentor");
      } catch (err) {
        addLog("MENTOR", "Mentor AI connection lost.", "error");
      }
    }
  };

  const addLog = (sender, message, type) => {
    setTerminalLogs(prev => [...prev, { id: Date.now(), sender, message, type }]);
  };

  const isTrapState = attempts <= 1 && !codePassed;
  const isStrictState = attempts > 1 && attempts < 4 && !codePassed;
  const isMentorState = attempts >= 4 && !codePassed;

  // 🔥 Only show the pulsing lock if Viva is actually required
  const isVivaState = codePassed && !vivaPassed && requiresViva;


  return (
    <div className="w-full h-full bg-transparent p-3 font-sans flex flex-col overflow-hidden text-white relative select-none">

      {/* Anti-Screenshot / Overlay when window loses focus */}
      <AnimatePresence>
        {isBlurred && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0 }}
            className="absolute inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none"
          >
            <ShieldAlert className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
            <h2 className="text-3xl font-extrabold text-red-500 tracking-widest text-center uppercase bg-black/50 py-2 px-6 rounded-lg border border-red-500/30">
              Security Protocol Engaged
            </h2>
            <p className="text-gray-300 mt-4 text-center tracking-[0.2em] font-mono text-sm uppercase">
              Window focus lost. Content obscured.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full h-full flex flex-col transition-all ${isBlurred ? 'duration-0 blur-xl grayscale pointer-events-none opacity-20' : 'duration-300'}`}>

        <PanelGroup direction="horizontal" className="flex-grow relative z-[1]">

          {/* ================= LEFT PANEL ================= */}
          <Panel defaultSize={25} minSize={15} className="flex flex-col glass-panel rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-2 md:px-4 md:py-3 panel-header shrink-0 text-xs md:text-sm font-semibold text-white rounded-t-2xl">
              <ListTodo className="w-3 h-3 md:w-4 md:h-4 text-[#04AA6D]" /> Mission Briefing
            </div>

            <div className="p-2 md:p-4 border-b border-white/5 shrink-0 bg-[#0d1117]/60">
              <div className="relative w-full aspect-video bg-[#000000] rounded-xl overflow-hidden border border-white/5 shadow-lg group">
                <img src={videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=800"} alt="Video Thumbnail" className="w-full h-full object-cover opacity-40 blur-[1px] mix-blend-screen" />
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#15202B]/80">
                  <Lock className="w-6 h-6 text-[#F44336] mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F44336]">Transmission Paused</span>
                </div>
              </div>
            </div>

            <div className="p-3 md:p-5 flex-grow overflow-y-auto">
              <h2 className="text-sm md:text-xl font-bold text-white mb-2 md:mb-4">{questionData?.title}</h2>
              <p className="text-[#A0AAB2] leading-relaxed text-xs md:text-sm mb-4 md:mb-6">{questionData?.description}</p>

              <p className="text-white font-semibold text-xs md:text-sm mb-2">Constraints:</p>
              <ul className="text-[10px] md:text-sm font-mono text-[#A0AAB2] space-y-1 md:space-y-2 list-disc pl-4 bg-[#0d1117]/60 p-2 md:p-4 rounded-xl border border-white/5">
                <li>Time Complexity: O(1)</li>
                <li>Space Complexity: O(1)</li>
              </ul>
            </div>
          </Panel>

          <PanelResizeHandle className="w-2 resize-handle cursor-col-resize rounded-full mx-0.5" />

          {/* ================= MIDDLE PANEL ================= */}
          <Panel defaultSize={50} minSize={30} className="flex flex-col bg-transparent gap-2">
            <PanelGroup direction="vertical">

              <Panel defaultSize={70} minSize={30} className="flex flex-col relative glass-panel rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-2 py-1.5 md:px-4 md:py-2.5 panel-header shrink-0 rounded-t-2xl">
                  <div className="flex items-center gap-2 md:gap-4">
                    <div className="flex items-center gap-1.5 md:gap-2 text-white text-[10px] md:text-sm font-semibold hidden sm:flex">
                      <Rocket className="w-3 h-3 md:w-4 md:h-4 text-[#04AA6D]" /> Command
                    </div>
                    <select
                      value={languagePref}
                      onChange={(e) => setLanguagePref(e.target.value)}
                      className="bg-[#0d1117]/80 text-[10px] md:text-xs text-[#A0AAB2] border border-white/8 rounded-lg px-1.5 py-1 md:px-2.5 md:py-1.5 outline-none focus:border-[#04AA6D] cursor-pointer transition-colors"
                    >
                      <option value="english">English AI</option>
                      <option value="hinglish">Hinglish AI</option>
                    </select>
                  </div>
                  {!codePassed ? (
                    <button
                      onClick={handleCodeSubmit}
                      disabled={isEvaluating}
                      className="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-5 md:py-2 btn-glow text-white text-[10px] md:text-sm font-semibold rounded-xl"
                    >
                      {isEvaluating ? 'Evaluating...' : 'Run >'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 md:gap-2 text-[#04AA6D] font-bold text-[10px] md:text-sm">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> Accepted
                    </span>
                  )}
                </div>

                <div className="flex-grow relative code-area">
                  <Editor
                    height="100%"
                    defaultLanguage="java"
                    theme="vs-dark"
                    value={code}
                    onChange={setCode}
                    options={{ minimap: { enabled: false }, fontSize: 15, readOnly: codePassed, padding: { top: 16 } }}
                  />
                  <AnimatePresence>
                    {codePassed && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-[#1D2A35]/40 backdrop-blur-[1px] pointer-events-none"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </Panel>

              <PanelResizeHandle className="h-2 resize-handle cursor-row-resize rounded-full my-0.5" />

              <Panel defaultSize={30} minSize={15} className="flex flex-col glass-panel rounded-2xl overflow-hidden">
                <div className="px-2 py-1.5 md:px-4 md:py-2.5 panel-header flex items-center gap-2 text-[10px] md:text-sm font-semibold text-white rounded-t-2xl">
                  <Terminal className="w-3 h-3 md:w-4 md:h-4 text-[#04AA6D]" /> Telemetry Data
                </div>
                <div className="flex-grow p-2 md:p-4 overflow-y-auto font-mono text-[10px] md:text-sm whitespace-pre-wrap terminal-area rounded-b-2xl">
                  {compilerOutput.type === "loading" && <span className="text-[#A0AAB2] animate-pulse">{compilerOutput.message}</span>}
                  {compilerOutput.type === "idle" && <span className="text-[#A0AAB2]">{compilerOutput.message}</span>}
                  {compilerOutput.type === "success" && <span className="text-[#04AA6D] font-bold">{compilerOutput.message}</span>}
                  {compilerOutput.type === "error" && <span className="text-[#F44336] font-bold">{compilerOutput.message}</span>}
                </div>
              </Panel>

            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-2 resize-handle cursor-col-resize rounded-full mx-0.5" />

          {/* ================= RIGHT PANEL ================= */}
          <Panel defaultSize={25} minSize={20} className="flex flex-col glass-panel rounded-2xl overflow-hidden">
            <div className={`px-2 py-2 md:px-4 md:py-3 flex items-center gap-1.5 md:gap-2 shrink-0 rounded-t-2xl ${codePassed && requiresViva && !vivaPassed ? 'viva-header' : isMentorState ? 'mentor-header' : 'panel-header'}`}>
              {isTrapState && <ShieldAlert className="w-3 h-3 md:w-4 md:h-4 text-[#A0AAB2]" />}
              {isStrictState && <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-[#FFEB3B]" />}
              {isMentorState && <Cpu className="w-3 h-3 md:w-4 md:h-4 text-[#06B6D4]" />}
              {isVivaState && <Lock className="w-3 h-3 md:w-4 md:h-4 text-[#8B5CF6] status-pulse" />}
              {vivaPassed && <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-[#04AA6D]" />}

              <h3 className={`font-semibold text-[10px] md:text-sm ${codePassed && requiresViva && !vivaPassed ? 'text-[#A78BFA]' : vivaPassed ? 'text-[#04AA6D]' : isMentorState ? 'text-[#67E8F9]' : 'text-white'}`}>
                <span className="hidden sm:inline">
                  {isTrapState && "System Status"}
                  {isStrictState && "Syntax Analysis"}
                  {isMentorState && "Mentor AI Active"}
                  {isVivaState && "Viva Lock Activated"}
                  {vivaPassed && "Sector Cleared"}
                </span>
                <span className="sm:hidden">
                  {isVivaState ? "Locked" : vivaPassed ? "Cleared" : "Status"}
                </span>
              </h3>

              <div className="ml-auto text-[9px] md:text-xs font-mono attempt-badge px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-lg text-white/80">
                Attempt {attempts}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 terminal-area">
              {terminalLogs.length === 0 && (
                <p className="text-[#A0AAB2] font-mono text-[10px] md:text-sm text-center mt-6 md:mt-10">Awaiting code submission...</p>
              )}

              {terminalLogs.map((log) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
                  key={log.id}
                  className={`chat-bubble p-3.5 text-sm ${log.type === 'error' ? 'bg-[#F44336]/10 border border-[#F44336]/20 text-[#F44336]' :
                    log.type === 'mentor' ? 'mentor-bubble text-[#CCFBF1]' :
                      log.type === 'viva' ? 'viva-bubble text-[#DDD6FE]' :
                        log.type === 'success' ? 'bg-[#04AA6D]/8 border border-[#04AA6D]/20 text-[#04AA6D]' :
                          'bg-white/3 border border-white/5 text-[#A0AAB2] ml-6'
                    }`}
                >
                  <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-1 font-bold">
                    {log.sender}
                  </span>
                  {log.type === 'mentor' || log.type === 'success' || log.type === 'viva' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />,
                        h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2 text-white" {...props} />,
                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1 text-white" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                        a: ({ node, ...props }) => <a className="text-[#04AA6D] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        code: ({ node, inline, className, children, ...props }) => {
                          return !inline ? (
                            <pre className="bg-[#0d1117] p-3 rounded-xl overflow-x-auto border border-white/5 my-2 text-xs font-mono text-white/90 shadow-inner">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-[#1D2A35]/60 px-1.5 py-0.5 rounded-md text-[#04AA6D] font-mono text-xs border border-white/8" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {log.message}
                    </ReactMarkdown>
                  ) : (
                    <span className="whitespace-pre-wrap">{log.message}</span>
                  )}
                </motion.div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-2 md:p-3 panel-header border-t border-white/5 shrink-0 rounded-b-2xl">
              {vivaPassed ? (
                <button
                  onClick={onComplete}
                  className="w-full flex justify-center items-center gap-2 py-2 md:py-3 btn-glow text-white font-bold rounded-xl text-sm"
                >
                  <Rocket className="w-4 h-4 md:w-5 md:h-5" /> {buttonText}
                </button>
              ) : (isMentorState || isVivaState) ? (
                <form onSubmit={handleChatSubmit} className="relative flex items-center chat-input-wrap rounded-2xl px-3">

                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={isVivaState ? "Speak your Viva answer..." : "Ask anything"}
                    className="flex-grow bg-transparent py-2.5 pl-2 pr-2 text-sm text-white focus:outline-none placeholder-[#A0AAB2]"
                  />

                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-[#F44336] text-white status-pulse' : 'text-[#A0AAB2] hover:text-white hover:bg-white/8'}`}
                    title="Use Microphone"
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    className={`p-2 rounded-xl ml-1 transition-all ${chatInput.trim() ? 'bg-[#04AA6D] text-white shadow-md shadow-[#04AA6D]/25' : 'bg-white/5 text-[#A0AAB2] cursor-not-allowed'}`}
                    disabled={!chatInput.trim()}
                    title="Send Message"
                  >
                    <Send className="w-4 h-4 ml-[-1px] mt-[1px]" />
                  </button>
                </form>
              ) : (
                <div className="py-2.5 text-center text-xs font-semibold text-[#A0AAB2] terminal-locked rounded-xl">
                  Terminal Locked. Run code first.
                </div>
              )}
            </div>
          </Panel>

        </PanelGroup>
      </div>
    </div>
  );
}