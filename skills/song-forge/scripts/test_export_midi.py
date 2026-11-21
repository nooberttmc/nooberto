"""Self-check for export_midi.bake_pedal (the --fl export): usage: python3 test_export_midi.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_midi import bake_pedal
notes = [(0.0, 60, 0.2, 90), (0.5, 64, 0.2, 90), (1.0, 60, 0.2, 90), (3.0, 67, 0.2, 90)]
out = bake_pedal(notes, [(0.1, 2.0)])
assert abs(out[0][2] - 0.998) < 1e-9, out[0]   # held by the pedal, cut just before C is struck again at 1.0
assert abs(out[1][2] - 1.5) < 1e-9, out[1]     # held until the pedal lifts at 2.0
assert abs(out[2][2] - 1.0) < 1e-9, out[2]
assert abs(out[3][2] - 0.2) < 1e-9, out[3]     # pedal already up: unchanged
print('ok: pedal baked into note lengths')
