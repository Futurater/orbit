import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Loader2, CheckCircle, XCircle, Rocket } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

import { verifyVivaAnswer } from '../api';

const VoiceViva = ({ onComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
    } else {
      console.warn("Speech Recognition API is not supported in this browser.");
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      setResult(null);
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const submitViva = async () => {
    setIsEvaluating(true);
    try {
      // NOTE: studentId and checkpointId need to be passed down if VoiceViva is embedded. Providing defaults for now.
      const response = await verifyVivaAnswer({
        student_id: 'dev@company.com',
        checkpoint_id: 'viva_fallback',
        transcribed_text: transcript,
        language_preference: 'english'
      });

      setResult({
        passed: response.viva_passed,
        feedback: response.feedback_text
      });
    } catch (error) {
      console.error("Viva submission failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto mt-10 bg-slate-900 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-slate-700 p-8 flex flex-col items-center"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-white tracking-wider uppercase mb-2">Final Protocol: Voice Viva</h2>
        <p className="text-slate-400">Explain the Time and Space Complexity of your optimized solution to clear the sector.</p>
      </div>

      <button
        onClick={toggleRecording}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${isRecording
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
      >
        {isRecording ? <Square className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
        {isRecording && (
          <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></span>
        )}
      </button>

      <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">
        {isRecording ? 'Recording Audio...' : 'Click to Speak'}
      </p>

      <div className="w-full mt-8 bg-slate-950 border border-slate-800 rounded-lg p-6 min-h-[150px] shadow-inner">
        {transcript ? (
          <p className="text-slate-200 text-lg leading-relaxed">{transcript}</p>
        ) : (
          <p className="text-slate-600 italic font-mono text-sm">Awaiting vocal input...</p>
        )}
      </div>

      <div className="w-full mt-6 flex flex-col items-center">
        {!result ? (
          <button
            onClick={submitViva}
            disabled={!transcript || isRecording || isEvaluating}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold rounded transition-all uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(5,150,105,0.4)]"
          >
            {isEvaluating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {isEvaluating ? 'Running AI Diagnostics...' : 'Submit Vocal Log'}
          </button>
        ) : (
          <div className="w-full flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`w-full p-6 rounded-lg border-2 flex items-start gap-4 ${result.passed ? 'bg-emerald-900/20 border-emerald-500' : 'bg-red-900/20 border-red-500'
                }`}
            >
              {result.passed ? <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />}
              <div>
                <h3 className={`text-xl font-bold mb-1 uppercase tracking-wider ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.passed ? 'Clearance Granted' : 'Logic Incomplete'}
                </h3>
                <p className="text-slate-300">{result.feedback}</p>
              </div>
            </motion.div>

            {/* 2. The Next Steps based on Pass/Fail */}
            {result.passed ? (
              <button
                onClick={onComplete} // <--- THIS TRIGGERS THE HYPERJUMP!
                className="mt-8 flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:scale-105 transition-all"
              >
                <Rocket className="w-6 h-6" />
                Initiate Hyperjump
              </button>
            ) : (
              <button
                onClick={() => { setResult(null); setTranscript(''); }}
                className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded uppercase tracking-widest text-sm transition-all border border-slate-600"
              >
                Retry Vocal Log
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default VoiceViva;