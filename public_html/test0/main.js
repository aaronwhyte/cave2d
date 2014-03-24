var canvas = null;
var ctx = null;

function main() {
  canvas = document.querySelector('#canvas');
  ctx = canvas.getContext("2d");

  window.addEventListener("resize", function(){
    resizeCanvas();
  });
  resizeCanvas();

  initGestureListeners();
}

function resizeCanvas() {
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

function initGestureListeners() {
  document.body.addEventListener("touchstart", touchDraw);
  document.body.addEventListener("touchmove", touchDraw);
  document.body.addEventListener("touchend", touchDraw);
}

function touchDraw(evt) {
  for (var i = 0; i < event.touches.length; i++) {
    var touch = event.touches[i];
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, 20, 0, 2*Math.PI, true);
    ctx.fill();
    ctx.stroke();
  }
}
