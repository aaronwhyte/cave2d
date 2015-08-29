rm -rf ../../build/cave2d/public_html/
cp -R public_html/ ../../build/cave2d/public_html/
find . -name "index.html" | xargs jscat -srcroot=../../src -destroot=../../build
