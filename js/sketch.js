class Sketch extends Engine {
  preload() {
    // parameters
    this._spacing = 10;
    this._rect_side = 22;
    this._temp_canvas_size = 150;
    this._duration = 600;
    this._channel = 240;
    this._recording = false;
    // this needs to be done only once
    this._loadTextPixels();
  }

  setup() {
    // sketch setup
    console.clear();
    // setup capturer
    if (this._recording) {
      this._capturer = new CCapture({ format: "png" });
      this._capturer_started = false;
    }
  }

  draw() {
    if (!this._capturer_started && this._recording) {
      this._capturer_started = true;
      this._capturer.start();
      console.log("%c Recording started", "color: green; font-size: 2rem");
    }

    const percent = (this.frameCount % this._duration) / this._duration;
    //const percent = 0.5;

    this.ctx.save();
    // clear background
    this.ctx.fillStyle = "rgb(35, 35, 35)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (let y = 0; y < this.height; y += this._spacing) {
      // check if this line is over the text
      const line_picked = this._pixels.filter(p => Math.abs(p.y - y) < this._temp_canvas_ratio);
      for (let x = 0; x < this.width; x += this._spacing) {
        // check if this pixels is over the text
        const close = line_picked.some(p => Math.abs(p.x - x) < this._temp_canvas_ratio);
        if (close) {
          // pixel position relative to the max distance between two pixels
          const pixel_dist = dist(x, y, this.width / 2, this.height / 2) / this._max_dist;
          // gives motion relative to position
          const phi = pixel_dist * Math.PI;
          // gives motion relative to time
          const omega = 2 * Math.PI;
          // context rotation, emulates movement
          const gamma = Math.atan2(y - this.height / 2, x - this.width / 2);
          // trigonometric function called many times below
          const trig = Math.abs(Math.cos(-phi + omega * percent));
          // length of the rect of the side
          const side = trig * this._rect_side;
          // position displacement
          const dpos = ease(trig) * this._rect_side * pixel_dist * 2;
          // channel (white amount) changes over time
          const color_blend = 0.5;
          const color = trig * this._channel * color_blend + this._channel * (1 - color_blend);
          // alpha (transparency) changes over time
          const alpha_blend = 0.8;
          const alpha = trig * alpha_blend + (1 - alpha_blend);
          // offset position variation changes over time
          const aberration_offset = 5 * (1 - trig);

          this.ctx.save();
          this.ctx.translate(x + side / 2, y + side / 2);
          this.ctx.rotate(gamma);
          this.ctx.translate(dpos, 0);
          this.ctx.rotate(-gamma);

          this.ctx.globalCompositeOperation = "screen";

          // draw main rect
          this.ctx.fillStyle = `rgb(${color}, ${color}, ${color}, ${alpha})`;
          this.ctx.fillRect(-side / 2, -side / 2, side / 2, side / 2);
          // add chromatic aberration effect
          this.ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
          this.ctx.fillRect(-side / 2 - aberration_offset / 2, -side / 2 - aberration_offset / 2, side / 2, side / 2);
          this.ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
          this.ctx.fillRect(-side / 2 + aberration_offset / 2, -side / 2 - aberration_offset / 2, side / 2, side / 2);
          this.ctx.fillStyle = "rgba(0, 0, 255, 0.9)";
          this.ctx.fillRect(-side / 2, -side / 2 + aberration_offset, side / 2, side / 2);

          this.ctx.restore();
        }
      }
    }

    this.ctx.restore();

    // handle recording
    if (this._recording) {
      if (this._frameCount < this._duration) {
        this._capturer.capture(this._canvas);
      } else {
        this._recording = false;
        this._capturer.stop();
        this._capturer.save();
        console.log("%c Recording ended", "color: red; font-size: 2rem");
      }
    }
  }

  _loadTextPixels() {
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

const ease = x => Math.pow(x, 5);
