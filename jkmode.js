// Modified from alamode (https://github.com/mode/alamode/blob/master/alamode.js)

var version = "0.1";

var jkmode = {

  reportError: function(msg) {
    $("<h1 class='mode-error'>").text(msg).prependTo(document.body);
  },

  makeId: function(chars) {
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      text = "";

    for (var i = 0; i < chars; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  },

  getDataFromQuery: function(queryName) {
    var data = datasets.filter(function(d) {
      if (d) {
        return d.queryName == queryName;
      };
    })[0];
    if (!data) {
      jkmode.reportError("No such query: '" + queryName + "'");
      return [];
    }
    return data.content;
  },

  addContainerElement: function(el, clear) {

    clear = clear || false;

    id = jkmode.makeId(10);

    if (el == "body") {
      $("<div id='" + id + "'></div>").addClass(id).addClass("mode-graphic-container").appendTo(".mode-content");
    } else if ($(el).length === 0) {
      jkmode.reportError("No such element: '" + el + "'");
    } else {

      if (clear) {
        $(el).empty();
      }

      $(el).addClass("mode-graphic-container");
      $(el).addClass(id);
    }

    return "." + id;
  },

  // Modified from Kerry Rodden's "sequence sunburst"
  // https://bl.ocks.org/kerryrodden/7090426

  sunburstChart: function(o) {
    var id = jkmode.makeId(10);

    var queryName = o["query_name"],
      eventColumns = o["event_columns"],
      valueColumn = o["event_counts"],
      // Optional
      title = o["title"] || queryName,
      colorRange = o["color_range"] || ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf", "#999999"],
      htmlElement = o["html_element"] || "body";

    var data = jkmode.getDataFromQuery(queryName);

    var height = 500,
      width = 850,
      radius = Math.min(width, height) / 2,
      breadcrumbWidth = (width) / eventColumns.length,
      b = {
        w: breadcrumbWidth,
        h: 30,
        s: 3,
        t: 10
      };

    var parentsList = [];
    parentsList = parentsList.concat(_.uniq(_.map(data, "Funnel Stage")));

    var parents = _.uniq(parentsList)

    var parentColors = {}
    parents.forEach(function(e, i) {
      if (e != null) {
        parentColors[e] = colorRange[i % (colorRange.length)];
      }
    })

    var totalSize = 0;

    var uniqContainerClass = jkmode.addContainerElement(htmlElement);

    d3.select(uniqContainerClass)
      .append("div")
      .attr("class", "mode-graphic-title")
      .text(title)

    d3.select(uniqContainerClass)
      .append("div")
      .attr("class", "mode-sunburst-sequence")
      .attr("id", "sequence-" + id)

    d3.select(uniqContainerClass)
      .append("div")
      .attr("class", "mode-sunburst")
      .attr("id", id)

    d3.select(uniqContainerClass)
      .append("div")
      .attr("class", "mode-sunburst-total-interactions-count")
      .attr("id", "total-interactions-count-" + id)

    d3.select(uniqContainerClass)
      .append("div")
      .attr("class", "mode-sunburst-legend-container")
      .attr("id", "legend-container-" + id)

    vis = d3.select("#" + id).append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    vis.append("text")
      .attr("x", 0)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("class", "mode-sunburst-explanation mode-sunburst-percentage mode-sunburst-explanation-" + id)
      .attr("id", "percentage-" + id)
      .style("visibility", "hidden")
      .text("");

    vis.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("class", "mode-sunburst-explanation mode-sunburst-explanation-" + id)
      .attr("id", "of-total-interactions-" + id)
      .style("visibility", "hidden")
      .text("of Total Support Interactions")

    vis.append("text")
      .attr("x", 0)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("class", "mode-sunburst-explanation mode-sunburst-cond-percentage mode-sunburst-explanation-" + id)
      .attr("id", "cond-percentage-" + id)
      .style("visibility", "hidden")
      .text("")

    vis.append("text")
      .attr("x", 0)
      .attr("y", 50)
      .attr("text-anchor", "middle")
      .attr("class","mode-sunburst-explanation mode-sunburst-explanation-" + id)
      .attr("id", "from-funnel-stage-" + id)
      .style("visibility", "hidden")
      .text("")

    var partition = d3.layout.partition()
      .size([2 * Math.PI, radius * radius])
      .value(function(d) {
        return d.size;
      });

    var arc = d3.svg.arc()
      .startAngle(function(d) {
        return d.x;
      })
      .endAngle(function(d) {
        return d.x + d.dx;
      })
      .innerRadius(function(d) {
        return Math.sqrt(d.y);
      })
      .outerRadius(function(d) {
        return Math.sqrt(d.y + d.dy);
      });

    var formattedData = [];

    data.forEach(function(d) {
      var sequence = "";

      for (i = 0; i < eventColumns.length; i++) {

        if (i != 0) {
          prefix = "-~-";
        } else {
          prefix = "";
        }

        if (d[eventColumns[i]] == null) {
          sequence = sequence + prefix + "end";
          break;
        } else {
          sequence = sequence + prefix + d[eventColumns[i]];
        }
      }

      var ent = {
        0: sequence,
        1: d[valueColumn]
      }

      formattedData.push(ent)
    })

    var json = buildHierarchy(formattedData);

    createVisualization(json);

    function createVisualization(json) {

      initializeBreadcrumbTrail();

      vis.append("svg:circle")
        .attr("r", radius)
        .style("opacity", 0);

      var nodes = partition.nodes(json)
        .filter(function(d) {
          return (d.dx > 0.001); // Filter out really small segments
        });

      drawLegend(nodes[0].value);

      var path = vis.data([json]).selectAll("path")
        .data(nodes)
        .enter().append("svg:path")
        .attr("id", "path-" + id)
        .attr("display", function(d) {
          return d.depth ? null : "none";
        })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("fill", function(d) {
          if (d.parent != null) {
            if (d.parent.name == "root") {
              return parentColors[d.name];
            } else {
              return parentColors[d.parent.name];
            }
          }
        })
        .attr("opacity", function(d) {
          if (d.parent != null) {
            if (d.parent.name != "root") {
              var maxChildSize = d.parent.children[0].size;
              var minChildSize = d.parent.children[d.parent.children.length - 1].size;

              return (d.value - minChildSize) / (maxChildSize - minChildSize) * (0.8 - 0.2) + 0.2;
            } else {
              return 1.0;
            }
          }
        })
        .style("opacity", function() {
          return d3.select(this).attr("opacity");
        })
        .on("mouseover", mouseover);

      vis.on("mouseleave", mouseleave);

      totalSize = path.node().__data__.value;
    };

    function mouseover(d) {

      console.log(id);

      var percentage = (100 * d.value / totalSize).toFixed(2);
      var percentageString = percentage + "%";
      if (percentage < 0.1) {
        percentageString = "< 0.1%";
      }

      //Calculate conditional percentage
      var sequenceArray = getAncestors(d);
      var parent_conditional_value = d.parent.value;
      var cond_percentage = (100 * d.value / parent_conditional_value).toFixed(2);
      var cond_percentageString = cond_percentage + "%";
      if (cond_percentage < 1.0) {
        cond_percentageString = "< 1.0%";
      }

      d3.select("#percentage-" + id)
        .attr("y", -20)

      d3.select("#of-total-interactions-" + id)
        .attr("y", 0)

      d3.select("#cond-percentage-" + id)
        .text(cond_percentageString);

      d3.select("#from-funnel-stage-" + id)
        .text("of " + d.parent.name);

      if (d.parent.name == "root") {
        d3.select("#percentage-" + id)
          .attr("y", 0)

        d3.select("#of-total-interactions-" + id)
          .attr("y", 20)

        d3.select("#cond-percentage-" + id)
          .text("");

        d3.select("#from-funnel-stage-" + id)
          .text("");
      }

      d3.select("#percentage-" + id)
        .text(percentageString);

      d3.selectAll(".mode-sunburst-explanation-" + id)
        .style("visibility", "");

      var sequenceArray = getAncestors(d);
      updateBreadcrumbs(sequenceArray, percentageString);

      d3.selectAll("#path-" + id)
        .style("opacity", function() {
          return d3.select(this).attr("opacity") * 0.5;
        });

      d3.selectAll("#path-" + id)
        .filter(function(node) {
          return (sequenceArray.indexOf(node) >= 0);
        })
        .style("opacity", 1);
    }

    function mouseleave(d) {

      d3.selectAll(".breadcrumb-trail")
        .style("visibility", "hidden");

      d3.selectAll("#path-" + id).on("mouseover", null);
      // d3.selectAll(".mode-sunburst-explanation").on("mouseover", null);

      // Compatibility for d3 v3 and v4
      if (d3.version.split(".")[0] == 4) {
        d3.selectAll("#path-" + id)
          .transition()
          .duration(100)
          .style("opacity", function() {
            return d3.select(this).attr("opacity");
          })
          .on("end", function() {
            d3.select(this).on("mouseover", mouseover);
          })
      } else {
        d3.selectAll("#path-" + id)
          .transition()
          .duration(100)
          .style("opacity", function() {
            return d3.select(this).attr("opacity");
          })
          .each("end", function() {
            d3.select(this).on("mouseover", mouseover);
          })
      }

      d3.selectAll(".mode-sunburst-explanation")
        .style("visibility", "hidden");
    }

    function getAncestors(node) {
      var path = [];
      var current = node;
      while (current.parent) {
        path.unshift(current);
        current = current.parent;
      }
      return path;
    }

    function initializeBreadcrumbTrail() {
      var trail = d3.select("#sequence-" + id).append("svg:svg")
        .attr("width", width)
        .attr("height", 50)
        .attr("class", "breadcrumb-trail")
        .attr("id", "trail-" + id);

      trail.append("svg:text")
        .attr("id", "endlabel")
        .style("fill", "#000");
    }

    function breadcrumbPoints(d, i) {
      var points = [];
      points.push("0,0");
      points.push(b.w + ",0");
      points.push(b.w + b.t + "," + (b.h / 2));
      points.push(b.w + "," + b.h);
      points.push("0," + b.h);
      if (i > 0) {
        points.push(b.t + "," + (b.h / 2));
      }
      return points.join(" ");
    }

    function updateBreadcrumbs(nodeArray, percentageString) {

      var g = d3.select("#trail-" + id)
        .selectAll("g")
        .data(nodeArray, function(d) {
          return d.name + d.depth;
        });

      var entering = g.enter().append("svg:g");

      entering.append("svg:polygon")
        .attr("points", breadcrumbPoints)
        .style("fill", function(d) {
          if (d.parent != null) {
            if (d.parent.name == "root") {
              return parentColors[d.name];
            } else {
              return parentColors[d.parent.name];
            }
          }
        })
        .style("opacity", function(d) {
          if (d.parent != null) {
            if (d.parent.name != "root") {
              return 0.5;
            } else {
              return 1.0;
            }
          }
        })

      entering.append("svg:text")
        .attr("x", (b.w + b.t) / 2)
        .attr("y", b.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .style("fill", function(d) {
          var bgColor;
          var textColor = "#fff"

        if (d.parent != null) {
          if (d.parent.name == "root") {
            bgColor = parentColors[d.name];
          } else {
            bgColor = parentColors[d.parent.name];
          }
        }

        if (bgColor == "#ff7f00" || bgColor == "#ffff33") {
          textColor = "#000";
        } else {
          if (d.parent != null) {
            if (d.parent.name != "root") {
              textColor = "#000";
            }
          }
        }

        return textColor;
      })
      .style("font-size", "1.2em")
      .text(function(d) {
        return d.name + " (n = " + numberWithCommas(d.value) + ")";
      });

      g.attr("transform", function(d, i) {
        if (i > 5 && i < 10) {
          i = i - 5;
          return "translate(" + i * (b.w + b.s) + ", 20)";
        } else if (i > 10) {
          i = i - 11;
          return "translate(" + i * (b.w + b.s) + ", 40)";
        } else {
          return "translate(" + i * (b.w + b.s) + ", 0)";
        }
      });

      g.exit().remove();

      d3.select("#trail-" + id)
        .style("visibility", "");
    }

    function drawLegend(v) {

      var li = {
        w: 30,
        h: 30,
        s: 3,
        r: 3
      };

      divContainer = d3.select("#total-interactions-count-" + id)

      svg = divContainer.append("svg:svg")
        .attr("width", "100%")
        .attr("height", li.h);

      svg.append("svg:text")
        .attr("x", "50%")
        .attr("y", li.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text("Total Interactions (N = " + numberWithCommas(v) + ")");

      d3.entries(parentColors).forEach(function(c) {

        divContainer = d3.select("#legend-container-" + id)
          .append("div")
          .attr("class", "mode-sunburst-legend")
          .attr("id", "legend-" + id)

        svg = divContainer.append("svg:svg")
          .attr("width", "100%")
          .attr("height", li.h);

        svg.append("svg:rect")
          .attr("rx", li.r)
          .attr("ry", li.r)
          .attr("width", li.w)
          .attr("height", li.h)
          .style("fill", function() {
            return c.value;
          });

        svg.append("svg:text")
          .attr("x", li.w + 10)
          .attr("y", li.h / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "left")
          .text(function() {
            return c.key;
          });
      })
    }

    function buildHierarchy(csv) {
      var root = {
        "name": "root",
        "children": []
      };
      for (var i = 0; i < csv.length; i++) {
        var sequence = csv[i][0];
        var size = +csv[i][1];
        if (isNaN(size)) {
          continue;
        }
        var parts = sequence.split("-~-");
        var currentNode = root;
        for (var j = 0; j < parts.length; j++) {
          var children = currentNode["children"];
          var nodeName = parts[j];
          var childNode;
          if (j + 1 < parts.length) {

            var foundChild = false;
            for (var k = 0; k < children.length; k++) {
              if (children[k]["name"] == nodeName) {
                childNode = children[k];
                foundChild = true;
                break;
              }
            }

            if (!foundChild) {
              childNode = {
                "name": nodeName,
                "children": []
              };
              children.push(childNode);
            }
            currentNode = childNode;
          } else {

            childNode = {
              "name": nodeName,
              "size": size
            };
            children.push(childNode);
          }
        }
      }
      return root;
    };

    function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
  }
};
