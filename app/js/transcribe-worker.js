// WorkIndia Reimagined — speech-to-text for recorded platform calls.
// Runs OpenAI Whisper (base, multilingual — handles English, Hindi and
// other Indian languages) fully in the browser via Transformers.js, on the
// actual saved call recording. Nothing is sent to a server; the model is
// downloaded once from the Hugging Face CDN and cached by the browser.
// Loaded as a module worker so transcription never freezes the UI.

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

env.allowLocalModels = false;

let asrPromise = null;
function getAsr() {
  if (!asrPromise) {
    asrPromise = pipeline("automatic-speech-recognition", "onnx-community/whisper-base", {
      progress_callback: (p) => self.postMessage({ type: "progress", progress: p })
    }).catch((err) => { asrPromise = null; throw err; });
  }
  return asrPromise;
}

self.onmessage = async (e) => {
  const { id, audio } = e.data;
  try {
    const asr = await getAsr();
    const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5, task: "transcribe" });
    self.postMessage({ type: "done", id, text: ((out && out.text) || "").trim() });
  } catch (err) {
    self.postMessage({ type: "error", id, error: String((err && err.message) || err) });
  }
};
