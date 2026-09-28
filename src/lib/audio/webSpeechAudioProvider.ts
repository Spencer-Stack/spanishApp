import type { AudioProvider } from './AudioProvider';

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  const existing = speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const handler = () => {
      speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', handler);
  });
}

/** Higher is better. Network-backed voices (e.g. Chrome's "Google español")
 * are far clearer than the OS's bundled offline voices, which often sound
 * robotic or garbled — prefer those whenever one is available. */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  if (lang === 'es-es') return voice.localService ? 2 : 4;
  if (lang.startsWith('es')) return voice.localService ? 1 : 3;
  return -1;
}

async function pickSpanishVoice(): Promise<SpeechSynthesisVoice | undefined> {
  const voices = await waitForVoices();
  const best = voices
    .filter((voice) => scoreVoice(voice) >= 0)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  return best;
}

/**
 * Default provider — speaks Spanish words using the browser's built-in
 * SpeechSynthesis engine. No backend required.
 */
export function createWebSpeechAudioProvider(): AudioProvider {
  let voicePromise: Promise<SpeechSynthesisVoice | undefined> | undefined;
  // Bumped on every play()/stop() so a delayed speak() from a superseded
  // call never fires over a newer one (e.g. rapid card navigation).
  let generation = 0;

  const getVoice = () => {
    if (!voicePromise) voicePromise = pickSpanishVoice();
    return voicePromise;
  };

  return {
    async play(word: string) {
      const token = ++generation;
      const voice = await getVoice();

      // Chrome/Edge reliably garble or drop an utterance that's spoken in
      // the same tick as cancelling the previous one — a short beat avoids it.
      speechSynthesis.cancel();
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (token !== generation) return;

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = voice?.lang ?? 'es-ES';
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      speechSynthesis.speak(utterance);
    },

    stop() {
      generation++;
      speechSynthesis.cancel();
    },

    async preload() {
      await getVoice();
    },
  };
}
