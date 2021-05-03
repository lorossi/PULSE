class Sketch extends Engine {
  preload() {
    this._spacing = 8;
    this._circle_radius = this._spacing * 0.5;
    this._temp_canvas_size = 500;
    this._duration = 300;
    this._channel = 240;
    this._alpha = 1;

    this.loadTextPixels();
  }

  setup() {

  }

  draw() {
    const percent = (this.frameCount % this._duration) / this._duration;
    //const percent = 0.5;

    this.ctx.save();
    this.ctx.fillStyle = "rgb(15, 15, 15)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (let y = 0; y < this.height; y += this._spacing) {
      const line_picked = this._pixels.filter(p => Math.abs(p.y - y) < this._temp_canvas_ratio);
      for (let x = 0; x < this.width; x += this._spacing) {
        const close = line_picked.some(p => Math.abs(p.x - x) < this._temp_canvas_ratio);
        if (close) {
          const pixel_dist = dist(x, y, this.width / 2, this.height / 2) / this._max_dist;
          const phi = pixel_dist * Math.PI;
          const omega = 8 * Math.PI;

          const gamma = Math.atan2(y - this.height / 2, x - this.width / 2);
          const trig = Math.cos(-phi + omega * percent);

          const r = Math.abs(trig * this._circle_radius);
          const blend = 0.5;
          const color = Math.abs(trig) * this._channel * blend + this._channel * (1 - blend);;
          const dpos = trig * this._circle_radius * 0.5;

          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.rotate(gamma);
          this.ctx.translate(dpos, 0);
          this.ctx.fillStyle = `rgb(${color}, ${color}, ${color}, ${this._alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, r, 0, 2 * Math.PI);
          this.ctx.fill();
          this.ctx.restore();
        }
      }
    }

    this.ctx.restore();

    if (this.frameCount % 120 == 0) console.log(this.frameRate);
  }

  loadTextPixels() {
    // temp canvas parameters
    const height = this._temp_canvas_size;
    const width = this._temp_canvas_size;
    const border = 0.1 * height;
    this._temp_canvas_ratio = this.height / this._temp_canvas_size; // ratio between temp canvas and real canvas
    // create temp canvas
    let temp_canvas;
    temp_canvas = document.createElement("canvas");
    temp_canvas.setAttribute("width", width);
    temp_canvas.setAttribute("height", height);
    let temp_ctx;
    temp_ctx = temp_canvas.getContext("2d", { alpha: false });
    // write text on temp canvas
    temp_ctx.save();
    this.background("black");
    temp_ctx.fillStyle = "white";
    temp_ctx.textAlign = "center";
    temp_ctx.textBaseline = "middle";
    temp_ctx.font = `${(height - border) / 3}px Hack`;
    temp_ctx.fillText("PULSE", width / 2, (height - border / 2) / 6 + border / 2);
    temp_ctx.fillText("PULSE", width / 2, (height - border / 2) / 2 + border / 2);
    temp_ctx.fillText("PULSE", width / 2, (height - border / 2) * 5 / 6 + border / 2);

    // get pixels
    const pixels = temp_ctx.getImageData(0, 0, width, height);
    this.background("black");
    temp_ctx.restore();

    // now it's time to reduce the array
    // keep track only if the pixels is empty or not
    this._pixels = [];
    for (let i = 0; i < pixels.data.length; i += 4) {
      for (let j = 0; j < 3; j++) {
        if (pixels.data[i + j] > 0) {
          // get pos (1D array to 2D array) and push to the array of pixels
          const pos = xy_from_index(parseInt(i / 4), pixels.width, this._temp_canvas_ratio);
          this._pixels.push(pos);
          break;
        }
      }
    }

    // sort the pixel by distance to calculate the max distance between two
    // pixels
    const sorted = this._pixels.sort((a, b) => -distSq(a.x, a.y, 0, 0) + distSq(b.x, b.y, 0, 0));
    this._max_dist = dist(sorted[0].x, sorted[0].y, sorted[sorted.length - 1].x, sorted[sorted.length - 1].y);
  }
}

const xy_from_index = (i, width, ratio = 1) => {
  const x = i % width;
  const y = parseInt(i / width);
  return { x: x * ratio, y: y * ratio };
};

const distSq = (x1, y1, x2, y2) => {
  return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
};

const dist = (x1, y1, x2, y2) => {
  return Math.sqrt(distSq(x1, y1, x2, y2));
};
