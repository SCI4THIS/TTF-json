function consolidate_spaces(s)
{
  s_ = s;
  do {
    s = s_;
    s_ = s.replace(/  /g, " ");
  } while (s_ != s);
  return s_;
}

/* Triangle area computed by Heron's formula */
function tri_area(p1, p2, p3)
{
/*
  let a = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  let b = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
  let c = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
  let s = (a + b + c) / 2;
  return Math.sqrt(s * (s  - a) * (s - b) * (s - c));
*/
/* Magic from https://byjus.com/maths/collinear-points */
  let a = p1.x * (p2.y - p3.y);
  let b = p2.x * (p3.y - p1.y);
  let c = p3.x * (p1.y - p2.y);
  return 0.5 * Math.abs(a + b + c);
}

/* Line segment is 2x 2d points { p1: {x,y}, p2: {x,y}}
 * This functions determines if two segments intersect each other.
 * The basic principle is to convert the line segments to u, v coordinates.
 * where
 *               | p1.x |     | p2.x - p1.x |
 *       seg1 =  | p1.y | + u | p2.y - p1.y |
 *
 *                 | p1.x |                | p2.x |
 * so that: seg1 = | p1.y |  at u = 0, and | p2.y | at u = 1
 *
 * similar for seg2, using v coordinates
 * then we want to solve
 *
 * | s1p1.x |     | s1p2.x - s1p1.x |   | s2p1.x |     | s2p2.x - s2p1.x |
 * | s1p1.y | + u | s1p2.y - s1p1.y | = | s2p1.y | + v | s2p2.y - s2p1.y |
 *
 * | s1p2.x - s1p1.x , s2p2.x - s2p1.x | |  u |   | s2p1.x - s1p1.x |
 * | s1p2.y - s1p1.y , s2p2.y - s2p1.y | | -v | = | s2p1.y - s1p1.y |
 *
 * |  u |   | A , B | -1 | s2p1.x - s1p1.x |
 * | -v | = | C , D |    | s2p1.y - s1p1.y |
 *
 * where A = s1p2.x - s1p1.x
 *       C = s1p2.y - s1p1.y
 *       B = s2p2.x - s2p1.x
 *       D = s2p2.y - s2p1.y
 *
 * The inverse is:
 *
 * | A , B | -1                    |  D , -B |
 * | C , D |    =  (1 / (AD - BC)) | -C ,  A |
 *
 * When (AD - BC) = 0, the two line segements are parallel.
 *
 * If a triangle formed by 2 points of seg 1 and one point from seg 2 is
 * degenerate (has an area of zero), then the two line segments are
 * collinear.
 *
 * If the two segments are collinear and they overlap then there are
 * are infinite intersection points along the range they overlap.  Otherwise,
 * if they don't overlap, then they still don't intersect.
 */
function segsect(s1, s2)
{
  let A = s1.p2.x - s1.p1.x;
  let C = s1.p2.y - s1.p1.y;
  let B = s2.p2.x - s2.p1.x;
  let D = s2.p2.y - s2.p1.y;

  let determinate = A * D - B * C;
  if (determinate == 0) {
    /* parallel */
    if (tri_area(s1.p1, s1.p2, s2.p1) > 0) {
      /* non-collinear */
      return { type: "N" };
    }

    let u1;
    let u2;
    if (Math.abs(A) > Math.abs(C)) {
      u1 = (s2.p1.x - s1.p1.x) / A;
      u2 = (s2.p2.x - s1.p1.x) / A;
    } else {
      u1 = (s2.p1.y - s1.p1.y) / C;
      u2 = (s2.p2.y - s1.p1.y) / C;
    }

    if ((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1)) {
      return { type: "N" };
    }

    if (u1 < 0) {
      u1 = 0;
    }

    if (u1 > 1) {
      u1 = 1;
    }

    if (u2 < 0) {
      u2 = 0;
    }

    if (u2 > 1) {
      u2 = 1;
    }

    if (u1 == u2) {
      /* Collinear and overlap, but only at a single point */
      return { type: "X",
	       p: { x: s1.p1.x + A * u1, y: s1.p1.y + C * u1 } };
    }

    return { type: "S",
	     s: { p1: { x: s1.p1.x + A * u1, y: s1.p1.y + C * u1 },
                  p2: { x: s1.p1.x + A * u2, y: s1.p1.y + C * u2 } }
           };
  }
  u =  (1 / determinate) * ( D * (s2.p1.x - s1.p1.x) - B * (s2.p1.y - s1.p1.y));
  v = -(1 / determinate) * (-C * (s2.p1.x - s1.p1.x) + A * (s2.p1.y - s1.p1.y));

  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return { type: "N" };
  }

  return { type: "X", p: { x: s1.p1.x + u * A, y: s1.p1.y + u * C } }

}

function poly_approx(polyline, approx_fn)
{
  let approx = [];
  for (let i=0; i<polyline.length; i++) {
    switch (polyline[i].op) {
      case "Q":
        approx = approx.concat(approx_fn(polyline[i]));
        break;
      case "M":
      case "L":
        approx = approx.concat([polyline[i].pt.x, polyline[i].pt.y])
        break;
      default:
        alert("Unhandled path op: " + polyline[i]);
        break;
    }
  }
  return approx;
}

/* Specialized intersect function for use in determinining whether a
 * point is inside a polygon or not.  Assumes lines are never collinear,
 * and will count double instersect on a bezier as 0, which is only
 * useful for determining whether a point lies inside a curve or not.
 */
function poly_segcount_segsect(seg, p1, p2)
{
  let seg2 = { p1, p2 };
  let res = segsect(seg, seg2);
  if (res.type == "X") {
    return 1;
  }
  return 0;
}

function poly_segcount(seg, polyline)
{
  let p1 = polyline[0].pt;
  let p2;
  let count = 0;
  for (let i=1; i<polyline.length; i++) {
    switch (polyline[i].op) {
      case "L":
      case "Q":
        p2 = polyline[i].pt;
        count += poly_segcount_segsect(seg, p1, p2);
      default:
        break;
    }
    p1 = p2;
  }
  p2 = polyline[0].pt;
  count += poly_segcount_segsect(seg, p1, p2);
  return count;
}

function compute_angle(pt, pt2)
{
  let y = pt2.y - pt.y
  let x = pt2.x - pt.x;
  return Math.atan2(y, x);
}

function compute_distance(pt, pt2)
{
  return Math.sqrt(Math.pow(pt2.x - pt.x, 2) + Math.pow(pt2.y - pt.y, 2));
}

function poly_point_inside(pt, polyline)
{
  let angles = [];
  let distances = [];
  for (let i=0; i<polyline.length; i++) {
    switch (polyline[i].op) {
      case "M":
      case "L":
        angles = angles.concat(compute_angle(pt, polyline[i].pt));
        distances = distances.concat(compute_distance(pt, polyline[i].pt));
        break;
      case "Q":
        angles = angles.concat(compute_angle(pt, polyline[i].pt));
        angles = angles.concat(compute_angle(pt, polyline[i].ctlPt));
        distances = distances.concat(compute_distance(pt, polyline[i].pt));
        distances = distances.concat(compute_distance(pt, polyline[i].ctlPt));
        break;
      default:
        break;
    }
  }
  angles = angles.sort(function(a,b) { return a - b; });
  let deltas = angles.map(
     function(v,i,a) {
       let im1 = (a.length + i - 1) % a.length;
       let tmp = ((3*Math.PI + v - a[im1]) % (2 * Math.PI)) - Math.PI;
       return tmp;
     });
  let delta_max = Math.max(...deltas);
  let i = deltas.indexOf(delta_max);
  let i2 = (angles.length + i - 1) % angles.length;
  let cattywampus_angle = ((2*Math.PI + angles[i])  % 2*Math.PI +
                           (2*Math.PI + angles[i2]) % 2*Math.PI) / 2;
  let length = 2 * Math.max(...distances);
  let pt2 = { x: Number(pt.x) + length * Math.sin(cattywampus_angle),
              y: Number(pt.y) + length * Math.cos(cattywampus_angle) };

  let count = poly_segcount({ p1: pt, p2: pt2 }, polyline);
  if (count % 2 == 1) {
    return true;
  }

  return false;
}

function polygons_from_polylines(polylines)
{
  let nested = [];
  let inset_map = [];
  let nest_level_map = [];
  let len = polylines.length;
  let polygons = [];
  for (let i=0; i<len; i++) {
    let nest_level = 0;
    for (let j=0; j<len; j++) {
      let ix = j * len + i;
      inset_map[ix] = false;
      if (i == j) {
        continue;
      }
      if (poly_point_inside(polylines[i][0].pt, polylines[j])) {
        inset_map[ix] = true;
        nest_level++;
      }
    }
    nest_level_map[i] = nest_level;
  }
  for (let i=0; i<len; i++) {
    if ((nest_level_map[i] % 2) == 0) {
      polygons[i] = { outer: polylines[i], holes: [] };
    } else {
      polygons[i] = null;
    }
  }
  for (let i=0; i <len; i++) {
    if ((nest_level_map[i] % 2) == 1) {
      for (let j=0; j<len; j++) {
        let ix = j * len + i;
        if (inset_map[ix] && (nest_level_map[j] + 1 == nest_level_map[i])) {
          polygons[j].holes.push(polylines[i]);
	}
      }
    }
  }

  polygons = polygons.filter(function (el) { return el != null; });

  return polygons;
}

/*
 *            P1
 *
 *
 *       C1   T   C2
 *
 *
 *     P0           P1    S
 */

function poly_approx_Q(polyline, p0, p1, p2, is_outer)
{
  let testPt = { x: 0.25 * p0.x + 0.50 * p1.x + 0.25 * p2.x,
                 y: 0.25 * p0.y + 0.50 * p1.y + 0.25 * p2.y };
  let is_convex = is_outer;
  if (poly_point_inside(testPt, polyline)) {
    is_convex = !is_outer;
  }

  let delta = { x: p2.x - p0.x, y: p2.y - p0.y };
  let seg1 = { p1: testPt, p2: { x: testPt.x - delta.x, y: testPt.y - delta.y } };
  let res = segsect(seg1, { p1: p0, p2: p1 });
  let cutP1;
  switch (res.type) {
    case "X":
      cutP1 = res.p;
      break;
    case "S":
      cutP1 = { x: (res.s.p1.x + res.s.p2.x) / 2,
                y: (res.s.p1.y + res.s.p2.y) / 2 };
      break;
    default:
      console.log({p0, p1, p2, testPt, delta});
      console.log(res);
      console.log("Error approx Q -- 1");
      alert("Error approx Q -- 1");
      return;
  }

  let seg2 = { p1: testPt, p2: { x: testPt.x + delta.x, y: testPt.y + delta.y } };
  res = segsect(seg2, { p1: p2, p2: p1 });
  let cutP2;
  switch (res.type) {
    case "X":
      cutP2 = res.p;
      break;
    case "S":
      cutP2 = { x: (res.s.p1.x + res.s.p2.x) / 2,
                y: (res.s.p1.y + res.s.p2.y) / 2 };
      break;
    default:
      console.log({p0, p1, p2, testPt, delta});
      console.log(res);
      console.log("Error approx Q -- 2");
      alert("Error approx Q -- 2");
      return;
  }

  if (is_convex) {
    return {
      fill: [testPt.x, testPt.y, p2.x, p2.y ],
      bezfill: [ [ { p: p0,     s: -1.0, t: 0.0 },
                   { p: cutP1,  s: -0.5, t: 1.0 },
                   { p: testPt, s:  0.0, t: 1.0 } ],
                 [ { p: p2,     s:  1.0, t: 0.0 },
                   { p: cutP2,  s:  0.5, t: 1.0 },
                   { p: testPt, s:  0.0, t: 1.0 } ] ]
    };
  } else {
    return {
      fill: [cutP1.x, cutP1.y, cutP2.x, cutP2.y, p2.x, p2.y ],
      bezfill: [ [ { p: p0,     s: -1.0, t:  0.0 },
                   { p: cutP1,  s: -0.5, t: -1.0 },
                   { p: testPt, s:  0.0, t: -1.0 } ],
                 [ { p: p2,     s:  1.0, t:  0.0 },
                   { p: cutP2,  s:  0.5, t: -1.0 },
                   { p: testPt, s:  0.0, t: -1.0 } ] ]
    };
  }
}

function polyline_prepare_tess(polyline, is_outer)
{
  let pts = [];
  let bezfills = [];
  for (let i=0; i<polyline.length; i++) {
    switch (polyline[i].op) {
      case "M":
      case "L":
        pts.push(Number(polyline[i].pt.x));
        pts.push(Number(polyline[i].pt.y));
        break;
      case "Q":
         let p0 = { x: pts[pts.length - 2],
                    y: pts[pts.length - 1] };
         let p1 = polyline[i].ctlPt;
         let p2 = polyline[i].pt;
         if (tri_area(p0, p1, p2) == 0) {
           /* Degenerate.  This is really a line segment */
           pts.push(Number(p2.x));
           pts.push(Number(p2.y));
           break;
	 }
         let res = poly_approx_Q(polyline, p0, p1, p2, is_outer);
         pts = pts.concat(res.fill);
         bezfills = bezfills.concat(res.bezfill);
         break;
      default:
        alert("Unhandled op: " + polygon.outer[i].op);
    }
  }
  return { pts, bezfills };
}

function polygon_tessellate(polygon)
{
  let res = polyline_prepare_tess(polygon.outer, true);
  let pts = res.pts;
  let bezfills = res.bezfills;
  let hole_indices = [];

  for (let i=0; i<polygon.holes.length; i++) {
    hole_indices.push(pts.length / 2);
    let hole_polyline = polygon.holes[i];
    let res = polyline_prepare_tess(hole_polyline, false);
    pts = pts.concat(res.pts);
    bezfills = bezfills.concat(res.bezfills);
  }

  let tri_indices = earcut(pts, hole_indices);
  return { tri_indices, pts, bezfills };
}

function polygons_tessellate(polygons)
{
  return polygons.map(polygon_tessellate);
}

function polylines_from_svg(svg_s)
{
  let dom_parser = new DOMParser();
  let svg = dom_parser.parseFromString(svg_s, "image/svg+xml");
  let path_idx = -1;
  for (let i=0; i<svg.all.length; i++) {
    let el = svg.all[i];
    if (el.tagName == "path") {
      if (path_idx == -1) {
        path_idx = i;
        continue;
      }
      alert("Unsupported SVG format: Only 1 path element supported.");
      return null;
    }
  }
  let path = svg.all[path_idx];
  if (path == undefined) {
    return null;
  }
  if (path.attributes.d == undefined) {
    alert("Unsupported SVG format: expecting d attribute.");
    return null;
  }
  let d = consolidate_spaces(path.attributes.d.nodeValue.replace(/M/g, " M ").replace(/L/g, " L ").replace(/Q/g, " Q ").trim()).split(" ");
  if (d[0] != "M") {
    console.log("Unsupported SVG format: expecting M first");
    return null;
  }
  let polylines = [];
  let j = 0;
  polylines[j] = [ { op: "M", pt: { x: Number(d[1]), y: Number(d[2]) } } ];
  for (let i=3; i<d.length; i++) {
    if (d[i] == "M") {
      j++;
      polylines[j] = [ { op: "M", pt: { x: Number(d[i+1]), y: Number(d[i+2]) } } ];
      i += 2;
      continue;
    }
    if (d[i] == "L") {
      polylines[j] = polylines[j].concat({ op: "L", pt: { x: Number(d[i+1]), y: Number(d[i+2]) } });
      i += 2;
      continue;
    }
    if (d[i] == "Q") {
      polylines[j] = polylines[j].concat({ op: "Q", ctlPt: { x: Number(d[i+1]), y: Number(d[i+2]) }, pt: { x: Number(d[i+3]), y: Number(d[i+4]) } });
      i += 4;
      continue;
    }
    if (d[i] == "Z") {
      break;
    }
    alert("Unsupported SVG format: Unhandled op: " + d[i]);
    return null;
  }
  return polylines;
}
