import { getOpenAI } from "../ai/provider";
import { getCachedSettings } from "../settings/store";

let currentAudio: HTMLAudioElement | null = null;

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Speak the agent's reply. Uses the hosted TTS model when a key is present,
 * falling back to the browser's speechSynthesis so the agent is never silent. */
export async function speak(text: string): Promise<void> {
  stopSpeaking();
  const s = getCachedSettings();
  if (s.model.openaiKey) {
    try {
      const { experimental_generateSpeech: generateSpeech } = await import("ai");
      const openai = await getOpenAI(s);
      const { audio } = await generateSpeech({
        model: openai.speech(s.model.speechModel),
        text,
        voice: s.model.speechVoice as never,
      });
      const blob = new Blob([audio.uint8Array as unknown as BlobPart], {
        type: audio.mediaType || "audio/mpeg",
      });
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      currentAudio = el;
      el.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === el) currentAudio = null;
      };
      await el.play();
      return;
    } catch (e) {
      console.warn("Hosted TTS failed, falling back to speechSynthesis", e);
    }
  }
  browserSpeak(text);
}

function browserSpeak(text: string): void {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}
