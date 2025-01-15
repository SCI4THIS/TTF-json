Parse TTF font files, export to JSON, convert to polygons with Webassembly port of jq-lang, tesselate and render to WebGL.

index.html is the entirety.  

Preview / use here

https://htmlpreview.github.io/?https://github.com/SCI4THIS/TTF-json/blob/main/index.html

jq.js and jq.js.wasm were generated with emcc on jq.  They are included in
the repo for ease of use.

index.html is the final compiled HTML amalgam file.  This is also provided
for ease of use.  If you want to experiment you can run

$ cd src; python3 -m http.server

to run a non-amalgamated version to more easily view logic flow.

For compiling the jq wasm see Robert Aboukhalil's jqkungfu project:

https://github.com/robertaboukhalil/jqkungfu

If compiling on a Windows/MSYS2 system see:

https://github.com/SCI4THIS/jqkungfu-msys2

Tesselation uses mapbox earcut.js which is available at:

https://github.com/mapbox/earcut.js
