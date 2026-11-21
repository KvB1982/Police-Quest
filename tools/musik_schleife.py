import sys, wave, numpy as np
ein, aus = sys.argv[1], sys.argv[2]
w = wave.open(ein); sr = w.getframerate(); ch = w.getnchannels()
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64).reshape(-1, ch)
F, L = 4 * sr, 80 * sr
assert len(a) >= L + F, len(a)
t = np.linspace(0, np.pi / 2, F)[:, None]
x = a[L:L + F] * np.cos(t) + a[:F] * np.sin(t)      # Ende geht weich in den Anfang über (gleiche Leistung)
o = np.concatenate([a[F:L], x])
o = np.clip(o, -29000, 29000).astype(np.int16)
v = wave.open(aus, 'wb'); v.setnchannels(ch); v.setsampwidth(2); v.setframerate(sr); v.writeframes(o.tobytes())
# Naht: Sprung zwischen letztem und erstem Wert im Vergleich zu üblichen Sprüngen
d = np.abs(np.diff(o[:, 0].astype(float))); print(len(o) / sr, 'Naht', abs(float(o[-1, 0]) - float(o[0, 0])), 'üblich', round(float(np.percentile(d, 99)), 1))
