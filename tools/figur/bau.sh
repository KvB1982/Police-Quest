#!/bin/bash
# bau.sh name '{json}'  – Mensch bauen (ohne Bewegungen) und für das Spiel verkleinern
cd /tmp/mh/arbeit && python3 mensch.py $1.glb "$2" 2>&1 | grep "TEIL\|Maße\|gespeichert\|nicht gefunden\|Error\|Traceback\|gefärbt" 
cp /tmp/mh/arbeit/$1.glb /tmp/claude-0/-home-claude/194e93a4-2125-54e5-aee7-5db4fbc85ec4/scratchpad/otto/$1_roh.glb
cd /tmp/mh/gt && npx gltf-transform resize /tmp/mh/arbeit/$1.glb /tmp/mh/k1_$1.glb --width ${3:-1024} --height ${3:-1024} 2>&1 | tail -1 && npx gltf-transform webp /tmp/mh/k1_$1.glb /home/claude/police-quest/assets/modelle/$1.glb --quality 80 2>&1 | tail -1
