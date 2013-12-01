/* global d3, _ */

(function (context) {

  var HISTORY_SIZE = 1000;

  var Graph = function(wheel) {
    _.bindAll(this, 'initialize', 'update');
    this.wheel = wheel;

  };

  Graph.prototype = {
    initialize: function() {
      var margin = {top: 20, right: 20, bottom: 30, left: 20},
          data = this.wheel.forceHistory;

      this.width = 960;
      this.height = 400 - margin.top - margin.bottom;

      this.svg = d3.select("#graph")
                 .attr("width", this.width + margin.left + margin.right)
                 .attr("height", this.height + margin.top + margin.bottom)
                 .append("g")
                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      //Create Y axis
      this.yEl = this.svg.append("g")
                 .attr("class", "axis")
                 .attr("transform", "translate(" + 30 + ",0)");
      this.xEl = this.svg.append("g")
                 .attr("class", "axis")
                 .attr("transform", "translate(0, "+this.height+")");

      this.path = this.svg.append("path");
    },

    update: function() {
      var data = this.wheel.forceHistory,
          self = this;

      this.x = d3.scale.linear()
               .range([30, this.width])
               .domain([0, data.length]);

      this.y = d3.scale.linear()
               .range([this.height, 0])
               .domain([d3.min(data), d3.max(data)]);

      var yAxis = d3.svg.axis()
                  .scale(this.y)
                  .orient("left")
                  .ticks(10);

      this.yEl.call(yAxis);

      this.line = d3.svg.line()
//                  .interpolate('basis')
		  .x(function(d, i) { return self.x(i); })
		  .y(function(d) { return self.y(d); });


      this.path.datum(data)
      .attr("d", this.line);
    }
  };

  var Bucket = function(angle, wheel) {
    this.wheelSize = wheel.canvas.width;
    this.wheel = wheel;
    this.mass = 100 + Math.random() * 100;
    this.angle = angle;
    this.initialize();
    this.__defineGetter__('width', function() {
      return ((Math.PI * 0.8) / this.wheel.numBuckets) * this.wheel.canvas.width;
    });
    this.__defineSetter__('width', function(width) {
      this._width = width;
    });
    this.__defineGetter__('height', function() {
      return this._height + Math.sqrt(this.mass / (this.wheel.numBuckets+1));
    });
    this.__defineSetter__('height', function(height) {
      this._height = height;
    });
  }
  Bucket.prototype = {
    _width: 10,
    _height: 10,
    baseMass: 5,
    initialize: function() {
      this.updatePosition();
    },
    getDownwardForce: function() {
      return Math.sin(this.angle) * (this.mass + 1) * -1;
    },
    updatePosition: function() {
      this.x = this.wheelSize * 0.5 + this.wheelSize * 0.4 * Math.sin(this.angle);
      this.y = this.wheelSize * 0.5 + this.wheelSize * 0.4 * Math.cos(this.angle);
    },
    draw: function(ctx) {
      this.updatePosition();

      if (this.is_target) {
        ctx.save();
        ctx.fillStyle = '#8ED6FF';
        ctx.strokeStyle = '#8ED6FF';
        ctx.beginPath();
        ctx.moveTo(this.wheel.spoutPosition, this.y);
        ctx.lineTo(this.wheel.spoutPosition, 0);
        ctx.lineWidth = (this.wheel.fillRate / 200.0) * 20;
        ctx.stroke();
        ctx.strokeStyle = "#000000";
        ctx.restore();
      } else {
        ctx.fillStyle = '#000000';
      }

      if (this.mass > 0 && this.wheel.drainRate > 0) {
        ctx.strokeStyle = '#8ED6FF';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        if (this.targetBucket) {
          ctx.lineTo(this.x, this.targetBucket.y);
        } else {
          ctx.lineTo(this.x, this.wheelSize);
        }
        ctx.lineWidth = (this.wheel.drainRate / 200.0) * 20 + 1;
        ctx.stroke();
      }
      ctx.strokeStyle = "#000000";

      ctx.fillRect(this.x - this.width / 2,
                   this.y - this.height / 2,
                   this.width, this.height);
    }
  };

  var Wheel = function(numBuckets, fillRate, drainRate, canvas) {
    this.forceHistory = [];
    this.initialBuckets = numBuckets;
    this.fillRate = fillRate;
    this.drainRate = drainRate;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.initialize();
  }

  Wheel.prototype = {
    friction: 0.01,
    framesRenderer: 0,
    spoutPosition: 300,

    initialize: function() {
      _.bindAll(this, 'toggleAnimating', 'animate', 'draw');
      this.graph = new Graph(this);
      this.graph.initialize();

      this.buckets = [];
      for (var i = 0; i < this.initialBuckets; i++) {
        this.addBucket();
      }
      this.draw();
      this.canvas.addEventListener('click', this.toggleAnimating);
      this.graph.update();
    },

    addBucket: function() {
      var angleDelta = 2 * Math.PI / (this.buckets.length + 1);
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i].angle = i * angleDelta;
      }
      this.buckets.push(new Bucket((i) * angleDelta, this));
      this.numBuckets = this.buckets.length;
    },

    adjustBaseBucketWidth: function(newValue) {
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i]._width = newValue;
      }
    },

    removeBucket: function() {
      this.buckets = this.buckets.slice(1);
      var angleDelta = 2 * Math.PI / (this.buckets.length);
      for (var i = 0; i < this.buckets.length; i++) {
        this.buckets[i].angle = i * angleDelta;
      }
      this.numBuckets = this.buckets.length;
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
        if (this.spoutPosition > bucket.x - bucket.width / 2 &&
            this.spoutPosition < bucket.x + bucket.width / 2 &&
            bucket.y < min_y) {
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
      var result = false,
          resultY = Infinity;

      for (var i = 0, l = this.buckets.length; i < l; i++) {
        var testBucket = this.buckets[i];
        if (testBucket.x > sourceBucket.x - (sourceBucket.width / 2) &&
            testBucket.x < sourceBucket.x + (sourceBucket.width / 2) &&
            testBucket.y > sourceBucket.y) {
          if (testBucket.y < resultY) {
            resultY = testBucket.y;
            result = testBucket;
          }
        }
      }
      return result;
    },

    setFillRate: function(newValue) {
      this.fillRate = newValue;
    },

    setDripRate: function(newValue) {
      this.drainRate = newValue;
    },

    setFriction: function(newValue) {
      this.friction = newValue;
    },

    animate: function() {
      var angularForce = 0;
      this.fillSpoutTarget();
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].targetBucket = false;
        angularForce += this.buckets[i].getDownwardForce();
      }
      angularForce *= 1 - this.friction;

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

      if (this.forceHistory.length > HISTORY_SIZE) this.forceHistory = this.forceHistory.slice(1);
      this.forceHistory.push(angularForce/ (this.numBuckets));
      this.graph.update();

    },

    drawSpokes: function() {
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.buckets[i].x, this.buckets[i].y);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    },

    draw: function() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      for (var i = 0, l = this.buckets.length; i < l; i++) {
        this.buckets[i].draw(this.ctx);
      }
      this.drawSpokes();
    }

  };
  context.Graph = Graph;
  context.Wheel = Wheel;
})(window)
