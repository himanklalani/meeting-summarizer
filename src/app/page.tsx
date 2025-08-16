"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [fileContent, setFileContent] = useState<string>("");
  const [instruction, setInstruction] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [emailStatus, setEmailStatus] = useState<string>("");

  const [history, setHistory] = useState<
    Array<{ summary: string; instruction: string; date: string }>
  >([]);

  // Load summary history from localStorage on mount or when summary changes
  useEffect(() => {
    const stored = localStorage.getItem("summaryHistory");
    if (stored) setHistory(JSON.parse(stored));
  }, [summary]);

  // Read uploaded file as text
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFileContent(reader.result);
      }
    };
    reader.readAsText(file);
  };

  // Handle summary generation
  const generateSummary = async () => {
    if (!fileContent || !instruction) {
      alert("Transcript and instruction required.");
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
      const data = await res.json();
      setSummary(data.summary || "No summary returned.");

      // Save summary history in localStorage
      if (data.summary) {
        const entry = {
          summary: data.summary,
          instruction,
          date: new Date().toLocaleString(),
        };
        const currentHistory = JSON.parse(
          localStorage.getItem("summaryHistory") || "[]"
        );
        currentHistory.push(entry);
        localStorage.setItem("summaryHistory", JSON.stringify(currentHistory));
        setHistory(currentHistory);
      }
    } catch {
      setSummary("Error generating summary.");
    }
    setLoading(false);
  };

  
  const sendEmail = async () => {
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
      if (data.ok) setEmailStatus("✅ Email sent!");
      else setEmailStatus("❌ Error sending email.");
    } catch {
      setEmailStatus("❌ Error sending email.");
    }
  };

  
  const copySummary = () => {
    window.navigator.clipboard.writeText(summary);
    setEmailStatus("Copied summary to clipboard!");
    setTimeout(() => setEmailStatus(""), 1500);
  };


  const clearHistory = () => {
    localStorage.removeItem("summaryHistory");
    setHistory([]);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-8 bg-white/95 dark:bg-black/80 rounded-xl shadow-lg space-y-8 border border-gray-300">
      <h1 className="text-3xl font-extrabold text-center text-blue-300 mb-3 tracking-tight">
        AI Meeting Notes Summarizer
      </h1>

      <hr className="my-2 border-gray-300" />

      <div>
        <label className="block mb-2 font-semibold">
          1. Upload transcript (.txt) or paste transcript:
        </label>
        <input
          type="file"
          accept=".txt"
          className="mb-2 block"
          onChange={handleFileChange}
        />
        <textarea
          className="w-full border rounded p-2 mb-2 bg-white dark:bg-black/30"
          rows={5}
          placeholder="...or paste text transcript here"
          value={fileContent}
          onChange={(e) => setFileContent(e.target.value)}
        />
      </div>

      <hr className="my-2 border-gray-300" />

      <div>
        <label className="block mb-2 font-semibold">2. Instruction / Prompt:</label>
        <textarea
          className="w-full border rounded p-2 bg-white dark:bg-black/30"
          rows={2}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. Summarize in bullet points for executives'
        />
      </div>

      <button
        onClick={generateSummary}
        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        disabled={loading || !fileContent || !instruction}
      >
        {loading ? "Generating..." : "Generate Summary"}
      </button>

      {summary && (
        <>
          <hr className="my-4 border-gray-300" />

          <div>
            <label className="block mb-2 font-semibold">
              3. Edit your summary (will be emailed as-is):
            </label>
            <div className="flex gap-2 items-center">
              <textarea
                className="w-full border rounded p-2 bg-white dark:bg-black/20"
                rows={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              <button
                className="px-3 py-1 bg-gray-200 dark:bg-black/40 rounded text-sm border border-gray-300 font-mono"
                onClick={copySummary}
                type="button"
              >
                Copy
              </button>
            </div>
          </div>
        </>
      )}

      {summary && (
        <>
          <hr className="my-4 border-gray-300" />

          <div>
            <label className="block mb-2 font-semibold">
              4. Share summary by email (comma-separated if more than one):
            </label>
            <input
              type="text"
              className="w-full border rounded p-2 mb-2"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="w-full border rounded p-2 mb-2"
              placeholder="Email subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <button
              onClick={sendEmail}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition"
              disabled={!email}
            >
              Send Email
            </button>
            {emailStatus && (
              <div className="mt-2 text-sm text-center">{emailStatus}</div>
            )}
          </div>
        </>
      )}

      {/* Summary History Section */}
      <div className="mt-10 bg-gray-50 dark:bg-black/30 border rounded p-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-lg text-blue-300">Summary History</h2>
          <button
            className="px-3 py-1 bg-red-800 hover:bg-red-500 text-white text-xs rounded"
            onClick={clearHistory}
            type="button"
          >
            Clear
          </button>
        </div>
        <ul className="mt-3 space-y-3 max-h-64 overflow-y-auto">
          {history.length === 0 && (
            <li className="text-gray-500 text-center">No summaries yet...</li>
          )}
          {history.map((item, idx) => (
            <li
              key={idx}
              className="bg-white dark:bg-black/20 rounded p-2 border break-words"
            >
              <div className="text-xs text-gray-500 mb-1">{item.date}</div>
              <div className="font-medium mb-1">
                Prompt: <span className="italic">{item.instruction}</span>
              </div>
              <pre className="whitespace-pre-wrap text-sm">{item.summary}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
