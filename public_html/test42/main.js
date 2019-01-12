let canvas, ctx, dg;
let v = new Vec2d();

const scale = 10;
const maxDist = 20;
const speed = 10;

function plot(x, y, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x * scale, y * scale, scale, scale);
}

function line(x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo((x0 + 0.5) * scale, (y0 + 0.5) * scale);
  ctx.lineTo((x1 + 0.5) * scale, (y1 + 0.5) * scale);
  ctx.stroke();
}

function main() {
  canvas = document.querySelector('canvas');
  ctx = canvas.getContext("2d");
  ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
  dg = new DistGrid(1);
  dg.maxFillDist = maxDist;

  // make some ground and nearby start-points
  for (let i = 0; i < 40; i++) {
    let x = Math.floor(canvas.width * (Math.random() * 0.5 + 0.25) / scale);
    let y = Math.floor(canvas.height * (Math.random() * 0.5 + 0.25) / scale);
    dg.setXY(x, y, x, y);
    dg.startKeys.delete(dg.keyAtPixelXY(x, y));
    if (!dg.getXY(x, y - 1)) {
      dg.addStartXY(x, y - 1);
    }
    plot(x, y, 'red');
  }
  requestAnimationFrame(step);
}

let lastSetCount = 0;

function step() {
  let steps = 0;
  let startTime = performance.now();
  while (performance.now() - startTime < 15 && steps < speed && dg.step()) {
    steps++;
    let key, pixel;
    key = dg.lastVisitKey;
    dg.keyToPixelVec(key, v);
    pixel = dg.getXY(v.x, v.y);
    if (!pixel) plot(v.x, v.y, 'rgba(255, 100, 255, 0.2');

    if (lastSetCount !== dg.setCount) {
      lastSetCount = dg.setCount;
      key = dg.lastSetKey;
      dg.keyToPixelVec(key, v);
      pixel = dg.getXY(v.x, v.y);
      if (pixel && pixel.pixelDist) {
        let c = Math.floor(200 * (1 - (0.5 + 0.5 * Math.cos(Math.PI * 5 * (pixel.pixelDist / dg.maxFillDist)))) + 55);
        let style = 'rgb(' + [0, 256 - c, c].join(', ') + ')';
        plot(v.x, v.y, style);
        line(v.x, v.y, pixel.nearPixelX, pixel.nearPixelY);
        plot(pixel.nearPixelX, pixel.nearPixelY, 'red');
      }
    }
  }
  if (steps) requestAnimationFrame(step);
}
