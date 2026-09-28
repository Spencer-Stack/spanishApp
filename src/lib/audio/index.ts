import type { AudioProvider } from './AudioProvider';
import { createWebSpeechAudioProvider } from './webSpeechAudioProvider';

export type { AudioProvider } from './AudioProvider';

// Default: browser SpeechSynthesis, works with zero setup. Once a local
// edge_tts server exists, switch this to:
//   createHttpAudioProvider({ baseUrl: 'http://localhost:8765' })
export const audioProvider: AudioProvider = createWebSpeechAudioProvider();
