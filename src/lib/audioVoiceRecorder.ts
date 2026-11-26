/**
 * Real Microphone Voice Recording & Audio Playback Engine for Web & Native Mobile
 * - Native (iOS / Android): Powered by expo-av & expo-file-system for real microphone capture & hardware playback
 * - Web: Powered by HTML5 MediaRecorder & Web Audio API
 * - Real voices only — no synthesized robotic oscillator tones.
 */
import { Platform } from 'react-native';
import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export class VoiceRecorderService {
  // Web fields
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  // Native fields (iOS / Android)
  private nativeRecording: ExpoAudio.Recording | null = null;

  private volumeSamples: number[] = [];
  private startTime: number = 0;
  private waveformInterval: any = null;

  public async startRecording(onVolume?: (level: number) => void): Promise<{ ok: boolean; error?: string }> {
    this.audioChunks = [];
    this.volumeSamples = [];
    this.startTime = Date.now();

    // 1. Native Mobile Recording (Android & iOS) via expo-av
    if (Platform.OS !== 'web') {
      try {
        const perm = await ExpoAudio.requestPermissionsAsync();
        if (!perm.granted) {
          return { ok: false, error: 'Microphone permission was denied by device' };
        }

        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const recording = new ExpoAudio.Recording();
        await recording.prepareToRecordAsync(ExpoAudio.RecordingOptionsPresets.HIGH_QUALITY);

        recording.setOnRecordingStatusUpdate((status) => {
          if (status.canRecord && status.isRecording && status.metering !== undefined) {
            // Normalized metering: -160dB to 0dB -> 0 to 100
            const normalized = Math.min(100, Math.max(15, Math.round(((status.metering + 160) / 160) * 100)));
            this.volumeSamples.push(normalized);
            if (onVolume) onVolume(normalized);
          }
        });

        await recording.startAsync();
        this.nativeRecording = recording;
        return { ok: true };
      } catch (err: any) {
        console.warn('[VoiceRecorder] Native recording error:', err);
        return { ok: false, error: err?.message || 'Could not start recording on mobile device' };
      }
    }

    // 2. Web Recording via HTML5 MediaRecorder
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return { ok: false, error: 'Web audio recording is not supported in this browser' };
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        const candidates = [
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/webm;codecs=opus',
          'audio/webm',
        ];
        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            mimeType = cand;
            break;
          }
        }
      }

      try {
        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.stream, { mimeType })
          : new MediaRecorder(this.stream);
      } catch {
        this.mediaRecorder = new MediaRecorder(this.stream);
      }
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Web Audio Analyser for live visual loudness
      try {
        const AudioCtxClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass && this.stream) {
          const ctx = new AudioCtxClass();
          this.audioCtx = ctx;
          const source = ctx.createMediaStreamSource(this.stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          this.analyser = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          this.waveformInterval = setInterval(() => {
            if (!this.analyser || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
              if (this.waveformInterval) clearInterval(this.waveformInterval);
              return;
            }
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = Math.min(100, Math.max(15, Math.round((sum / dataArray.length) * 1.5)));
            this.volumeSamples.push(avg);
            if (onVolume) onVolume(avg);
          }, 150);
        }
      } catch (e) {
        console.warn('[VoiceRecorder] Analyser setup error:', e);
      }

      this.mediaRecorder.start(200);
      return { ok: true };
    } catch (err: any) {
      console.warn('[VoiceRecorder] Web mic permission rejected:', err);
      return { ok: false, error: 'Microphone permission denied or not found' };
    }
  }

  public async stopRecording(): Promise<{
    ok: boolean;
    audioUrl?: string;
    durationSec: number;
    waveform: number[];
    error?: string;
  }> {
    if (this.waveformInterval) {
      clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }

    const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    // 1. Native Mobile Stop & Export
    if (Platform.OS !== 'web') {
      if (!this.nativeRecording) {
        return { ok: false, durationSec, waveform: [30, 50, 40, 60], error: 'No recording in progress' };
      }

      try {
        await this.nativeRecording.stopAndUnloadAsync();
        const uri = this.nativeRecording.getURI();
        this.nativeRecording = null;

        if (!uri) {
          return { ok: false, durationSec, waveform: [30, 50, 40, 60], error: 'Could not retrieve recording URI' };
        }

        // Convert file to Base64 so it can be played back across sessions
        let base64Audio = uri;
        try {
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          base64Audio = `data:audio/m4a;base64,${b64}`;
        } catch {
          base64Audio = uri;
        }

        let waveform = this.volumeSamples;
        if (waveform.length < 18) {
          const needed = 18 - waveform.length;
          const extra = Array.from({ length: needed }, () => Math.floor(25 + Math.random() * 50));
          waveform = [...waveform, ...extra];
        }

        return {
          ok: true,
          audioUrl: base64Audio,
          durationSec,
          waveform: waveform.slice(0, 24),
        };
      } catch (err: any) {
        this.nativeRecording = null;
        return { ok: false, durationSec, waveform: [30, 50, 40, 60], error: err?.message || 'Error saving native recording' };
      }
    }

    // 2. Web Stop & Export
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve({
          ok: false,
          durationSec,
          waveform: [30, 50, 40, 60],
          error: 'Recorder was inactive',
        });
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });

          let base64Audio = '';
          if (blob.size > 0) {
            base64Audio = await this.blobToBase64(blob);
          }

          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }
          if (this.audioCtx) {
            try {
              this.audioCtx.close();
            } catch {}
            this.audioCtx = null;
          }

          let waveform = this.volumeSamples;
          if (waveform.length < 18) {
            const needed = 18 - waveform.length;
            const extra = Array.from({ length: needed }, () => Math.floor(25 + Math.random() * 50));
            waveform = [...waveform, ...extra];
          }

          resolve({
            ok: true,
            audioUrl: base64Audio,
            durationSec,
            waveform: waveform.slice(0, 24),
          });
        } catch (e: any) {
          resolve({
            ok: false,
            durationSec,
            waveform: [30, 50, 40, 60],
            error: e?.message || 'Error processing web audio blob',
          });
        }
      };

      try {
        this.mediaRecorder!.stop();
      } catch (e: any) {
        resolve({
          ok: false,
          durationSec,
          waveform: [30, 50, 40, 60],
          error: e?.message || 'Error stopping recorder',
        });
      }
    });
  }

  public cancelRecording(): void {
    if (this.waveformInterval) {
      clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }
    if (Platform.OS !== 'web' && this.nativeRecording) {
      try {
        this.nativeRecording.stopAndUnloadAsync();
      } catch {}
      this.nativeRecording = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const voiceRecorder = new VoiceRecorderService();

// Global active audio playback instances
let currentActiveWebAudio: HTMLAudioElement | null = null;
let currentActiveNativeSound: ExpoAudio.Sound | null = null;

export class VoicePlayerService {
  public static async stopAll(): Promise<void> {
    if (currentActiveWebAudio) {
      try {
        currentActiveWebAudio.pause();
        currentActiveWebAudio.currentTime = 0;
      } catch {}
      currentActiveWebAudio = null;
    }

    if (currentActiveNativeSound) {
      try {
        await currentActiveNativeSound.stopAsync();
        await currentActiveNativeSound.unloadAsync();
      } catch {}
      currentActiveNativeSound = null;
    }
  }

  public static play(
    audioUrl: string | undefined,
    durationSec: number = 5,
    onProgress: (percent: number) => void,
    onEnded: () => void
  ): { stop: () => void } {
    this.stopAll();

    if (!audioUrl) {
      onEnded();
      return { stop: () => {} };
    }

    // 1. Native Mobile Playback (Android & iOS) via expo-av
    if (Platform.OS !== 'web') {
      let isStopped = false;

      (async () => {
        try {
          // Switch to loudspeaker playback mode (forces main loud speaker, NOT phone call earpiece)
          await ExpoAudio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
          });

          let playbackUri = audioUrl;

          // If base64 data URI, write to local temp file because Android MediaPlayer cannot play raw data URIs
          if (audioUrl.startsWith('data:')) {
            try {
              const base64Data = audioUrl.includes('base64,') ? audioUrl.split('base64,')[1] : audioUrl;
              const tempPath = `${FileSystem.cacheDirectory}vn_${Date.now()}_play.m4a`;
              await FileSystem.writeAsStringAsync(tempPath, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              playbackUri = tempPath;
            } catch (writeErr) {
              console.warn('[AudioPlayer] Error caching base64 audio:', writeErr);
            }
          }

          if (isStopped) return;

          const { sound } = await ExpoAudio.Sound.createAsync(
            { uri: playbackUri },
            { shouldPlay: true, volume: 1.0 },
            (status) => {
              if (isStopped) return;
              if (status.isLoaded) {
                if (status.durationMillis && status.positionMillis) {
                  const pct = Math.min(100, Math.round((status.positionMillis / status.durationMillis) * 100));
                  onProgress(pct);
                }
                if (status.didJustFinish) {
                  onProgress(100);
                  onEnded();
                }
              }
            }
          );
          currentActiveNativeSound = sound;
        } catch (err) {
          console.warn('[AudioPlayer] Native sound playback error:', err);
          onEnded();
        }
      })();

      return {
        stop: () => {
          isStopped = true;
          this.stopAll();
          onEnded();
        },
      };
    }

    // 2. Web Playback via HTML5 Audio
    try {
      const audio = new Audio(audioUrl);
      currentActiveWebAudio = audio;

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          const pct = Math.min(100, Math.round((audio.currentTime / audio.duration) * 100));
          onProgress(pct);
        }
      };

      audio.onended = () => {
        currentActiveWebAudio = null;
        onProgress(100);
        onEnded();
      };

      audio.onerror = (e) => {
        console.warn('[AudioPlayer] HTML5 Audio error:', e);
        currentActiveWebAudio = null;
        onEnded();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[AudioPlayer] play() rejected:', err);
          currentActiveWebAudio = null;
          onEnded();
        });
      }

      return {
        stop: () => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          currentActiveWebAudio = null;
          onEnded();
        },
      };
    } catch (err) {
      console.warn('[AudioPlayer] HTML5 Audio setup exception:', err);
      onEnded();
      return { stop: () => {} };
    }
  }
}
