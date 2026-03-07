import React, { useState, useRef, useEffect, useContext } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal, Lock, Send, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Rocket, Mic, Square, Code2, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { submitStudentCode, requestVivaQuestion, verifyVivaAnswer, askMentorDoubt, getSessionState } from '../api';
import { AppContext } from '../context/AppContext';

// 🔥 Added props to control if this checkpoint needs a Viva and what the button should say
export default function CodeEditor({ onComplete, requiresViva = true, buttonText = "Initiate Hyperjump", checkpointId = "q1_arrays", questionData }) {
  const { user } = useContext(AppContext);
  const studentId = user?.email || (JSON.parse(localStorage.getItem('orbit_user')) || {}).email || 'dev@company.com';
  const studentName = user?.name || (JSON.parse(localStorage.getItem('orbit_user')) || {}).name || 'Developer';

  const [code, setCode] = useState(questionData?.template || "// Write your solution here");
  const [attempts, setAttempts] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Sync with AWS DynamoDB so attempts survive page reloads
  useEffect(() => {
    // 1. Reset all local state when a new checkpoint loads!
    setCode(questionData?.template || "// Write your solution here");
    setAttempts(0);
    setCodePassed(false);
    setVivaPassed(false);
    setTerminalLogs([]);
    setCompilerOutput({ type: "idle", message: "You must run your code first" });
    setChatInput("");

    // 2. Fetch remote session state
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

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
        setCompilerOutput({ type: "success", message: "Compilation Successful. Refer to the Secure Terminal for your assessment." });

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

  const isTrapState = attempts === 0 && !codePassed;
  const isStrictState = attempts > 0 && attempts < 3 && !codePassed;
  const isMentorState = attempts >= 3 && !codePassed;

  // 🔥 Only show the pulsing lock if Viva is actually required
  const isVivaState = codePassed && !vivaPassed && requiresViva;

  return (
    <div className="w-full h-full bg-[#282A35] p-2 font-sans flex flex-col overflow-hidden text-white">

      <PanelGroup direction="horizontal" className="flex-grow">

        {/* ================= LEFT PANEL ================= */}
        <Panel defaultSize={25} minSize={15} className="flex flex-col bg-[#1D2A35] rounded-lg border border-[#38444D] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#38444D] bg-[#1D2A35] shrink-0 text-sm font-semibold text-white">
            <ListTodo className="w-4 h-4 text-[#04AA6D]" /> Description
          </div>

          <div className="p-4 border-b border-[#38444D] shrink-0 bg-[#15202B]">
            <div className="relative w-full aspect-video bg-[#000000] rounded-md overflow-hidden border border-[#38444D] shadow-md group">
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800" alt="Code Background" className="w-full h-full object-cover opacity-30 blur-[2px] grayscale" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#15202B]/80">
                <Lock className="w-6 h-6 text-[#F44336] mb-2" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#F44336]">Transmission Paused</span>
              </div>
            </div>
          </div>

          <div className="p-5 flex-grow overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">{questionData?.title}</h2>
            <p className="text-[#A0AAB2] leading-relaxed text-sm mb-6">{questionData?.description}</p>

            <p className="text-white font-semibold text-sm mb-2">Constraints:</p>
            <ul className="text-sm font-mono text-[#A0AAB2] space-y-2 list-disc pl-4 bg-[#15202B] p-4 rounded-md border border-[#38444D]">
              <li>Time Complexity: O(1)</li>
              <li>Space Complexity: O(1)</li>
            </ul>
          </div>
        </Panel>

        <PanelResizeHandle className="w-2 bg-[#282A35] cursor-col-resize transition-colors hover:bg-[#04AA6D]/20" />

        {/* ================= MIDDLE PANEL ================= */}
        <Panel defaultSize={50} minSize={30} className="flex flex-col bg-transparent">
          <PanelGroup direction="vertical">

            <Panel defaultSize={70} minSize={30} className="flex flex-col relative bg-[#1D2A35] rounded-lg border border-[#38444D] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#38444D] shrink-0 bg-[#1D2A35]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <Code2 className="w-4 h-4 text-[#04AA6D]" /> Code
                  </div>
                  <select
                    value={languagePref}
                    onChange={(e) => setLanguagePref(e.target.value)}
                    className="bg-[#15202B] text-xs text-[#A0AAB2] border border-[#38444D] rounded px-2 py-1 outline-none focus:border-[#04AA6D] cursor-pointer"
                  >
                    <option value="english">English AI</option>
                    <option value="hinglish">Hinglish AI</option>
                  </select>
                </div>
                {!codePassed ? (
                  <button
                    onClick={handleCodeSubmit}
                    disabled={isEvaluating}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#04AA6D] hover:bg-[#059862] text-white text-sm font-semibold rounded transition-all shadow-md"
                  >
                    {isEvaluating ? 'Evaluating...' : 'Run >'}
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-[#04AA6D] font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> Accepted
                  </span>
                )}
              </div>

              <div className="flex-grow relative bg-[#15202B]">
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

            <PanelResizeHandle className="h-2 bg-[#282A35] cursor-row-resize transition-colors hover:bg-[#04AA6D]/20" />

            <Panel defaultSize={30} minSize={15} className="flex flex-col bg-[#1D2A35] rounded-lg border border-[#38444D] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#38444D] bg-[#1D2A35] flex items-center gap-2 text-sm font-semibold text-white">
                <Terminal className="w-4 h-4 text-[#A0AAB2]" /> Test Result
              </div>
              <div className="flex-grow p-4 overflow-y-auto font-mono text-sm whitespace-pre-wrap bg-[#15202B]">
                {compilerOutput.type === "loading" && <span className="text-[#A0AAB2] animate-pulse">{compilerOutput.message}</span>}
                {compilerOutput.type === "idle" && <span className="text-[#A0AAB2]">{compilerOutput.message}</span>}
                {compilerOutput.type === "success" && <span className="text-[#04AA6D] font-bold">{compilerOutput.message}</span>}
                {compilerOutput.type === "error" && <span className="text-[#F44336] font-bold">{compilerOutput.message}</span>}
              </div>
            </Panel>

          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-2 bg-[#282A35] cursor-col-resize transition-colors hover:bg-[#04AA6D]/20" />

        {/* ================= RIGHT PANEL ================= */}
        <Panel defaultSize={25} minSize={20} className="flex flex-col bg-[#1D2A35] rounded-lg border border-[#38444D] overflow-hidden">
          <div className={`px-4 py-3 border-b flex items-center gap-2 shrink-0 ${codePassed && requiresViva && !vivaPassed ? 'bg-[#F44336]/10 border-[#F44336]/30' : 'bg-[#1D2A35] border-[#38444D]'}`}>
            {isTrapState && <ShieldAlert className="w-4 h-4 text-[#A0AAB2]" />}
            {isStrictState && <AlertTriangle className="w-4 h-4 text-[#FFEB3B]" />}
            {isMentorState && <Cpu className="w-4 h-4 text-[#2196F3]" />}
            {isVivaState && <Lock className="w-4 h-4 text-[#F44336] animate-pulse" />}
            {vivaPassed && <CheckCircle className="w-4 h-4 text-[#04AA6D]" />}

            <h3 className={`font-semibold text-sm ${codePassed && requiresViva && !vivaPassed ? 'text-[#F44336]' : vivaPassed ? 'text-[#04AA6D]' : 'text-white'}`}>
              {isTrapState && "System Status"}
              {isStrictState && "Syntax Analysis"}
              {isMentorState && "Mentor AI Active"}
              {isVivaState && "Viva Lock Activated"}
              {vivaPassed && "Sector Cleared"}
            </h3>

            <div className="ml-auto opacity-80 text-xs font-mono bg-black/30 px-2 py-1 rounded border border-white/10 text-white shadow-inner">
              Attempt {attempts}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#15202B]">
            {terminalLogs.length === 0 && (
              <p className="text-[#A0AAB2] font-mono text-sm text-center mt-10">Awaiting code submission...</p>
            )}

            {terminalLogs.map((log) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                key={log.id}
                className={`p-3 rounded-md text-sm border ${log.type === 'error' ? 'bg-[#F44336]/10 border-[#F44336]/30 text-[#F44336]' :
                  log.type === 'mentor' ? 'bg-[#2196F3]/10 border-[#2196F3]/30 text-white' :
                    log.type === 'viva' ? 'bg-[#F44336]/10 border-[#F44336]/30 text-[#F44336]' :
                      log.type === 'success' ? 'bg-[#04AA6D]/10 border-[#04AA6D]/30 text-[#04AA6D]' :
                        'bg-[#1D2A35] border-[#38444D] text-[#A0AAB2] ml-6'
                  }`}
              >
                <span className="block text-[10px] uppercase tracking-widest opacity-70 mb-1 font-bold">
                  {log.sender}
                </span>
                {log.type === 'mentor' || log.type === 'success' ? (
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
                          <pre className="bg-[#15202B] p-3 rounded-md overflow-x-auto border border-[#38444D] my-2 text-xs font-mono text-white/90 shadow-inner">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-[#1D2A35] px-1.5 py-0.5 rounded text-[#04AA6D] font-mono text-xs border border-[#38444D]" {...props}>
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

          <div className="p-3 bg-[#1D2A35] border-t border-[#38444D] shrink-0">
            {vivaPassed ? (
              <button
                onClick={onComplete}
                className="w-full flex justify-center items-center gap-2 py-3 bg-[#04AA6D] hover:bg-[#059862] text-white font-bold rounded-lg transition-all"
              >
                <Rocket className="w-5 h-5" /> {buttonText}
              </button>
            ) : (isMentorState || isVivaState) ? (
              <form onSubmit={handleChatSubmit} className="relative flex items-center bg-[#15202B] border border-[#38444D] rounded-xl px-2 shadow-inner focus-within:border-[#04AA6D] transition-colors">

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
                  className={`p-1.5 rounded-lg transition-all ${isRecording ? 'bg-[#F44336] text-white animate-pulse' : 'text-[#A0AAB2] hover:text-white hover:bg-[#38444D]'}`}
                  title="Use Microphone"
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  className={`p-1.5 rounded-lg ml-1 transition-all ${chatInput.trim() ? 'bg-white text-[#1D2A35]' : 'bg-[#38444D] text-[#A0AAB2] cursor-not-allowed'}`}
                  disabled={!chatInput.trim()}
                  title="Send Message"
                >
                  <Send className="w-4 h-4 ml-[-1px] mt-[1px]" />
                </button>
              </form>
            ) : (
              <div className="py-2.5 text-center text-xs font-semibold text-[#A0AAB2] bg-[#15202B] rounded-lg border border-[#38444D]">
                Terminal Locked. Run code first.
              </div>
            )}
          </div>
        </Panel>

      </PanelGroup>
    </div>
  );
}