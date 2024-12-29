function glfontsdev_compile_single_addst(pts)
{
  let pts2 = [];
  let i    = 0;
  let j    = 0;
  while (i<pts.length) {
    pts2[j++] = pts[i++];
    pts2[j++] = pts[i++];
    pts2[j++] = 0;
    pts2[j++] = 1;
  }
  return pts2;
}

function glfontsdev_compile_single(tess)
{
  let idx  = [];
  let pts  = [];
  let off1 = 0;
  let off2 = 0;
  for (let i=0; i<tess.length; i++) {
    for (let j=0; j<tess[i].tri_indices.length; j++) {
      idx[j + off1] = tess[i].tri_indices[j] + off2 / 2;
    }
    for (let j=0; j<tess[i].pts.length; j++) {
      pts[j + off2] = tess[i].pts[j];
    }
    off1 += tess[i].tri_indices.length;
    off2 += tess[i].pts.length;
  }
  pts = glfontsdev_compile_single_addst(pts);
  for (let i=0; i<tess.length; i++) {
    for (let j=0; j<tess[i].bezfills.length; j++) {
      let bezfill = tess[i].bezfills[j];
      for (let k=0; k<3; k++) {
        idx[idx.length] = pts.length / 4;
        pts[pts.length] = bezfill[k].p.x;
        pts[pts.length] = bezfill[k].p.y;
        pts[pts.length] = bezfill[k].s;
        pts[pts.length] = bezfill[k].t;
      }
    }
  }
  return {idx,pts};
}

function glfontsdev_compile(tess_array)
{
  let glf_array = [];
  let idx       = [];
  let pts       = [];
  let lookup    = [];
  for (let i=0; i<tess_array.length; i++) {
    if (tess_array[i] == null) {
      glf_array[i] = null;
      continue;
    }
    glf_array[i] = glfontsdev_compile_single(tess_array[i]);
  }
  let off1 = 0;
  let off2 = 0;
  for (let i=0; i<glf_array.length; i++) {
    if (glf_array[i] == null) {
      lookup[i] = { start: -1, len: 0 };
      continue;
    }
    for (let j=0; j<glf_array[i].idx.length; j++) {
      idx[j + off1] = glf_array[i].idx[j] + (off2 / 4);
    }
    for (let j=0; j<glf_array[i].pts.length; j++) {
      pts[j + off2] = glf_array[i].pts[j];
    }
    lookup[i] = { start: off1, len: glf_array[i].idx.length };
    off1 += glf_array[i].idx.length;
    off2 += glf_array[i].pts.length;
  }
  return { lookup, idx, pts };
}
