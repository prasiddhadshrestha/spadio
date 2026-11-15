/**
 * VoiceController
 * Native Web Speech API wrapper for two-way hands-free navigation.
 * Supports spoken commands for track selection, playback transport, scales, scan modes, and speed.
 */

export class VoiceController {
  constructor(options = {}) {
    this.onCommand = options.onCommand || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.recognition = null;
    this.isListening = false;
    this.supported = false;

    this._init();
  }

  _init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.supported = false;
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatus({ listening: true, text: 'Listening for commands...' });
    };

    this.recognition.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript.trim().toLowerCase();
      const parsed = this._parseCommand(text);
      if (parsed) {
        this.onCommand(parsed, text);
        this.onStatus({ listening: true, text: `Command: "${text}"` });
      } else {
        this.onStatus({ listening: true, text: `Heard: "${text}" (unrecognized)` });
      }
    };

    this.recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        this.onStatus({ listening: this.isListening, error: event.error, text: `Voice error: ${event.error}` });
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Automatically restart if user hasn't explicitly toggled it off
        try {
          this.recognition.start();
        } catch {
          this.isListening = false;
          this.onStatus({ listening: false, text: 'Voice: Off' });
        }
      } else {
        this.onStatus({ listening: false, text: 'Voice: Off' });
      }
    };
  }

  _parseCommand(raw) {
    const s = raw.toLowerCase();

    // Channels
    if (/channel (one|1)|3d|orbit|globe|climate|time machine/.test(s)) return { type: 'set_channel', value: 'ch1' };
    if (/channel (two|2)|sound lab|satellite|jukebox|sonifier/.test(s)) return { type: 'set_channel', value: 'ch2' };

    // Transport
    if (/^(play|start|resume|power on)/.test(s)) return { type: 'play' };
    if (/^(pause|stop|hold|power off)/.test(s)) return { type: 'pause' };
    if (/^(toggle play|toggle)/.test(s)) return { type: 'toggle_play' };
    if (/^(loop on|enable loop)/.test(s)) return { type: 'set_loop', value: true };
    if (/^(loop off|disable loop)/.test(s)) return { type: 'set_loop', value: false };

    // Scales
    if (/minor/.test(s)) return { type: 'set_scale', value: 'minor' };
    if (/pentatonic/.test(s)) return { type: 'set_scale', value: 'pentatonic' };
    if (/whole tone|whole-tone/.test(s)) return { type: 'set_scale', value: 'wholeTone' };

    // Scan Modes
    if (/radar/.test(s)) return { type: 'set_scan', value: 'radar' };
    if (/west to east|left to right|horizontal/.test(s)) return { type: 'set_scan', value: 'lr' };
    if (/east to west|right to left/.test(s)) return { type: 'set_scan', value: 'rl' };
    if (/top to bottom|north to south|vertical/.test(s)) return { type: 'set_scan', value: 'tb' };
    if (/radial|center out/.test(s)) return { type: 'set_scan', value: 'rad' };

    // Speeds
    if (/faster|speed up/.test(s)) return { type: 'adjust_speed', delta: 1 };
    if (/slower|slow down/.test(s)) return { type: 'adjust_speed', delta: -1 };
    if (/speed (one|1)/.test(s)) return { type: 'set_speed', value: 1 };
    if (/speed (two|2)/.test(s)) return { type: 'set_speed', value: 2 };
    if (/speed (three|3)/.test(s)) return { type: 'set_speed', value: 3 };
    if (/speed (four|4)/.test(s)) return { type: 'set_speed', value: 4 };
    if (/speed (five|5)/.test(s)) return { type: 'set_speed', value: 5 };

    // Sound Styles
    if (/style auto|auto style/.test(s)) return { type: 'set_style', value: 'auto' };
    if (/sparkle/.test(s)) return { type: 'set_style', value: 'sparkle' };
    if (/flow/.test(s)) return { type: 'set_style', value: 'flow' };
    if (/layers|layer/.test(s)) return { type: 'set_style', value: 'layers' };
    if (/field/.test(s)) return { type: 'set_style', value: 'field' };
    if (/duet/.test(s)) return { type: 'set_style', value: 'duet' };

    // Track selections
    if (/aurora|city lights/.test(s)) return { type: 'select_track_name', query: 'aurora' };
    if (/night lights|black marble/.test(s)) return { type: 'select_track_name', query: 'night' };
    if (/sea surface|ocean currents|currents/.test(s)) return { type: 'select_track_name', query: 'sea-currents' };
    if (/aerosol|geos/.test(s)) return { type: 'select_track_name', query: 'aerosol' };
    if (/air quality/.test(s)) return { type: 'select_track_name', query: 'air' };
    if (/perpetual ocean/.test(s)) return { type: 'select_track_name', query: 'perpetual' };
    if (/co2|carbon/.test(s)) return { type: 'select_track_name', query: 'co2' };
    if (/atmospheric river|river/.test(s)) return { type: 'select_track_name', query: 'river' };
    if (/lightning/.test(s)) return { type: 'select_track_name', query: 'lightning' };
    if (/gedi|forest/.test(s)) return { type: 'select_track_name', query: 'gedi' };

    // Accessibility
    if (/high contrast|contrast/.test(s)) return { type: 'toggle_contrast' };
    if (/narration on|enable narration/.test(s)) return { type: 'set_narration', value: true };
    if (/narration off|disable narration/.test(s)) return { type: 'set_narration', value: false };
    if (/next track|next/.test(s)) return { type: 'next_track' };
    if (/previous track|previous|back/.test(s)) return { type: 'prev_track' };

    return null;
  }

  toggle() {
    if (!this.supported) return;
    if (this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch {}
      this.onStatus({ listening: false, text: 'Voice: Off' });
    } else {
      this.isListening = true;
      try {
        this.recognition.start();
      } catch {}
      this.onStatus({ listening: true, text: 'Starting microphone...' });
    }
  }
}
