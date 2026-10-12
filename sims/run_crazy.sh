#!/bin/bash
# Crazy mode only: every difficulty pairing, 4 jobs at a time. Results land in results/*.json
cd "$(dirname "$0")"; mkdir -p results
jobs=();mode=crazy
L=(easy normal hard)
for ((i=0;i<3;i++)); do for ((j=i;j<3;j++)); do jobs+=("$mode ${L[i]} ${L[j]} 2000 0"); done; done
for o in easy normal hard; do jobs+=("$mode expert $o 50 0" "$mode expert $o 50 1"); done
jobs+=("$mode expert expert 30 0" "$mode expert expert 30 1")
printf '%s\n' "${jobs[@]}" | xargs -P 4 -L 1 sh -c 'node sim.js "$0" "$1" "$2" "$3" "$4" > "results/$0-$1-$2-$4.json"'
echo done
