#!/bin/sh
# Rebuilds index.html from src/ (standalone web version using PeerJS)
cd "$(dirname "$0")"
python3 - <<'PY'
files = ['core.js','fighters.js','entities.js','enemies.js','stage.js','art.js','render.js','music.js','peerroom.js','net.js','game.js','ui.js']
js = "\n".join(open('src/'+f).read() for f in files)
t = open('template.html').read()
open('index.html','w').write(t.replace('<!--__PEERJS__-->','<script src="peerjs.min.js"></script>').replace('/*__JS__*/', js))
print('built index.html')
PY
