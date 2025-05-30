import sys
import librosa
import numpy as np
import json

filename = sys.argv[1]
y, sr = librosa.load(filename, sr=16000)

# Basic tone metrics
duration = librosa.get_duration(y=y, sr=sr)
energy = np.mean(librosa.feature.rms(y=y))
pitch, _, _ = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
pitch_clean = pitch[~np.isnan(pitch)]
avg_pitch = float(np.mean(pitch_clean)) if len(pitch_clean) else 0
pitch_range = float(np.max(pitch_clean) - np.min(pitch_clean)) if len(pitch_clean) else 0
silence = sum(1 for amp in librosa.feature.rms(y=y)[0] if amp < 0.01)

# Naive filler word estimation
est_fillers = int(duration * 1.2) // 10

result = {
    "duration_sec": round(duration, 2),
    "average_pitch_hz": round(avg_pitch, 2),
    "pitch_range_hz": round(pitch_range, 2),
    "energy_level": round(energy, 5),
    "silent_moments": silence,
    "estimated_filler_words": est_fillers
}

print(json.dumps(result))
