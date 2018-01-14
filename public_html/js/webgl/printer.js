/**
 * @constructor
 */
function Printer(renderer, glyphs) {
  this.renderer = renderer;
  this.glyphs = glyphs;

  this.lineMatrix = new Matrix44();
  this.charMatrix = new Matrix44();
}

Printer.prototype.printLine = function(startMatrix, nextCharMatrix, text) {
  this.charMatrix.set(startMatrix);
  for (let i = 0; i < text.length; i++) {
    let glyph = this.glyphs[text.charAt(i)];
    if (glyph) {
      this.renderer.setStamp(glyph);
      this.renderer.setModelMatrix(this.charMatrix);
      this.renderer.drawStamp();
    }
    this.charMatrix.multiply(nextCharMatrix);
  }
};

Printer.prototype.printMultiLine = function(startMatrix, nextCharMatrix, nextLineMatrix, text) {
  this.lineMatrix.set(startMatrix);
  this.charMatrix.set(this.lineMatrix);
  for (let i = 0; i < text.length; i++) {
    let char = text.charAt(i);
    if (char === '\n') {
      this.lineMatrix.multiply(nextLineMatrix);
      this.charMatrix.set(this.lineMatrix);
    } else {
      let glyph = this.glyphs[char];
      if (glyph) {
        this.renderer.setStamp(glyph);
        this.renderer.setModelMatrix(this.charMatrix);
        this.renderer.drawStamp();
      }
      this.charMatrix.multiply(nextCharMatrix);
    }
  }
};