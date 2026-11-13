// WorkIndia Reimagined — speech-to-text for recorded platform calls.
// Runs OpenAI Whisper (base.en, English only for now) fully in the browser via Transformers.js, on the
// actual saved call recording. Nothing is sent to a server; the model is
// downloaded once from the Hugging Face CDN and cached by the browser.
// Loaded as a module worker so transcription never freezes the UI.

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";

env.allowLocalModels = false;

let asrPromise = null;
function getAsr() {
  if (!asrPromise) {
    // English-only Whisper with a full-precision encoder: far more accurate
    // on English calls than the quantised multilingual model.
    asrPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-base.en", {
      dtype: { encoder_model: "fp32", decoder_model_merged: "q8" },
      progress_callback: (p) => self.postMessage({ type: "progress", progress: p })
    }).catch((err) => { asrPromise = null; throw err; });
  }
  return asrPromise;
}

self.onmessage = async (e) => {
  const { id, audio } = e.data;
  try {
    const asr = await getAsr();
    const out = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ type: "done", id, text: ((out && out.text) || "").trim() });
  } catch (err) {
    self.postMessage({ type: "error", id, error: String((err && err.message) || err) });
  }
};
