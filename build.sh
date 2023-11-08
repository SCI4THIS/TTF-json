#!/bin/bash

gcc -o embed_wasm tools/embed_wasm.c
./embed_wasm src/jq.js src/jq.js.wasm > tmp1.js
sed -f amalgamate_jq_js.sed src/index.html > tmp2.js
sed -f amalgamate_ttf_json.sed tmp2.js > tmp3.js

mv tmp3.js index.html
rm tmp2.js
rm tmp1.js
