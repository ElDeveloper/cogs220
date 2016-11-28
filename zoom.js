/*
 *
 *
 * @credits https://jsfiddle.net/Lom3b0gb/31/
 *
 */
function Zoom(args) {
  _.assign(this, {
    $buttons:   d3.select(".zoom-button"),
    $info:      d3.select("#zoom-info"),
    scale:      { max: 50, currentShift: 0 },
    $container: args.$container,
    datamap:    args.datamap
  });

  this.init();
}

Zoom.prototype.init = function() {
  var paths = this.datamap.svg.selectAll("path"),
    subunits = this.datamap.svg.selectAll(".datamaps-subunit");

  // preserve stroke thickness
  paths.style("vector-effect", "non-scaling-stroke");

  // disable click on drag end
  subunits.call(
    d3.behavior.drag().on("dragend", function() {
      d3.event.sourceEvent.stopPropagation();
    })
  );

  this.scale.set = this._getScalesArray();
  this.d3Zoom = d3.behavior.zoom().scaleExtent([ 1, this.scale.max ]);

  this._displayPercentage(1);
  this.listen();
};

Zoom.prototype.listen = function() {
  this.$buttons.on("click", null).on("click", this._handleClick.bind(this));

  this.datamap.svg
    .call(this.d3Zoom.on("zoom", this._handleScroll.bind(this)))
    .on("dblclick.zoom", null); // disable zoom on double-click
};

Zoom.prototype.reset = function() {
  this._shift("reset");
};

Zoom.prototype._handleScroll = function() {
  var translate = d3.event.translate,
    scale = d3.event.scale,
    limited = this._bound(translate, scale);

  this.scrolled = true;

  this._update(limited.translate, limited.scale);
};

Zoom.prototype._handleClick = function(event) {
  var direction = $(event.target).data("zoom");

  this._shift(direction);
};

Zoom.prototype._shift = function(direction) {
  var center = [ this.$container.width() / 2, this.$container.height() / 2 ],
    translate = this.d3Zoom.translate(), translate0 = [], l = [],
    view = {
      x: translate[0],
      y: translate[1],
      k: this.d3Zoom.scale()
    }, bounded;

  translate0 = [
    (center[0] - view.x) / view.k,
    (center[1] - view.y) / view.k
  ];

  if (direction == "reset") {
    view.k = 1;
    this.scrolled = true;
  } else {
    view.k = this._getNextScale(direction);
  }

  l = [ translate0[0] * view.k + view.x, translate0[1] * view.k + view.y ];

  view.x += center[0] - l[0];
  view.y += center[1] - l[1];

  bounded = this._bound([ view.x, view.y ], view.k);

  this._animate(bounded.translate, bounded.scale);
};

Zoom.prototype._bound = function(translate, scale) {
  var width = this.$container.width(),
    height = this.$container.height();

  translate[0] = Math.min(
    (width / height)  * (scale - 1),
    Math.max( width * (1 - scale), translate[0] )
  );

  translate[1] = Math.min(0, Math.max(height * (1 - scale), translate[1]));

  return { translate: translate, scale: scale };
};

Zoom.prototype._update = function(translate, scale) {
  this.d3Zoom
    .translate(translate)
    .scale(scale);

  this.datamap.svg.selectAll("g")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

  this._displayPercentage(scale);
};

Zoom.prototype._animate = function(translate, scale) {
  var _this = this,
    d3Zoom = this.d3Zoom;

  d3.transition().duration(350).tween("zoom", function() {
    var iTranslate = d3.interpolate(d3Zoom.translate(), translate),
      iScale = d3.interpolate(d3Zoom.scale(), scale);

    return function(t) {
      _this._update(iTranslate(t), iScale(t));
    };
  });
};

Zoom.prototype._displayPercentage = function(scale) {
  var value;

  value = Math.round(Math.log(scale) / Math.log(this.scale.max) * 100);
  this.$info.text(value + "%");
};

Zoom.prototype._getScalesArray = function() {
  var array = [],
    scaleMaxLog = Math.log(this.scale.max);

  for (var i = 0; i <= 10; i++) {
    array.push(Math.pow(Math.E, 0.1 * i * scaleMaxLog));
  }

  return array;
};

Zoom.prototype._getNextScale = function(direction) {
  var scaleSet = this.scale.set,
    currentScale = this.d3Zoom.scale(),
    lastShift = scaleSet.length - 1,
    shift, temp = [];

  if (this.scrolled) {

    for (shift = 0; shift <= lastShift; shift++) {
      temp.push(Math.abs(scaleSet[shift] - currentScale));
    }

    shift = temp.indexOf(Math.min.apply(null, temp));

    if (currentScale >= scaleSet[shift] && shift < lastShift) {
      shift++;
    }

    if (direction == "out" && shift > 0) {
      shift--;
    }

    this.scrolled = false;

  } else {

    shift = this.scale.currentShift;

    if (direction == "out") {
      shift > 0 && shift--;
    } else {
      shift < lastShift && shift++;
    }
  }

  this.scale.currentShift = shift;

  return scaleSet[shift];
};

function ZDatamaps(options) {
  this.$container = $(options.element);
  this._done = options.done;
  options.done = this._handleMapReady.bind(this);

  this.instance = new Datamaps(options);
}

ZDatamaps.prototype._handleMapReady = function(datamap) {
  this.zoom = new Zoom({
    $container: this.$container,
    datamap: datamap
  });
  if (this._done !== undefined) {
    this._done();
  }
}

/*
 * Helper class to display color legend information
 *
 * Note: This class is still very specific to the EMP colors.
 *
 * This class is based on the HTML found here:
 * http://jsfiddle.net/MTB2q/
 *
 **/
function Legend(element, colors) {
  var scope = this, list, row, names;

  this.$container = $('#' + element);

  list = $('<ul></ul>');
  this.$container.append(list);

  list.css({'list-style':'none',
            'color': '#6D6E71',
            'font-family': 'Arial',
            'font-size': '10px'
  });

  // make spans
  names = _.sortBy(_.keys(colors));
  _.each(names, function(name){
    color = colors[name];
    row = $('<li></li>');
    // FIXME: the fixed width here is dirty and terrible
    row.css({'float': 'left', 'margin-right': '10px', 'width': '113px'});

    row.append(scope._makeSpan(color));
    row.append(name);

    list.append(row);
  });

  this.$list = list;

  this.$canvas = $('<div></div>');
  this.$canvas.css({'position': 'fixed',
                    'bottom': '3px',
                    'width': '20%'});
  this.$canvas.append(list);

  this.$container.append(this.$canvas);

  return this;
}

/*
 *
 * Helper method to create spans with a style, instead of adding a CSS class.
 *
 **/
Legend.prototype._makeSpan = function(color) {
  var $spn = $('<span></span>');
  $spn.css({'border': 'none',
            'float': 'left',
            'width': '8px',
            'height': '8px',
            'margin': '2px',
            'background-color': color});
  return $spn;
};


function MatchMaker(container, map, edges, categories, arcOptions){
  var scope = this;

  this.$container = $(container);
  this.$canvas = $('<div></div>');
  this.$container.append(this.$canvas);
  this.$canvas.css({
    'position': 'absolute',
    'right': 0,
    'top': 0,
    'width': '211px'
  });

  this.map = map;
  this.edges = edges;

  this.$a = $('<select name="selector-a">');
  this.$b = $('<select name="selector-b">');

  this.$canvas.append(this.$a);
  this.$canvas.append(this.$b);

  this.arcOptions = arcOptions;

  _.each(categories, function(cat){
    scope.$a.append($('<option>').attr('value', cat).text(cat));

    scope.$b.append($('<option>').attr('value', cat).text(cat));
  });

  this.$reset = $('<button title="Clear Selection"></button>');
  this.$canvas.append(this.$reset);

  $(function(){
    scope.$a.chosen({width: '100%', search_contains: true,
                     placeholder_text_single: 'Select a Category'});
    scope.$a.val(null).trigger('chosen:updated').change();
    scope.$a.chosen().change(_.bind(scope.selectChanged, scope));

    scope.$b.chosen({width: '100%', search_contains: true,
                     placeholder_text_single: 'Select a Category'});
    scope.$b.val(null).trigger('chosen:updated').change();
    scope.$b.chosen().change(_.bind(scope.selectChanged, scope));

    scope.$reset.button({
      icon: "ui-icon-closethick",
      showLabel: false
    });
    scope.$reset.click(_.bind(scope.resetSelection, scope));
  });

  return this;
};

MatchMaker.prototype.selectChanged = function(){
  var a = this.$a.val(), b = this.$b.val();

  // nothing to see, moving on
  if (a === null || b === null) {
    return;
  }

  var arcs = _.filter(this.edges, function(arc){
    var o, d;

    o = arc.origin.empo_3;
    d = arc.destination.empo_3;

    return (a === o && b === d)  || (a === d && b === o);
  });

  if (arcs.length === 0) {
    this.print('No Matches Found'); 
    return;
  }

  // FIXME: find a better workaround to this
  var temp = this.arcOptions.animationSpeed;

  this.map.instance.arc([]);
  this.arcOptions.animationSpeed = 3;
  this.map.instance.arc(arcs, this.arcOptions);
  this.arcOptions.animationSpeed = temp;
}

MatchMaker.prototype.resetSelection = function() {
  this.$a.val(null).trigger('chosen:updated').change();
  this.$b.val(null).trigger('chosen:updated').change();

  this.map.instance.arc([]);
  this.map.instance.arc(this.edges, this.arcOptions);
}

MatchMaker.prototype.print = function(msg) { 
  var $msg = $('<div>' + msg + '</div>');
  $msg.css({
    'color': 'white',
    'font-family': 'Arial',
  });

  $msg.show().effect('highlight', {}, 300).delay(2000).fadeOut(function(){
    $msg.remove(); 
  });
  this.$canvas.append($msg);
}
