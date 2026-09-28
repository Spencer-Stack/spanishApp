/**
 * Abstracts Spanish word pronunciation from the UI. Implementations may use
 * an in-browser engine (SpeechSynthesis) or call out to an external TTS
 * service (e.g. a local server wrapping edge_tts). The UI only ever talks
 * to this interface.
 */
export interface AudioProvider {
  play(word: string): Promise<void>;
  stop(): void;
  preload(words: string[]): Promise<void>;
}
