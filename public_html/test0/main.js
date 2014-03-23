function main() {
  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();
}

function resizeCanvas() {
  var canvas = document.querySelector('#canvas');
  var w = window.innerWidth;
  var h = window.innerHeight;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.strokeStyle="#0f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.stroke();
}
