/* global _*/

(function (context) {
  var lastDash = 0;

  var Bucket = function(angle, wheelSize) {
    this.mass = Math.random() * 100;
    this.angle = angle;
    this.wheelSize = wheelSize;
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
      this.x = this.wheelSize * 0.5 + this.wheelSize * 0.4 * Math.sin(this.angle);
      this.y = this.wheelSize * 0.5 + this.wheelSize * 0.4 * Math.cos(this.angle);
    },
    draw: function(ctx) {
      this.updatePosition();

      if (this.is_target) {
        ctx.fillStyle = '#8ED6FF';
        ctx.strokeStyle = '#8ED6FF';
        ctx.beginPath();
        ctx.setLineDash([5, lastDash++ % 5]);
        ctx.moveTo(this.wheelSize/2, this.y);
        ctx.lineTo(this.wheelSize/2, 0);
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = "#000000";
      } else {
        ctx.fillStyle = '#000000';
      }

      ctx.setLineDash([0]);

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.wheelSize/2, this.wheelSize/2);
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
          ctx.lineTo(this.x, this.wheelSize);
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

  var Wheel = function(numBuckets, fillRate, drainRate, canvas) {
    this.numBuckets = numBuckets;
    this.fillRate = fillRate;
    this.drainRate = drainRate;
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
      for (var i = 0; i < this.numBuckets; i++) {
        this.addBucket();
      }
      this.draw();
      this.canvas.addEventListener('click', this.toggleAnimating);
    },
    addBucket: function() {
      var angleDelta = 2 * Math.PI / (this.buckets.length + 1);
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i].angle = i * angleDelta;
      }
      this.buckets.push(new Bucket((i) * angleDelta, this.canvas.width));
    },

    removeBucket: function() {
      this.buckets = this.buckets.slice(1);
      var angleDelta = 2 * Math.PI / (this.buckets.length);
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i].angle = i * angleDelta;
      }
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
      var min_y = this.canvas.height,
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
        target.mass += this.fillRate;
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
      this.fillRate = new_value;
    },

    setDripRate: function(new_value) {
      this.drainRate = new_value;
    },

    animate: function() {
      var angularForce = 0;
      this.fillSpoutTarget();
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].targetBucket = false;
        angularForce += this.buckets[i].getDownwardForce();
      }
      for (i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].angle += angularForce / (1000 * this.numBuckets);
        if (this.buckets[i].mass > this.drainRate) {
          this.buckets[i].mass -= this.drainRate;
          var dripTarget = this.findBucketUnder(this.buckets[i]);

          if (dripTarget) {
            this.buckets[i].targetBucket = dripTarget;
            dripTarget.mass += this.drainRate;
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