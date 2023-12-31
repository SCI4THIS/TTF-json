function NOP() { }

// top is a keyword in Javascript.  t0p is not.


function Camera_frustum(camera)
{
  let znear = camera.nearPlane;
  let zfar = camera.farPlane;
  let left = camera.left;
  let right = camera.right;
  let t0p = camera.t0p;
  let bottom = camera.bottom;

  let A = (right + left) / (right - left);
  let B = (t0p + bottom) / (t0p - bottom);
  let C = - (zfar + znear) / (zfar - znear);
  let D = - (2 * zfar * znear) / (zfar - znear);

  camera.m.frustum.set(0, 0, 2 * znear / (right - left));
  camera.m.frustum.set(0, 1, 0);
  camera.m.frustum.set(0, 2, A);
  camera.m.frustum.set(0, 3, 0);

  camera.m.frustum.set(1, 0, 0);
  camera.m.frustum.set(1, 1, 2 * znear / (t0p - bottom));
  camera.m.frustum.set(1, 2, B);
  camera.m.frustum.set(1, 3, 0);

  camera.m.frustum.set(2, 0, 0);
  camera.m.frustum.set(2, 1, 0);
  camera.m.frustum.set(2, 2, C);
  camera.m.frustum.set(2, 3, D);

  camera.m.frustum.set(3, 0, 0);
  camera.m.frustum.set(3, 1, 0);
  camera.m.frustum.set(3, 2, -1);
  camera.m.frustum.set(3, 3, 0);

  camera.rot = Camera_rot;

  camera.frustum = NOP;

}

function Camera_unproject2(camera)
{
  let m = camera.m.camera;
  let K3 = (m.get(1,0) / m.get(0,0)) * m.get(0,2) - m.get(1,2);
  let K1 = (m.get(1,0) / m.get(0,0)) * K3;
  let K2 = (m.get(0,0) * m.get(1,1) - m.get(1,0) * m.get(0,1)) / m.get(0,0) * K3);
  let K4 = (1 / K3) * (m.get(1,3) - (m.get(1,0) * m.get(0,3) / m.get(0,0)));
  let K5 = (m.get(0,2) * K1 - 1) / m.get(0,0);
  let K6 = (m.get(0,1) + m.get(0,2) * K2) / m.get(0,0);
  let K7 = m.get(0,2) * K3 / m.get(0,0);
  let K8 = (m.get(0,2) * K4 + m.get(0,3)) / m.get(0,0);

  camera.m.unproject.set(1,3,-1 / K3);
  camera.m.unproject.set(1,2,K1);
  camera.m.unproject.set(1,0,K2);
  camera.m.unproject.set(1,1,K4);

  camera.m.unproject.set(0,2,K5);
  camera.m.unproject.set(0,0,K6);
  camera.m.unproject.set(0,3,-K7);
  camera.m.unproject.set(0,1,K8);

  camera.m.unproject.set(2,2,m.get(2,0)*K5 + m.get(2,2)*K1);
  camera.m.unproject.set(2,0,m.get(2,0)*K6 + m.get(2,1) + m.get(2,2)*K2);
  camera.m.unproject.set(2,3,-m.get(2,0)*K7 - m.get(2,2)*K3);
  camera.m.unproject.set(2,1,m.get(2,0)*K8 + m.get(2,2)*K4 + m.get(2,3));

  camera.m.unproject.set(3,2,m.get(3,0)*K5 + m.get(3,2)*K1);
  camera.m.unproject.set(3,0,m.get(3,0)*K6 + m.get(3,1) + m.get(3,2)*K2);
  camera.m.unproject.set(3,3,-m.get(3,0)*K7 - m.get(3,2)*K3);
  camera.m.unproject.set(3,1,m.get(3,0)*K8 + m.get(3,2)*K4 + m.get(3,3));
}

function Camera_perspective(camera)
{
  camera.t0p = camera.nearPlane * Math.tan(camera.fieldOfView / 2);
  camera.bottom = -camera.t0p;
  camera.right = camera.t0p * camera.aspectRatio;
  camera.left = -camera.left;
  Camera_frustum(camera);
  camera.frustum = Camera_frustum;
  camera.perspective = NOP;
}

function Camera_translate(camera)
{
  camera.m.translate.identity();
  camera.m.translate.set(0,3,-camera.m.offset.get(0));
  camera.m.translate.set(1,3,-camera.m.offset.get(1));
  camera.m.translate.set(2,3,-camera.m.offset.get(2));

  camera.V = Camera_V;
  camera.mul = Camera_mul;
  camera.translate = NOP;
}

function Camera_V(camera)
{
  camera.m.V.mul(camera.m.lookat, camera.m.translate);
  camera.V = NOP;
}

function Camera_rot(camera)
{
  camera.m.camera_rot.mul(camera.m.frustum, camera.m.lookat);
  camera.m.camera_rotinv.invert(camera.m.camera_rot);
  camera.mul = Camera_mul;
  camera.rot = NOP;
}

function Camera_mul(camera)
{
  camera.m.camera.mul(camera.m.camera_rot, camera.m.translate);
  camera.mul = NOP;
}

function Camera_matrix(camera)
{
  camera.perspective(camera);
  camera.frustum(camera);
  camera.lookat(camera);
  camera.translate(camera);
  camera.V(camera);
  camera.rot(camera);
  camera.mul(camera);
  return camera.m.camera;
}
