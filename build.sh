#!/bin/bash

gcc -o embed_wasm src/embed_wasm.c
./embed_wasm src/jq.js src/jq.js.wasm > tmp1.js
sed -f amalgamate_jq_js.sed src/index.html > tmp2.js
sed -f amalgamate_earcut.sed tmp2.js > tmp3.js
sed -f amalgamate_poly.sed tmp3.js > tmp4.js
sed -f amalgamate_ttf_json.sed tmp4.js > tmp5.js
sed -f amalgamate_glfontsdev.sed tmp5.js > tmp6.js
sed -f amalgamate_program.sed tmp6.js > tmp7.js
sed -f amalgamate_prag.sed tmp7.js > tmp8.js
sed -f amalgamate_vbo.sed tmp8.js > tmp9.js
sed -f amalgamate_matrix.sed tmp9.js > tmp10.js

mv tmp10.js index.html
rm tmp9.js
rm tmp8.js
rm tmp7.js
rm tmp6.js
rm tmp5.js
rm tmp4.js
rm tmp3.js
rm tmp2.js
rm tmp1.js
