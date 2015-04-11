/**
 * @constructor
 */
function Printer(renderer, glyphs) {
  this.renderer = renderer;
  this.glyphs = glyphs;

  this.matrix = new Matrix44();
}

Printer.prototype.printLine = function(startMatrix, nextCharMatrix, text) {
  this.matrix.set(startMatrix);
  for (var i = 0; i < text.length; i++) {
    var glyph = this.glyphs[text.charAt(i)];
    if (glyph) {
      this.renderer.setStamp(glyph);
      this.renderer.setModelMatrix(this.matrix);
      this.renderer.drawStamp();
    }
    this.matrix.multiply(nextCharMatrix);
  }
};