/* global _*/

(function (context) {
  var lastDash = 0;

  var Bucket = function(angle, wheel_size) {
    this.mass = Math.random() * 100;
    this.angle = angle;
    this.wheel_size = wheel_size;
    this.initialize();
    this.__defineGetter__('width', function() {
      return this._width + Math.sqrt(this.mass);
    });
    this.__defineSetter__('width', function(width) {
      this._width = width;
    });
    this.__defineGetter__('height', function() {
      return this._height + Math.sqrt(this.mass);
    });
    this.__defineSetter__('height', function(height) {
      this._height = height;
    });
  }
  Bucket.prototype = {
    _width: 10,
    _height: 10,
    initialize: function() {
      this.updatePosition();
    },
    getDownwardForce: function() {
      return Math.sin(this.angle) * this.mass * -1;
    },
    updatePosition: function() {
      this.x = this.wheel_size * 0.5 + this.wheel_size * 0.3 * Math.sin(this.angle);
      this.y = this.wheel_size * 0.5 + this.wheel_size * 0.3 * Math.cos(this.angle);
    },
    draw: function(ctx) {
      this.updatePosition();

      if (this.is_target) {
        ctx.fillStyle = '#8ED6FF';
        ctx.strokeStyle = '#8ED6FF';
        ctx.beginPath();
        ctx.setLineDash([5, lastDash++ % 5]);
        ctx.moveTo(this.wheel_size/2, this.y);
        ctx.lineTo(this.wheel_size/2, 0);
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = "#000000";
      } else {
        ctx.fillStyle = '#000000';
      }

      ctx.setLineDash([0]);

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.wheel_size/2, this.wheel_size/2);
      ctx.lineWidth = 2;
      ctx.stroke();

      if (this.mass > 0) {
        ctx.strokeStyle = '#8ED6FF';
        ctx.beginPath();
        ctx.setLineDash([5, lastDash++ % 5]);
        ctx.moveTo(this.x, this.y);
        if (this.targetBucket) {
          ctx.lineTo(this.targetBucket.x, this.targetBucket.y);
        } else {
          ctx.lineTo(this.x, this.wheel_size);
        }
        ctx.lineWidth = 2;

        ctx.stroke();
      }
      ctx.strokeStyle = "#000000";


      ctx.fillRect(this.x - this.width / 2,
                   this.y - this.height / 2,
                   this.width, this.height);
    }
  };

  var Wheel = function(num_buckets, fill_rate, drain_rate, canvas) {
    this.num_buckets = num_buckets;
    this.fill_rate = fill_rate;
    this.drain_rate = drain_rate;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.framesRendered = 0;
    this.initialize();
  }
  Wheel.prototype = {
    spoutPosition: 300,
    initialize: function() {
      _.bindAll(this, 'toggleAnimating', 'animate', 'draw');
      this.buckets = [];
      for (var i = 0; i < this.num_buckets; i++) {
        this.addBucket();
      }
      this.draw();
      this.canvas.addEventListener('click', this.toggleAnimating);
    },
    addBucket: function() {
      var angleDelta = 2 * Math.PI / (this.buckets.length);
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i].angle = i * angleDelta;
      }
      this.buckets.push(new Bucket((i+1) * angleDelta, this.canvas.width));
    },
    toggleAnimating: function() {
      var self = this;
      if (!!this.interval) {
        context.clearInterval(this.interval);
        this.interval = undefined;
      } else {
        this.interval = context.setInterval(self.animate, 33);
      }
    },
    fillSpoutTarget: function() {
      var min_y = 6000,
          target = false;
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        var bucket = this.buckets[i],
            start_bucket = bucket.x - bucket.width / 2,
            stop_bucket = bucket.x + bucket.width / 2;
        bucket.is_target = false;
        if (bucket.y < min_y) {
          min_y = bucket.y;
          target = bucket;
        }
      }

      if (target !== false) {
        target.is_target = true;
        target.mass += this.fill_rate;
      }
    },
    findBucketUnder: function(sourceBucket) {
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        var testBucket = this.buckets[i];
        if (testBucket.x > sourceBucket.x - sourceBucket.width / 2 &&
            testBucket.x < sourceBucket.x + sourceBucket.width / 2 &&
            testBucket.y > sourceBucket.y) {
          return testBucket;
        }
      }
      return false;
    },

    setFillRate: function(new_value) {
      console.log('fill', new_value);
      this.fill_rate = new_value;
    },

    setDripRate: function(new_value) {
      console.log('drip', new_value);
      this.drip_rate = new_value;
    },

    animate: function() {
      var angularForce = 0;
      this.fillSpoutTarget();
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].targetBucket = false;
        angularForce += this.buckets[i].getDownwardForce();
      }
      for (i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].angle += angularForce / (1000 * this.num_buckets);
        if (this.buckets[i].mass > this.drain_rate) {
          this.buckets[i].mass -= this.drain_rate;
          var dripTarget = this.findBucketUnder(this.buckets[i]);

          if (dripTarget) {
            this.buckets[i].targetBucket = dripTarget;
            dripTarget.mass += this.drain_rate;
          }
        } else {
          this.buckets[i].mass = 0;
        }
      }
      this.draw();
    },
    draw: function() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].draw(this.ctx);
      }
    }

  };

  context.Wheel = Wheel;
})(window)