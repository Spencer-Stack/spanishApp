import type { AudioProvider } from './AudioProvider';

interface HttpAudioProviderOptions {
  /** Base URL of a local TTS server, e.g. one wrapping edge_tts.Communicate. */
  baseUrl: string;
}

/**
 * Talks to an external synthesis server over HTTP. Intended to sit in front
 * of a service running something like:
 *
 *   async def synth(text, voice, rate, outfile):
 *       communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
 *       await communicate.save(str(outfile))
 *
 * The server is expected to expose `POST {baseUrl}/synth` accepting
 * `{ text: string }` and returning an audio file body (e.g. audio/mpeg).
 * Swap this in for the default WebSpeech provider by changing the factory
 * in `src/lib/audio/index.ts` — no other code needs to change.
 */
export function createHttpAudioProvider({ baseUrl }: HttpAudioProviderOptions): AudioProvider {
  const cache = new Map<string, Promise<string>>();
  let currentAudio: HTMLAudioElement | null = null;

  async function fetchAudioUrl(word: string): Promise<string> {
    let pending = cache.get(word);
    if (!pending) {
      pending = fetch(`${baseUrl}/synth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`TTS request failed: ${res.status}`);
          return res.blob();
        })
        .then((blob) => URL.createObjectURL(blob));
      cache.set(word, pending);
    }
    return pending;
  }

  return {
    async play(word: string) {
      currentAudio?.pause();
      const url = await fetchAudioUrl(word);
      currentAudio = new Audio(url);
      await currentAudio.play();
    },

    stop() {
      currentAudio?.pause();
      currentAudio = null;
    },

    async preload(words: string[]) {
      await Promise.all(words.map(fetchAudioUrl));
    },
  };
}
