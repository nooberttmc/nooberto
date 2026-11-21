"""Self-check for piano_render.parse_sfz: the Salamander SFZ redefines $VEL before each velocity layer, so the defines
must be applied in file order. (A global substitution once made every velocity play the hardest layer.)
usage: python3 test_piano_render.py   (no samples needed)"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import piano_render

SFZ = """<control> default_path=
#define $VEL v1
<group> lovel=1 hivel=64
<region> sample=$VEL.wav key=60
#define $VEL v16
<group> lovel=65 hivel=127
<region> sample=$VEL.wav key=60
"""
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, 'test.sfz'); open(p, 'w').write(SFZ)
    P = piano_render.Piano(p, tuning='natural')
    soft, loud = P.pick(P.notes, 60, 30)[0], P.pick(P.notes, 60, 120)[0]
    assert soft['sample'] == 'v1.wav', soft
    assert loud['sample'] == 'v16.wav', loud
print('ok: soft and loud notes pick their own velocity layers')
