Parse TTF / OTF font files and export to JSON.

index.html is the entirity.  

Preview / use here

https://htmlpreview.github.io/?https://github.com/SCI4THIS/TTF-json/blob/main/index.html

jq.js and jq.js.wasm were generated with emcc on jq.  They are included in
the repo for ease of use.

index.html is the final compiled HTML amalgam file.  This is also provided
for ease of use.  If you want to experiment you can run

$ cd src; python3 -m http.server

to run a non-amalgamated version to more easily view logic flow.
