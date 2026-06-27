/** Thin wrapper around MediaRecorder. The Web Speech API is unreliable inside
 * WebKit/WebView2 webviews, so we capture raw audio and transcribe via Whisper. */
export class Recorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone access is not available in this environment.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    const mr = new MediaRecorder(this.stream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    mr.start();
    this.mediaRecorder = mr;
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mr = this.mediaRecorder;
      if (!mr) {
        reject(new Error("Not recording"));
        return;
      }
      mr.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: mr.mimeType || "audio/webm",
        });
        this.cleanup();
        resolve(blob);
      };
      mr.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
