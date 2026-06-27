import { getOpenAI } from "../ai/provider";
import { getCachedSettings } from "../settings/store";

/** Transcribe recorded audio to text via the configured OpenAI transcription model. */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const { experimental_transcribe: transcribe } = await import("ai");
  const s = getCachedSettings();
  const openai = await getOpenAI(s);
  const audio = new Uint8Array(await blob.arrayBuffer());
  const result = await transcribe({
    model: openai.transcription(s.model.transcriptionModel),
    audio,
  });
  return result.text.trim();
}
