"use client";
import { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { FiSun, FiMoon, FiMail, FiArrowUpRight } from "react-icons/fi";

const springConfig = { stiffness: 250, damping: 30 };

type HistoryItem = {
  summary: string;
  instruction: string;
  date: string;
};

export default function Home() {
  // Initialize historyOpen based on screen width (mobile closed, desktop open)
  const [historyOpen, setHistoryOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 640; // open if screen is md or larger
    }
    return true; // default to open for SSR
  });

  const [fileContent, setFileContent] = useState("");
  const [instruction, setInstruction] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setHistoryOpen(window.innerWidth >= 640); // ensure synced on mount
      const stored = localStorage.getItem("summaryHistory");
      if (stored) setHistory(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (mounted) document.documentElement.classList.toggle("dark", dark);
  }, [dark, mounted]);

  const toggleProgress = useMotionValue(dark ? 1 : 0);
  const spring = useSpring(toggleProgress, springConfig);
  const bgColor = useTransform(spring, [0, 1], ["#f0f4f8", "#111827"]);
  const iconColor = useTransform(spring, [0, 1], ["#4b5563", "#fbbf24"]);

  useEffect(() => {
    toggleProgress.set(dark ? 1 : 0);
  }, [dark, toggleProgress]);

  async function uploadAndExtractPdf(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/extract-text", {   
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to extract");
      const data = await res.json();
      return data.text || "";
    } catch {
      alert("Failed to extract text from PDF.");
      return "";
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setLoading(true);
      const extractedText = await uploadAndExtractPdf(file);
      setLoading(false);
      setFileContent(extractedText);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") setFileContent(reader.result);
      };
      reader.readAsText(file);
    }
  };

  async function generateSummary() {
    if (!fileContent || !instruction) {
      alert("Both transcript and instruction required.");
      return;
    }
    setLoading(true);
    setSummary("");
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fileContent, instruction }),
      });
      if (!res.ok) throw new Error("Summarization failed");
      const data = await res.json();
      setSummary(data.summary || "No summary generated.");
      if (data.summary) {
        const entry = {
          summary: data.summary,
          instruction,
          date: new Date().toLocaleString(),
        };
        let hist: HistoryItem[] = [];
        if (typeof window !== "undefined") {
          hist = JSON.parse(localStorage.getItem("summaryHistory") || "[]");
          hist.push(entry);
          localStorage.setItem("summaryHistory", JSON.stringify(hist));
        }
        setHistory(hist);
      }
    } catch (e) {
      setSummary("Error during summarization.");
      console.error(e);
    }
    setLoading(false);
  }

  async function sendEmail() {
    setEmailStatus("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: email,
          subject: subject || "Your meeting summary",
          summary,
        }),
      });
      const data = await res.json();
      setEmailStatus(res.ok && data.ok ? "✅ Email sent!" : "❌ Failed to send email.");
    } catch {
      setEmailStatus("❌ Failed to send email.");
    }
  }

  function copySummary() {
    if (!summary.trim()) return;
    navigator.clipboard.writeText(summary);
    setEmailStatus("Copied summary to clipboard!");
    setTimeout(() => setEmailStatus(""), 1500);
  }

  function clearHistory() {
    localStorage.removeItem("summaryHistory");
    setHistory([]);
  }

  if (!mounted) return null;

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-700 ease-in-out ${
        dark
          ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-cyan-900"
          : "bg-gradient-to-br from-blue-200 via-indigo-100 to-rose-100"
      }`}
    >
      {/* Decorative Glow Circles */}
      <motion.div
        className="absolute left-12 top-8 w-72 h-72 rounded-full bg-gradient-to-tr from-fuchsia-500/40 to-pink-400/40 blur-3xl z-0"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.85, 0.7], rotate: [0, 10, 0] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
      />
      <motion.div
        className="absolute bottom-2 right-6 w-36 h-36 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-pink-300/40 blur-2xl z-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Responsive Summary History Drawer */}
      <motion.div
        initial={{ x: 64, opacity: 0 }}
        animate={{ x: historyOpen ? 0 : 550, opacity: historyOpen ? 1 : 0.3 }}
        transition={{ type: "spring", stiffness: 210, damping: 26 }}
        className="fixed top-0 right-0 h-full z-40
          w-full max-w-[550px] sm:w-[550px]
          bg-gradient-to-br from-blue-900/95 via-indigo-800/80 to-pink-900/75
          dark:from-slate-900/90 dark:to-blue-900/75
          shadow-2xl border-l border-blue-500/10
          flex flex-col pt-6 px-5 pb-3 transition-all duration-700"
      >
        <button
          className="absolute -left-8 top-5
            bg-indigo-900 dark:bg-indigo-800
            text-white p-3 rounded-full shadow-lg border border-indigo-600/700 z-50
            transition-colors transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400"
          onClick={() => setHistoryOpen((v) => !v)}
          type="button"
        >
          {historyOpen ? "⮜" : "⮞"}
        </button>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-blue-300">Summary History</h2>
          <button
            className="px-3 py-1 text-xs rounded bg-red-800 hover:bg-red-500 text-white"
            onClick={clearHistory}
            type="button"
          >
            Clear
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto space-y-3 mb-5">
          {history.length === 0 && (
            <li className="text-gray-300 text-center">No summaries yet.</li>
          )}
          {[...history].reverse().map((item, i) => (
            <li
              key={i}
              className="bg-slate-800/65 dark:bg-black/25 rounded p-3 border border-blue-800/20 break-words"
            >
              <div className="text-xs text-gray-400 mb-1">{item.date}</div>
              <div className="font-medium mb-1 text-pink-400">
                Prompt: <span className="italic">{item.instruction}</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-blue-100">{item.summary}</pre>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 60 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={springConfig}
        className={`relative max-w-3xl mx-auto w-full px-6 sm:px-10 py-14 space-y-8
          rounded-2xl shadow-2xl border border-blue-400/10
          ${
            dark
              ? "bg-gradient-to-br from-slate-900 via-indigo-900 to-cyan-700"
              : "bg-gradient-to-br from-blue-160 via-indigo-100 to-pink-300"
          }`}
      >
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <motion.button
            aria-label="Toggle theme"
            onClick={() => setDark((d) => !d)}
            type="button"
            className="p-3 rounded-full shadow border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:scale-125 transition"
            style={{ backgroundColor: bgColor }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div style={{ color: iconColor }}>
              {dark ? <FiSun size={24} /> : <FiMoon size={22} />}
            </motion.div>
          </motion.button>
        </div>

        {/* Title */}
        <motion.h1
          className="w-full text-left text-4xl font-extrabold mb-6
          bg-gradient-to-r from-indigo-400 via-blue-400 to-pink-400
          bg-clip-text text-transparent drop-shadow-xl tracking-tight
          underline decoration-pink-400 decoration-4 underline-offset-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          AI Meeting Notes Summarizer
        </motion.h1>

        {/* Upload Section */}
        <motion.div
          className="rounded-2xl p-4 bg-gradient-to-br from-white/70 via-blue-100/50 to-indigo-100/40
          dark:from-slate-900/60 dark:to-slate-800/50 shadow-md"
        >
          <label className="block mb-2 font-semibold text-slate-700 dark:text-blue-500">
            <span className="text-pink-500">1. Upload transcript</span> (.txt, .pdf) or paste transcript:
          </label>
          <input
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            className="mb-3 block file:px-3 file:py-2 file:rounded-lg file:border-none
            file:bg-gradient-to-r file:from-pink-600 file:to-indigo-700
            file:text-white file:font-bold file:hover:scale-105 transition-all"
          />
          <textarea
            rows={5}
            className="w-full rounded-xl p-3 bg-gradient-to-br from-blue-50 to-white
            dark:from-slate-900 dark:to-slate-800 text-slate-700 dark:text-white
            shadow-sm focus:ring-2 focus:ring-indigo-500 transition"
            placeholder="Paste transcript..."
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
          />
        </motion.div>

        {/* Instruction */}
        <motion.div
          className="rounded-2xl p-4 bg-gradient-to-br from-white/60 via-pink-100/40 to-blue-100/20
          dark:from-slate-900/60 dark:to-slate-800/50 shadow"
        >
          <label className="block mb-2 font-semibold text-pink-700 dark:text-blue-500">
            <span className="text-pink-500">2. Instruction / Prompt:</span>
          </label>
          <textarea
            rows={2}
            className="w-full border-none rounded-xl p-3 text-slate-700 dark:text-white
            bg-gradient-to-br from-pink-50 to-blue-50 dark:from-slate-900 dark:to-blue-950
            shadow-sm focus:ring-2 focus:ring-pink-500"
            placeholder="e.g. Summarize in bullet points for executives"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
          />
        </motion.div>

        {/* Generate */}
        <motion.button
          disabled={!fileContent || !instruction || loading}
          onClick={generateSummary}
          className="w-full text-lg rounded-xl py-3 font-bold text-white
          bg-gradient-to-r from-indigo-600 via-pink-500 to-pink-300
          shadow-lg focus:outline-none focus:ring-4 focus:ring-pink-500/50
          animate-pulse flex items-center justify-center gap-2
          disabled:opacity-50 transition"
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <span className="flex gap-2 items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-5 h-5 border-2 border-t-indigo-500 border-b-pink-500 border-l-white rounded-full inline-block"
              />
              Generating...
            </span>
          ) : (
            <>
              <FiArrowUpRight /> Generate Summary
            </>
          )}
        </motion.button>

        {/* Summary Editor */}
        {summary && (
          <AnimatePresence>
            <motion.div
              className="rounded-2xl p-4 shadow-lg my-3
              bg-gradient-to-br from-slate-900/60 via-indigo-800/40 to-blue-900/30
              dark:from-slate-900/70 dark:to-indigo-800/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="block mb-2 font-semibold text-indigo-500 dark:text-pink-500">
                3. Edit your summary <span className="text-pink-500">(will be emailed as-is):</span>
              </label>
              <div className="flex gap-2 items-center">
                <textarea
                  rows={8}
                  className="w-full rounded-xl p-3 bg-slate-900/70 dark:bg-slate-800
                  text-slate-100 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
                <motion.button
                  onClick={copySummary}
                  className="px-3 py-2 bg-indigo-400/80 hover:bg-pink-700 text-white
                  font-bold rounded shadow font-mono transition-all"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Copy
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Email Section */}
        {summary && (
          <AnimatePresence>
            <motion.div
              className="rounded-2xl p-4 space-y-3 shadow
              bg-gradient-to-br from-indigo-50/60 via-blue-100/25 to-white/50
              dark:from-slate-900/50 dark:to-indigo-900/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <label className="block font-semibold text-blue-500 dark:text-pink-500">
                4. Share summary <span className=" dark:text-blue-500">(comma separated emails):</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="recipient@example.com"
                  className="flex-1 min-w-[180px] rounded-xl p-2
                  bg-gradient-to-br from-pink-100 to-blue-100
                  dark:from-pink-900 dark:to-blue-950
                  text-blue-900 dark:text-white shadow focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  placeholder="Email subject (optional)"
                  className="flex-1 min-w-[120px] rounded-xl p-2
                  bg-gradient-to-br from-blue-100 to-pink-100
                  dark:from-blue-950 dark:to-pink-900
                  text-blue-900 dark:text-white shadow focus:ring-2 focus:ring-pink-500"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
                <motion.button
                  disabled={!email}
                  onClick={sendEmail}
                  className="px-4 py-2 rounded-xl text-white font-bold tracking-wide shadow
                  bg-gradient-to-r from-green-500 via-indigo-400 to-blue-500
                  focus:outline-none focus:ring-2 focus:ring-green-300
                  flex items-center gap-2 hover:scale-105 active:scale-95 transition"
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <FiMail /> Send Email
                </motion.button>
              </div>
              {emailStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-sm text-center text-indigo-700 dark:text-pink-300 font-bold"
                >
                  {emailStatus}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}
