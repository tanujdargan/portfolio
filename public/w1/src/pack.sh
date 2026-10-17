#!/bin/sh
# pack.sh <in.glb> <outdir>: webp textures (2048 and 1024) + meshopt geometry; individual commands keep empty nodes (pins)
IN=$1; OUT=$2; T=/tmp/w1-blender/_pack; mkdir -p $T
G="npx -y @gltf-transform/cli"
$G webp "$IN" $T/a.glb --quality 88 >/dev/null 2>&1
$G meshopt $T/a.glb "$OUT/room.glb" --level medium >/dev/null 2>&1
$G resize "$IN" $T/b.glb --width 1024 --height 1024 >/dev/null 2>&1
$G webp $T/b.glb $T/c.glb --quality 86 >/dev/null 2>&1
$G meshopt $T/c.glb "$OUT/room-1k.glb" --level medium >/dev/null 2>&1
ls -la "$OUT"/room*.glb
