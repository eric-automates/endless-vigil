/* Endless Vigil — Dual WebGPU Compute + WebGL2 Instanced PBR Engine (v0.6.0-alpha)
 * Clean MIT-licensed runtime driving CC0 MakeHuman/MPFB2/CharacterCreator assets +
 * original Endless Vigil tactical armor, 3-mode combat helmets, wrist hologram emitter,
 * live 3D visor-synced corner portrait, diegetic ship-ramp hangar, & Sector 4 corridor combat.
 */
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.EVGPUEngine = factory(root);
})(typeof self !== 'undefined' ? self : this, function(root){
  'use strict';

  // --- Linear Algebra Utilities (Row/Col-major Mat4 for GL/WGSL) ---
  function mat4Identity(){ return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
  function mat4Mul(a, b, out){
    out = out || new Float32Array(16);
    var a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7],
        a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    var b00=b[0],b01=b[1],b02=b[2],b03=b[3], b10=b[4],b11=b[5],b12=b[6],b13=b[7],
        b20=b[8],b21=b[9],b22=b[10],b23=b[11], b30=b[12],b31=b[13],b32=b[14],b33=b[15];
    out[0]=b00*a00+b01*a10+b02*a20+b03*a30; out[1]=b00*a01+b01*a11+b02*a21+b03*a31;
    out[2]=b00*a02+b01*a12+b02*a22+b03*a32; out[3]=b00*a03+b01*a13+b02*a23+b03*a33;
    out[4]=b10*a00+b11*a10+b12*a20+b13*a30; out[5]=b10*a01+b11*a11+b12*a21+b13*a31;
    out[6]=b10*a02+b11*a12+b12*a22+b13*a32; out[7]=b10*a03+b11*a13+b12*a23+b13*a33;
    out[8]=b20*a00+b21*a10+b22*a20+b23*a30; out[9]=b20*a01+b21*a11+b22*a21+b23*a31;
    out[10]=b20*a02+b21*a12+b22*a22+b23*a32; out[11]=b20*a03+b21*a13+b22*a23+b23*a33;
    out[12]=b30*a00+b31*a10+b32*a20+b33*a30; out[13]=b30*a01+b31*a11+b32*a21+b33*a31;
    out[14]=b30*a02+b31*a12+b32*a22+b33*a32; out[15]=b30*a03+b31*a13+b32*a23+b33*a33;
    return out;
  }
  function mat4Perspective(fovyRad, aspect, near, far){
    var f = 1.0 / Math.tan(fovyRad * 0.5), nf = 1.0 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function mat4PerspectiveZO(fovyRad, aspect, near, far){
    // WebGPU [0,1] NDC Z clip space
    var f = 1.0 / Math.tan(fovyRad * 0.5), nf = 1.0 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,far*nf,-1, 0,0,far*near*nf,0]);
  }
  function mat4LookAt(eye, center, up){
    var ex=eye[0],ey=eye[1],ez=eye[2], cx=center[0],cy=center[1],cz=center[2], ux=up[0],uy=up[1],uz=up[2];
    var zx=ex-cx, zy=ey-cy, zz=ez-cz;
    var zl = Math.hypot(zx,zy,zz) || 1; zx/=zl; zy/=zl; zz/=zl;
    var xx = uy*zz - uz*zy, xy = uz*zx - ux*zz, xz = ux*zy - uy*zx;
    var xl = Math.hypot(xx,xy,xz) || 1; xx/=xl; xy/=xl; xz/=xl;
    var yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx*ex+xy*ey+xz*ez), -(yx*ex+yy*ey+yz*ez), -(zx*ex+zy*ey+zz*ez), 1
    ]);
  }
  function mat4FromQuat(q, t, out){
    out = out || new Float32Array(16);
    var x=q[0],y=q[1],z=q[2],w=q[3];
    var x2=x+x,y2=y+y,z2=z+z, xx=x*x2,xy=x*y2,xz=x*z2, yy=y*y2,yz=y*z2,zz=z*z2, wx=w*x2,wy=w*y2,wz=w*z2;
    out[0]=1-(yy+zz); out[1]=xy+wz; out[2]=xz-wy; out[3]=0;
    out[4]=xy-wz; out[5]=1-(xx+zz); out[6]=yz+wx; out[7]=0;
    out[8]=xz+wy; out[9]=yz-wx; out[10]=1-(xx+yy); out[11]=0;
    out[12]=t?t[0]:0; out[13]=t?t[1]:0; out[14]=t?t[2]:0; out[15]=1;
    return out;
  }
  function mat4FromEulerXYZ(rx, ry, rz){
    var cx=Math.cos(rx),sx=Math.sin(rx), cy=Math.cos(ry),sy=Math.sin(ry), cz=Math.cos(rz),sz=Math.sin(rz);
    // R = Ry * Rx * Rz (column-major storage!)
    var rxM = new Float32Array([1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1]);
    var ryM = new Float32Array([cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]);
    var rzM = new Float32Array([cz,sz,0,0, -sz,cz,0,0, 0,0,1,0, 0,0,0,1]);
    return mat4Mul(ryM, mat4Mul(rxM, rzM));
  }
  function quatMul(a, b){
    var ax=a[0],ay=a[1],az=a[2],aw=a[3], bx=b[0],by=b[1],bz=b[2],bw=b[3];
    return [
      aw*bx + ax*bw + ay*bz - az*by,
      aw*by - ax*bz + ay*bw + az*bx,
      aw*bz + ax*by - ay*bx + az*bw,
      aw*bw - ax*bx - ay*by - az*bz
    ];
  }
  function quatSlerp(a, b, t){
    var ax=a[0],ay=a[1],az=a[2],aw=a[3], bx=b[0],by=b[1],bz=b[2],bw=b[3];
    var dot = ax*bx + ay*by + az*bz + aw*bw;
    if (dot < 0){ dot = -dot; bx=-bx; by=-by; bz=-bz; bw=-bw; }
    var s0, s1;
    if (1.0 - dot > 0.0005){
      var omega = Math.acos(Math.min(1, dot)), so = Math.sin(omega);
      s0 = Math.sin((1-t)*omega)/so; s1 = Math.sin(t*omega)/so;
    } else { s0 = 1-t; s1 = t; }
    return [s0*ax+s1*bx, s0*ay+s1*by, s0*az+s1*bz, s0*aw+s1*bw];
  }
  function mat4TransformPoint(m, p){
    var x=p[0],y=p[1],z=p[2];
    return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]];
  }
  function hexToRgb01(hex){
    var h = String(hex || '#ffffff').replace('#','');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    if (!Number.isFinite(n)) return [0.8, 0.8, 0.8];
    return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255];
  }

  // --- Base64 & Zlib Decompression (Browser Native DecompressionStream + Node zlib fallback) ---
  function b64ToBytes(b64){
    if (typeof atob === 'function'){
      var bin = atob(b64), len = bin.length, u8 = new Uint8Array(len);
      for (var i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
      return u8;
    }
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  async function inflateZlibBytes(u8){
    if (typeof DecompressionStream !== 'undefined'){
      var ds = new DecompressionStream('deflate');
      var w = ds.writable.getWriter();
      w.write(u8);
      w.close();
      var chunks = [], r = ds.readable.getReader(), total = 0;
      while (true){
        var res = await r.read();
        if (res.done) break;
        chunks.push(res.value);
        total += res.value.byteLength;
      }
      var out = new Uint8Array(total), off = 0;
      for (var i = 0; i < chunks.length; i++){ out.set(chunks[i], off); off += chunks[i].byteLength; }
      return out;
    }
    if (typeof require === 'function'){
      return new Uint8Array(require('zlib').inflateSync(u8));
    }
    throw new Error('No zlib inflate support available');
  }

  function decodeOctNormals(i8arr, vcount){
    var out = new Float32Array(vcount * 3);
    for (var i = 0; i < vcount; i++){
      var fx = i8arr[i*2] / 127.0, fy = i8arr[i*2+1] / 127.0;
      var fz = 1.0 - Math.abs(fx) - Math.abs(fy);
      if (fz < 0.0){
        var t = -fz;
        fx += (fx >= 0.0 ? -t : t);
        fy += (fy >= 0.0 ? -t : t);
      }
      var l = Math.hypot(fx, fy, fz) || 1.0;
      out[i*3] = fx/l; out[i*3+1] = fy/l; out[i*3+2] = fz/l;
    }
    return out;
  }

  function unpackHumanoidKit(rawBytes){
    var dv = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    var hlen = dv.getUint32(0, true);
    var dec = new TextDecoder('utf-8');
    var manifest = JSON.parse(dec.decode(rawBytes.subarray(4, 4 + hlen)));
    var mblob = rawBytes.subarray(4 + hlen);

    // Decode skeleton IBM & joints
    var sk = manifest.skeleton;
    var ibmBytes = b64ToBytes(sk.ibmB64);
    var ibmFloats = new Float32Array(ibmBytes.buffer, ibmBytes.byteOffset, ibmBytes.byteLength / 4);
    var ibms = [];
    for (var j = 0; j < sk.names.length; j++){
      ibms.push(new Float32Array(ibmFloats.subarray(j*16, j*16+16)));
    }
    var jNameToIdx = {};
    for (var ji = 0; ji < sk.names.length; ji++) jNameToIdx[sk.names[ji]] = ji;

    // Decode animations
    var anims = {};
    Object.keys(manifest.anims).forEach(function(ak){
      var ad = manifest.anims[ak];
      var tracks = {};
      Object.keys(ad.tracks).forEach(function(jb){
        var qb = b64ToBytes(ad.tracks[jb]);
        var qi16 = new Int16Array(qb.buffer, qb.byteOffset, qb.byteLength / 2);
        var qf = new Float32Array(qi16.length);
        for (var k = 0; k < qi16.length; k++) qf[k] = qi16[k] / 32767.0;
        tracks[parseInt(jb, 10)] = qf;
      });
      anims[ak] = { duration: ad.duration, frames: ad.frames, tracks: tracks };
    });

    function readI16(u8, off, count){
      var b = u8.byteOffset + off;
      if ((b & 1) === 0) return new Int16Array(u8.buffer, b, count);
      var copy = u8.slice(off, off + count * 2);
      return new Int16Array(copy.buffer, 0, count);
    }
    function readU16(u8, off, count){
      var b = u8.byteOffset + off;
      if ((b & 1) === 0) return new Uint16Array(u8.buffer, b, count);
      var copy = u8.slice(off, off + count * 2);
      return new Uint16Array(copy.buffer, 0, count);
    }

    // Decode all meshes lazily or upfront (4.2 MB total -> fast upfront!)
    var meshes = {};
    Object.keys(manifest.meshToc).forEach(function(mname){
      var pair = manifest.meshToc[mname];
      var sub = new Uint8Array(mblob.subarray(pair[0], pair[0] + pair[1]));
      var mdv = new DataView(sub.buffer, sub.byteOffset, sub.byteLength);
      var p = 0;
      var vc = mdv.getUint32(p, true); p += 4;
      var ic = mdv.getUint32(p, true); p += 4;
      var flags = mdv.getUint16(p, true); p += 2;
      var nm = mdv.getUint16(p, true); p += 2;

      var posI16 = readI16(sub, p, vc * 3); p += vc * 6;
      var pos = new Float32Array(vc * 3);
      for (var i = 0; i < vc * 3; i++) pos[i] = posI16[i] / 10000.0;

      var nrmI8 = new Int8Array(sub.buffer, sub.byteOffset + p, vc * 2); p += vc * 2;
      var nrm = decodeOctNormals(nrmI8, vc);

      var uvU16 = readU16(sub, p, vc * 2); p += vc * 4;
      var uv = new Float32Array(vc * 2);
      for (var ui = 0; ui < vc * 2; ui++) uv[ui] = uvU16[ui] / 65535.0;

      var joints = new Uint8Array(sub.subarray(p, p + vc * 4)); p += vc * 4;
      var wU8 = sub.subarray(p, p + vc * 4); p += vc * 4;
      var weights = new Float32Array(vc * 4);
      for (var wi = 0; wi < vc * 4; wi++) weights[wi] = wU8[wi] / 255.0;

      var indices = new Uint16Array(readU16(sub, p, ic)); p += ic * 2;

      var cczone = null;
      if (flags & 1){
        cczone = new Uint16Array(readU16(sub, p, vc));
        p += vc * 2;
      }
      var hairTuck = null, hairCrown = null;
      if (flags & 2){
        var tI16 = readI16(sub, p, vc * 3); p += vc * 6;
        hairTuck = new Float32Array(vc * 3);
        for (var hi = 0; hi < vc * 3; hi++) hairTuck[hi] = tI16[hi] / 10000.0;
        hairCrown = new Uint8Array(sub.subarray(p, p + vc)); p += vc;
      }
      var morphs = {};
      for (var mi = 0; mi < nm; mi++){
        var klen = mdv.getUint16(p, true); p += 2;
        var scnt = mdv.getUint32(p, true); p += 4;
        var mk = dec.decode(sub.subarray(p, p + klen)); p += klen;
        var midx = new Uint16Array(readU16(sub, p, scnt)); p += scnt * 2;
        var mdI16 = readI16(sub, p, scnt * 3); p += scnt * 6;
        var md = new Float32Array(scnt * 3);
        for (var di = 0; di < scnt * 3; di++) md[di] = mdI16[di] / 10000.0;
        morphs[mk] = { idx: midx, delta: md };
      }

      meshes[mname] = {
        name: mname, vcount: vc, icount: ic,
        restPos: pos, dynPos: new Float32Array(pos), norm: nrm, uv: uv,
        joints: joints, weights: weights, indices: indices,
        cczone: cczone, hairTuck: hairTuck, hairCrown: hairCrown,
        morphs: morphs
      };
    });

    return {
      manifest: manifest,
      skeleton: { names: sk.names, parents: sk.parents, restT: sk.restT, restR: sk.restR, ibms: ibms, jNameToIdx: jNameToIdx, morphJoints: sk.morphJoints || {} },
      anims: anims,
      meshes: meshes,
      bodyZones: manifest.bodyZones,
      faceUV: manifest.faceUV,
      nailUVs: manifest.nailUVs || [],
      tattooUV: manifest.tattooUV || {}
    };
  }

  // --- Original Procedural Architecture Geometry Builder (Ship, Hangar Ramp, Chair, Crate, Corridor) ---
  function buildBeveledBox(cx, cy, cz, hx, hy, hz, bevel){
    bevel = bevel || Math.min(hx, hy, hz) * 0.25;
    var pts = [
      [-hx+bevel,-hz],[hx-bevel,-hz],[hx,-hz+bevel],[hx,hz-bevel],
      [hx-bevel,hz],[-hx+bevel,hz],[-hx,hz-bevel],[-hx,-hz+bevel]
    ];
    var rings = [];
    var dyList = [[-hy, 1 - bevel/Math.max(hx,hz,0.01)], [-hy+bevel, 1], [hy-bevel, 1], [hy, 1 - bevel/Math.max(hx,hz,0.01)]];
    for (var r = 0; r < dyList.length; r++){
      var dy = dyList[r][0], sc = dyList[r][1], ring = [];
      for (var s = 0; s < 8; s++) ring.push([cx + pts[s][0]*sc, cy + dy, cz + pts[s][1]*sc]);
      rings.push(ring);
    }
    var verts = [], uvs = [], idx = [];
    for (var ri = 0; ri < rings.length; ri++){
      for (var si = 0; si < 8; si++){
        verts.push(rings[ri][si][0], rings[ri][si][1], rings[ri][si][2]);
        uvs.push(si/8, ri/3);
      }
    }
    for (var ri2 = 0; ri2 < rings.length-1; ri2++){
      for (var si2 = 0; si2 < 8; si2++){
        var ns = (si2+1)%8, a=ri2*8+si2, b=ri2*8+ns, c=(ri2+1)*8+ns, d=(ri2+1)*8+si2;
        idx.push(a,b,c, a,c,d);
      }
    }
    var bc = verts.length/3; verts.push(cx, cy-hy, cz); uvs.push(0.5, 0);
    for (var s2=0;s2<8;s2++) idx.push(bc, (s2+1)%8, s2);
    var tc = verts.length/3; verts.push(cx, cy+hy, cz); uvs.push(0.5, 1);
    var tb = 3*8;
    for (var s3=0;s3<8;s3++) idx.push(tc, tb+s3, tb+(s3+1)%8);
    var pos = new Float32Array(verts), nrm = new Float32Array(pos.length);
    var vol6 = 0.0;
    for (var vi0 = 0; vi0 < idx.length; vi0 += 3){
      var ia0=idx[vi0]*3, ib0=idx[vi0+1]*3, ic0=idx[vi0+2]*3;
      var x0=pos[ia0],y0=pos[ia0+1],z0=pos[ia0+2];
      var x1=pos[ib0],y1=pos[ib0+1],z1=pos[ib0+2];
      var x2=pos[ic0],y2=pos[ic0+1],z2=pos[ic0+2];
      vol6 += x0*(y1*z2-z1*y2) - y0*(x1*z2-z1*x2) + z0*(x1*y2-y1*x2);
    }
    if (vol6 < 0){
      for (var fi = 0; fi < idx.length; fi += 3){ var tmp = idx[fi+1]; idx[fi+1] = idx[fi+2]; idx[fi+2] = tmp; }
    }
    for (var ti = 0; ti < idx.length; ti += 3){
      var ia=idx[ti]*3, ib=idx[ti+1]*3, ic=idx[ti+2]*3;
      var ax=pos[ib]-pos[ia], ay=pos[ib+1]-pos[ia+1], az=pos[ib+2]-pos[ia+2];
      var bx=pos[ic]-pos[ia], by=pos[ic+1]-pos[ia+1], bz=pos[ic+2]-pos[ia+2];
      var nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
      nrm[ia]+=nx;nrm[ia+1]+=ny;nrm[ia+2]+=nz;
      nrm[ib]+=nx;nrm[ib+1]+=ny;nrm[ib+2]+=nz;
      nrm[ic]+=nx;nrm[ic+1]+=ny;nrm[ic+2]+=nz;
    }
    for (var vi=0; vi<nrm.length; vi+=3){
      var nl = Math.hypot(nrm[vi], nrm[vi+1], nrm[vi+2]) || 1;
      nrm[vi]/=nl; nrm[vi+1]/=nl; nrm[vi+2]/=nl;
    }
    return { pos: pos, norm: nrm, uv: new Float32Array(uvs), indices: new Uint16Array(idx), vcount: pos.length/3, icount: idx.length };
  }

  function mergeStaticParts(parts){
    var totV = 0, totI = 0;
    parts.forEach(function(p){ totV += p.vcount; totI += p.icount; });
    var pos = new Float32Array(totV*3), norm = new Float32Array(totV*3), uv = new Float32Array(totV*2), idx = new Uint16Array(totI);
    var vo = 0, io = 0;
    parts.forEach(function(p){
      pos.set(p.pos, vo*3); norm.set(p.norm, vo*3); uv.set(p.uv, vo*2);
      for (var i = 0; i < p.icount; i++) idx[io+i] = p.indices[i] + vo;
      vo += p.vcount; io += p.icount;
    });
    return { pos: pos, norm: norm, uv: uv, indices: idx, vcount: totV, icount: totI };
  }

  function buildEnvironmentProps(shipVariantSeed){
    var sv = (shipVariantSeed || 0) % 4;
    // Original Endless Vigil "EV-74 Kestrel" Utility Freighter Ramp + Bay + Chair + Crate (NO copyrighted ship shapes!)
    var rampParts = [
      // Beveled sloped boarding ramp descending from cargo bay (z=-2.8, y=0.65) down to deck (z=+1.2, y=0.0)
      buildBeveledBox(0, 0.01, 0.0, 1.45, 0.035, 1.85, 0.02),
      buildBeveledBox(-1.38, 0.14, 0.0, 0.08, 0.14, 1.85, 0.02), // left beveled ramp side rail
      buildBeveledBox( 1.38, 0.14, 0.0, 0.08, 0.14, 1.85, 0.02), // right beveled ramp side rail
      // Rear cargo bulkhead & open bay arch behind operator
      buildBeveledBox(-1.52, 1.25, -1.65, 0.28, 1.35, 0.35, 0.04),
      buildBeveledBox( 1.52, 1.25, -1.65, 0.28, 1.35, 0.35, 0.04),
      buildBeveledBox( 0.00, 2.45, -1.65, 1.82, 0.26, 0.45, 0.04),
      // Hydraulic ramp struts
      buildBeveledBox(-1.32, 1.15, -0.85, 0.035, 1.10, 0.035, 0.01),
      buildBeveledBox( 1.32, 1.15, -0.85, 0.035, 1.10, 0.035, 0.01),
    ];
    // Original Twin-Nacelle Freighter Hull silhouette parked in background bay (randomized by seed!)
    var shipWingSpan = 2.6 + sv * 0.45;
    var shipParts = [
      buildBeveledBox(0, 1.45, -6.5, 1.8, 0.85, 3.2, 0.25),               // central utility hull
      buildBeveledBox(0, 2.25, -5.8, 0.95, 0.42, 1.35, 0.15),              // raised cockpit deck
      buildBeveledBox(-shipWingSpan, 1.35, -7.2, 0.65, 0.52, 1.95, 0.14),  // port twin thruster nacelle
      buildBeveledBox( shipWingSpan, 1.35, -7.2, 0.65, 0.52, 1.95, 0.14),  // starboard twin thruster nacelle
      buildBeveledBox(-1.95, 1.40, -6.9, 0.95, 0.16, 0.85, 0.04),          // wing pylon L
      buildBeveledBox( 1.95, 1.40, -6.9, 0.95, 0.16, 0.85, 0.04),          // wing pylon R
      buildBeveledBox(0, 0.45, -5.2, 0.22, 0.55, 0.22, 0.04),              // landing gear nose
    ];
    // Folding metal hangar chair on the ramp (seat at y=0.45, backrest at z=-0.22)
    var chairParts = [
      buildBeveledBox(0, 0.44, -0.02, 0.25, 0.025, 0.24, 0.008),  // seat pan
      buildBeveledBox(0, 0.72, -0.24, 0.24, 0.22, 0.022, 0.006),  // backrest
      buildBeveledBox(-0.22, 0.22,  0.18, 0.016, 0.22, 0.016, 0.004),
      buildBeveledBox( 0.22, 0.22,  0.18, 0.016, 0.22, 0.016, 0.004),
      buildBeveledBox(-0.22, 0.22, -0.22, 0.016, 0.22, 0.016, 0.004),
      buildBeveledBox( 0.22, 0.22, -0.22, 0.016, 0.22, 0.016, 0.004),
    ];
    // Weathered cargo footrest crate positioned at z=+0.78 in front of chair!
    var crateParts = [
      buildBeveledBox(0, 0.22, 0.78, 0.30, 0.22, 0.22, 0.022),
      buildBeveledBox(0, 0.44, 0.78, 0.27, 0.015, 0.19, 0.006),
      buildBeveledBox(-0.29, 0.22, 0.78, 0.016, 0.16, 0.16, 0.005),
      buildBeveledBox( 0.29, 0.22, 0.78, 0.016, 0.16, 0.16, 0.005),
    ];
    // Ore Depot Corridor Cutaway Tactical Walls + Cover Crates + CQB Corner Threshold Walls (clear overhead for Drone Camera!)
    var corrParts = [];
    for (var z = -6.0; z <= 12.0; z += 3.0){
      corrParts.push(buildBeveledBox(-2.9, 1.05, z, 0.22, 1.05, 1.48, 0.04)); // L cutaway bulkhead
      corrParts.push(buildBeveledBox( 2.9, 1.05, z, 0.22, 1.05, 1.48, 0.04)); // R cutaway bulkhead
      corrParts.push(buildBeveledBox(-2.58, 1.05, z-1.45, 0.16, 1.08, 0.14, 0.03)); // L rib pillar
      corrParts.push(buildBeveledBox( 2.58, 1.05, z-1.45, 0.16, 1.08, 0.14, 0.03)); // R rib pillar
    }
    corrParts.push(buildBeveledBox(-1.25, 0.42, 4.8, 0.62, 0.42, 0.45, 0.04)); // L cover crate
    corrParts.push(buildBeveledBox( 1.25, 0.45, 6.4, 0.58, 0.45, 0.48, 0.04)); // R cover crate
    corrParts.push(buildBeveledBox( 0.15, 0.36, 8.2, 0.55, 0.36, 0.40, 0.04)); // mid cover crate
    // CQB Breach Threshold Walls at z=+1.72 leaving wide center doorway [-0.68 .. +0.68] for corner-pie!
    corrParts.push(buildBeveledBox(-1.74, 0.96, 1.72, 1.06, 0.96, 0.16, 0.03));
    corrParts.push(buildBeveledBox( 1.74, 0.96, 1.72, 1.06, 0.96, 0.16, 0.03));

    // Captain's Quarters Metallic Spaceship Cabin (Off-center doorway so operator silhouette reads against clean gunmetal wall!)
    var cabinParts = [
      buildBeveledBox( 0.0, -0.04, -0.25, 1.85, 0.04, 2.15, 0.02),  // ribbed cabin deck
      buildBeveledBox(-1.80, 1.25, -0.25, 0.08, 1.28, 2.15, 0.02),  // port bulkhead
      buildBeveledBox( 1.80, 1.25, -0.25, 0.08, 1.28, 2.15, 0.02),  // starboard bulkhead
      buildBeveledBox( 0.0,  2.48, -0.25, 1.85, 0.08, 2.15, 0.02),  // low cabin ceiling
      buildBeveledBox(-0.62, 1.25, -1.95, 1.22, 1.28, 0.10, 0.02),  // solid gunmetal wall behind operator
      buildBeveledBox( 1.56, 1.25, -1.95, 0.28, 1.28, 0.10, 0.02),  // off-center starboard bulkhead (doorway at x=+0.94)
      buildBeveledBox( 0.94, 2.22, -1.95, 0.36, 0.25, 0.10, 0.02),  // doorway lintel
      // Built-in metallic bunk + storage locker + vanity counter along left/right walls (clear of center!)
      buildBeveledBox(-1.38, 0.34, -0.55, 0.36, 0.34, 1.15, 0.03),  // captain bunk/locker
      buildBeveledBox( 1.42, 0.42, -0.95, 0.34, 0.42, 0.72, 0.03),  // tactical gear console
      // Overhead metallic structural ribs & mirror sconce bar
      buildBeveledBox( 0.0,  2.36, -0.90, 1.72, 0.07, 0.09, 0.02),
      buildBeveledBox( 0.0,  2.36,  0.45, 1.72, 0.07, 0.09, 0.02),
    ];

    return {
      ramp: mergeStaticParts(rampParts),
      ship: mergeStaticParts(shipParts),
      chair: mergeStaticParts(chairParts),
      crate: mergeStaticParts(crateParts),
      corridor: mergeStaticParts(corrParts),
      cabin: mergeStaticParts(cabinParts),
      turntableDisk: (function(){
        // Sleek dark hexagonal/octagonal tactical stage pedestal (0.64m radius)
        var nSeg = 24, p = [], n = [], u = [], idx = [];
        var r = 0.66, h = 0.036;
        p.push(0, 0, 0); n.push(0, 1, 0); u.push(0.5, 0.5);
        for (var i = 0; i <= nSeg; i++){
          var a = (i / nSeg) * Math.PI * 2;
          p.push(Math.cos(a)*r, 0, Math.sin(a)*r); n.push(0, 1, 0); u.push(0.5+Math.cos(a)*0.5, 0.5+Math.sin(a)*0.5);
        }
        for (var i = 1; i <= nSeg; i++) idx.push(0, i+1, i);
        var bOff = p.length / 3;
        for (var i = 0; i <= nSeg; i++){
          var a = (i / nSeg) * Math.PI * 2;
          var cx = Math.cos(a), sz = Math.sin(a);
          p.push(cx*r, 0, sz*r, cx*r, -h, sz*r);
          n.push(cx, 0, sz, cx, 0, sz);
          u.push(i/nSeg, 0, i/nSeg, 1);
        }
        for (var i = 0; i < nSeg; i++){
          var s = bOff + i*2;
          idx.push(s, s+2, s+3, s, s+3, s+1);
        }
        return { pos:new Float32Array(p), norm:new Float32Array(n), uv:new Float32Array(u), indices:new Uint16Array(idx), vcount:p.length/3, icount:idx.length };
      })(),
      floorPlane: buildBeveledBox(0, -0.05, 2.0, 12.0, 0.04, 16.0, 0.02),
      portraitBg: (function(){
        var p = new Float32Array([-1,-1,0.998, 1,-1,0.998, 1,1,0.998, -1,1,0.998]);
        var n = new Float32Array([0,0,1, 0,0,1, 0,0,1, 0,0,1]);
        var u = new Float32Array([0,0, 1,0, 1,1, 0,1]);
        var idx = new Uint16Array([0,1,2, 0,2,3]);
        return { pos: p, norm: n, uv: u, indices: idx, vcount: 4, icount: 6 };
      })(),
      holoCard: (function(){
        // Backwards-mirrored quad for holographic projection facing operator!
        var p = new Float32Array([-0.14,0.0,0, 0.14,0.0,0, 0.14,0.20,0, -0.14,0.20,0]);
        var n = new Float32Array([0,0,1, 0,0,1, 0,0,1, 0,0,1]);
        var u = new Float32Array([0,1, 1,1, 1,0, 0,0]);
        var idx = new Uint16Array([0,1,2, 0,2,3]);
        return { pos: p, norm: n, uv: u, indices: idx, vcount: 4, icount: 6 };
      })()
    };
  }

  // --- Dynamic Face/Body Skin, Nails, Scars, Tattoos & Hair Streak Compositors (Exact MakeHuman UV Anchors!) ---
  function createSkinCompositor(baseImg, faceUV, nailUVs, tattooUV){
    var canvas = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = 512; canvas.height = 512;
    var ctx = canvas.getContext('2d');
    return {
      canvas: canvas,
      update: function(state){
        ctx.clearRect(0,0,512,512);
        if (baseImg && baseImg.width > 0) ctx.drawImage(baseImg, 0, 0, 512, 512);
        else { ctx.fillStyle = '#e8c4b0'; ctx.fillRect(0,0,512,512); }

        // Apply rich warm skin pigmentation tint (or cool metallic/synth tone when finish=android/metallic)
        var rgb = hexToRgb01(state.skinHex || '#cf9170');
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb('+Math.round(rgb[0]*255)+','+Math.round(rgb[1]*255)+','+Math.round(rgb[2]*255)+')';
        ctx.fillRect(0,0,512,512);

        // Subtle cheek/nose/lip subsurface warmth boost on face UV island
        ctx.globalCompositeOperation = 'soft-light';
        var nose = (faceUV && faceUV.nose) || [0.87, 0.52];
        var grad = ctx.createRadialGradient(nose[0]*512, nose[1]*512, 8, nose[0]*512, nose[1]*512, 95);
        grad.addColorStop(0, 'rgba(245,145,118,0.42)');
        grad.addColorStop(1, 'rgba(245,145,118,0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(340, 120, 172, 280);

        // Synthetic Android Seam Panel Lines across face/cheek/neck/collarbone when finish === 'android'
        ctx.globalCompositeOperation = 'source-over';
        if (state.skinFinish === 'android'){
          ctx.strokeStyle = 'rgba(22,32,42,0.58)';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(410, 140); ctx.lineTo(432, 200); ctx.lineTo(445, 224); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(410, 370); ctx.lineTo(432, 310); ctx.lineTo(445, 286); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(155, 65); ctx.lineTo(205, 92); ctx.lineTo(255, 65); ctx.stroke();
          ctx.fillStyle = 'rgba(0,224,255,0.68)';
          ctx.fillRect(431, 198, 3, 3); ctx.fillRect(431, 309, 3, 3);
        }

        // Fingernail Polish across all 10 measured MakeHuman distal nailbed UVs (default = 'none')
        if (state.nailColor && state.nailColor !== 'none' && nailUVs && nailUVs.length){
          ctx.save();
          ctx.fillStyle = state.nailColor;
          for (var ni = 0; ni < nailUVs.length; ni++){
            var nu = nailUVs[ni][0] * 512, nv = nailUVs[ni][1] * 512;
            ctx.beginPath();
            ctx.ellipse(nu, nv, 2.8, 3.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.42)';
            ctx.fillRect(nu - 0.8, nv - 1.5, 1.4, 1.6);
            ctx.fillStyle = state.nailColor;
          }
          ctx.restore();
        }

        // Tattoos & Glowing Cyber Tattoos at verified body zone UV centers (default = 'none')
        var tatStyle = state.tattooStyle || 'none';
        if (tatStyle !== 'none'){
          var tzKey = state.tattooZone || 'arm_l';
          var tz = (tattooUV && tattooUV[tzKey]) || [0.606, 0.171];
          var tx = tz[0] * 512, ty = tz[1] * 512;
          var tatCol = state.tattooColor || '#131d28';
          var tatGlow = !!state.tattooGlow;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.lineCap = 'round';
          if (tatGlow){
            ctx.shadowColor = tatCol;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = tatCol;
          } else {
            ctx.strokeStyle = tatCol;
            ctx.globalAlpha = 0.78;
          }
          ctx.lineWidth = 2.0;
          if (tatStyle === 'circuit' || tatStyle === 'cyber'){
            ctx.beginPath();
            ctx.moveTo(-18,-10); ctx.lineTo(-6,-10); ctx.lineTo(0,0); ctx.lineTo(18,0);
            ctx.moveTo(-14, 10); ctx.lineTo(-2,10); ctx.lineTo(6,2); ctx.lineTo(14,12);
            ctx.stroke();
            ctx.fillStyle = tatGlow ? '#ffffff' : tatCol;
            ctx.beginPath(); ctx.arc(-18,-10,2.2,0,Math.PI*2); ctx.arc(18,0,2.4,0,Math.PI*2); ctx.arc(14,12,2.0,0,Math.PI*2); ctx.fill();
          } else if (tatStyle === 'tribal'){
            ctx.beginPath();
            ctx.moveTo(-18,-14); ctx.quadraticCurveTo(0,-2, 18,-16);
            ctx.moveTo(-16,  0); ctx.quadraticCurveTo(0,12, 16, -2);
            ctx.moveTo( -8, 12); ctx.quadraticCurveTo(0,22,  8, 12);
            ctx.stroke();
          } else if (tatStyle === 'wing'){
            for (var wi = -2; wi <= 2; wi++){
              ctx.beginPath(); ctx.moveTo(0, wi*4); ctx.quadraticCurveTo(wi*6, wi*4-6, wi*11, wi*4-2); ctx.stroke();
            }
          }
          ctx.restore();
        }

        // Beard / Stubble / Goatee directly along jaw/chin/lip UV anchors
        if (state.beardStyle && state.beardStyle !== 'clean'){
          var hrgb = hexToRgb01(state.hairHex || '#2a1f1a');
          var alpha = state.beardStyle === 'stubble' ? 0.34 : 0.72;
          ctx.fillStyle = 'rgba('+Math.round(hrgb[0]*255)+','+Math.round(hrgb[1]*255)+','+Math.round(hrgb[2]*255)+','+alpha+')';
          var chin = faceUV.chin || [0.97, 0.51];
          var ulip = faceUV.ulip || [0.89, 0.51];
          var ljaw = faceUV.ljaw || [0.94, 0.42];
          var rjaw = faceUV.rjaw || [0.94, 0.60];
          ctx.beginPath(); ctx.ellipse(chin[0]*512, chin[1]*512, 18, 28, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(ulip[0]*512, ulip[1]*512, 6, 18, 0, 0, Math.PI*2); ctx.fill();
          if (state.beardStyle !== 'goatee'){
            ctx.beginPath(); ctx.ellipse(ljaw[0]*512, ljaw[1]*512, 22, 34, 0.25, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(rjaw[0]*512, rjaw[1]*512, 22, 34, -0.25, 0, Math.PI*2); ctx.fill();
          }
          ctx.fillStyle = 'rgba(20,14,12,0.18)';
          for (var fi = 0; fi < 160; fi++){
            var fx = (ulip[0] + ((fi*37)%100)/1000) * 512;
            var fy = (0.38 + ((fi*61)%26)/100) * 512;
            ctx.fillRect(fx, fy, 1.5, 1.5);
          }
        }

        // Sci-Fi Scars (none, slash, triple_puncture, claw, plasma_burn) + Cybernetic Face Seams!
        var scarType = state.scarType || (state.scars > 0.05 ? 'slash' : 'none');
        var scarPos = state.scarPos || { x: 0.5, y: 0.5, enabled: false };
        if (scarType !== 'none' || scarPos.enabled){
          var effType = scarType === 'none' ? 'slash' : scarType;
          var sx = (0.79 + (scarPos.y - 0.5) * 0.16) * 512;
          var sy = (0.52 + (scarPos.x - 0.5) * 0.24) * 512;
          ctx.save();
          if (effType === 'slash'){
            ctx.strokeStyle = 'rgba(182,92,86,0.88)'; ctx.lineWidth = 2.6;
            ctx.beginPath(); ctx.moveTo(sx-14, sy-7); ctx.lineTo(sx+15, sy+9); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,220,210,0.48)'; ctx.lineWidth = 1.0;
            ctx.beginPath(); ctx.moveTo(sx-14, sy-5); ctx.lineTo(sx+15, sy+11); ctx.stroke();
          } else if (effType === 'triple_puncture'){
            // Three precision dermal neural/cyber port punctures with metallic titanium bezels!
            for (var pi = -1; pi <= 1; pi++){
              var px = sx + pi * 7.5, py = sy + pi * 3.5;
              ctx.fillStyle = 'rgba(125,142,158,0.92)';
              ctx.beginPath(); ctx.arc(px, py, 3.0, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = 'rgba(18,22,28,0.98)';
              ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI*2); ctx.fill();
              ctx.fillStyle = 'rgba(0,224,255,0.65)';
              ctx.fillRect(px - 0.5, py - 0.5, 1.0, 1.0);
            }
          } else if (effType === 'claw'){
            for (var ci = -1; ci <= 1; ci++){
              ctx.strokeStyle = 'rgba(176,86,82,0.86)'; ctx.lineWidth = 2.0;
              ctx.beginPath(); ctx.moveTo(sx-13, sy-9 + ci*5.5); ctx.quadraticCurveTo(sx, sy + ci*5.5 - 2, sx+14, sy+8 + ci*5.5); ctx.stroke();
            }
          } else if (effType === 'plasma_burn'){
            var bg = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18);
            bg.addColorStop(0, 'rgba(92,48,46,0.86)');
            bg.addColorStop(0.55, 'rgba(155,88,78,0.62)');
            bg.addColorStop(1, 'rgba(185,112,96,0.0)');
            ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI*2); ctx.fill();
          }
          ctx.restore();
        }
        if (state.cyberFace > 0.15){
          ctx.strokeStyle = 'rgba(42,60,72,' + (0.45 + state.cyberFace*0.4) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(430, 185); ctx.lineTo(445, 225); ctx.lineTo(468, 228); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(430, 325); ctx.lineTo(445, 285); ctx.lineTo(468, 282); ctx.stroke();
          ctx.fillStyle = 'rgba(0,229,255,0.75)';
          ctx.fillRect(443, 223, 3, 3); ctx.fillRect(443, 284, 3, 3);
        }
      }
    };
  }

  function createUnderwearCompositor(braBaseImg, pantiesBaseImg, briefsBaseImg){
    var mkC = function(){
      if (typeof document === 'undefined' || !document.createElement) return null;
      var c = document.createElement('canvas'); c.width = 256; c.height = 256; return c;
    };
    var cBra = mkC(), cPan = mkC(), cBrf = mkC();
    if (!cBra || !cPan || !cBrf) return null;
    return {
      braCanvas: cBra, pantiesCanvas: cPan, briefsCanvas: cBrf,
      update: function(state){
        var col = state.underwearColor || '#1f2630';
        var braStyle = state.underwearBra || 'sport';
        var panStyle = state.underwearBottom || 'panties_classic';

        // 1. Male / Unisex Boxers (briefs mesh: dark compression boxer-briefs + crisp stitched waistband)
        var gx = cBrf.getContext('2d');
        gx.clearRect(0,0,256,256);
        if (briefsBaseImg && briefsBaseImg.width > 0) gx.drawImage(briefsBaseImg, 0, 0, 256, 256);
        else { gx.fillStyle = '#28303b'; gx.fillRect(0,0,256,256); }
        gx.globalCompositeOperation = 'multiply';
        gx.fillStyle = (panStyle === 'boxers_olive') ? '#3b4a3d' : (panStyle === 'boxers_charcoal' ? '#242932' : col);
        gx.fillRect(0,0,256,256);
        gx.globalCompositeOperation = 'source-over';
        // Crisp dark elastic waistband along upper rim & subtle seam stitch
        gx.fillStyle = 'rgba(18,22,28,0.85)'; gx.fillRect(0, 0, 256, 28);
        gx.fillStyle = 'rgba(160,185,205,0.35)'; gx.fillRect(0, 26, 256, 2);

        // 2. Female Bra (cups v=0.08..0.55, band v=0.65..0.87 — supports sport, lace_delicate, sheer_mesh, strappy!)
        var bx = cBra.getContext('2d');
        bx.clearRect(0,0,256,256);
        var cupAlpha = braStyle === 'sheer_mesh' ? 0.34 : (braStyle === 'lace_delicate' ? 0.64 : 0.96);
        bx.fillStyle = col;
        bx.globalAlpha = cupAlpha;
        bx.fillRect(0, 0, 256, 256);
        bx.globalAlpha = 1.0;
        if (braStyle === 'lace_delicate'){
          // Delicate scalloped lace filigree pattern across cup UV zone!
          bx.strokeStyle = 'rgba(255,255,255,0.22)';
          bx.lineWidth = 1.2;
          for (var ly = 16; ly < 152; ly += 14){
            for (var lx = 12; lx < 248; lx += 16){
              bx.beginPath(); bx.arc(lx + ((ly/14)%2)*8, ly, 6, 0, Math.PI*2); bx.stroke();
            }
          }
          // Punch micro-lace transparent eyelets via destination-out
          bx.globalCompositeOperation = 'destination-out';
          bx.fillStyle = 'rgba(0,0,0,0.48)';
          for (var hy = 20; hy < 148; hy += 14){
            for (var hx = 16; hx < 244; hx += 16){
              bx.beginPath(); bx.arc(hx + ((hy/14)%2)*8, hy, 3.2, 0, Math.PI*2); bx.fill();
            }
          }
          bx.globalCompositeOperation = 'source-over';
        } else if (braStyle === 'sheer_mesh'){
          // Crisp satin underwire & strap trim (opaque) framing delicate sheer mesh cups!
          bx.fillStyle = col;
          bx.fillRect(0, 148, 256, 28); // firm elastic band
          bx.fillRect(0, 0, 256, 16);   // top trim edge
        } else if (braStyle === 'strappy'){
          bx.strokeStyle = '#00d8ff'; bx.lineWidth = 2.0;
          bx.strokeRect(4, 152, 248, 16);
        }

        // 3. Female Panties (classic, lace, sheer)
        var px = cPan.getContext('2d');
        px.clearRect(0,0,256,256);
        var panAlpha = panStyle === 'panties_sheer' ? 0.36 : (panStyle === 'panties_lace' ? 0.66 : 0.96);
        px.fillStyle = col;
        px.globalAlpha = panAlpha;
        px.fillRect(0, 0, 256, 256);
        px.globalAlpha = 1.0;
        if (panStyle === 'panties_lace'){
          px.globalCompositeOperation = 'destination-out';
          px.fillStyle = 'rgba(0,0,0,0.42)';
          for (var py2 = 24; py2 < 236; py2 += 16){
            for (var px2 = 16; px2 < 240; px2 += 16){
              px.beginPath(); px.arc(px2, py2, 3.0, 0, Math.PI*2); px.fill();
            }
          }
          px.globalCompositeOperation = 'source-over';
        }
        // Firm satin waistband trim
        px.fillStyle = col; px.fillRect(0, 0, 256, 18);
      }
    };
  }

  function createHairCompositor(baseImg){
    var canvas = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = 512; canvas.height = 512;
    var ctx = canvas.getContext('2d');
    return {
      canvas: canvas,
      update: function(state, activeBaseImg){
        var img = activeBaseImg || baseImg;
        ctx.clearRect(0,0,512,512);
        if (img && img.width > 0) ctx.drawImage(img, 0, 0, 512, 512);
        else { ctx.fillStyle = '#fff'; ctx.fillRect(0,0,512,512); }

        // Movable/Rotatable Gray Streaks composited directly into hair alpha mask!
        var streak = state.grayStreak || { enabled: false, x: 0.38, y: 0.45, angle: 0.4, width: 0.18 };
        if (streak.enabled){
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.translate(streak.x * 512, streak.y * 512);
          ctx.rotate(streak.angle || 0);
          var sg = ctx.createLinearGradient(-512*streak.width, 0, 512*streak.width, 0);
          sg.addColorStop(0, 'rgba(225,234,242,0.0)');
          sg.addColorStop(0.5, 'rgba(235,244,252,0.92)');
          sg.addColorStop(1, 'rgba(225,234,242,0.0)');
          ctx.fillStyle = sg;
          ctx.fillRect(-512*streak.width, -512, 1024*streak.width, 1024);
          ctx.restore();
        }
      }
    };
  }

  function createHologramCanvas(){
    var canvas = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;
    if (!canvas) return null;
    canvas.width = 256; canvas.height = 192;
    var ctx = canvas.getContext('2d');
    return {
      canvas: canvas,
      update: function(accepted, operatorName){
        ctx.clearRect(0,0,256,192);
        ctx.fillStyle = accepted ? 'rgba(0, 229, 255, 0.22)' : 'rgba(255, 92, 66, 0.22)';
        ctx.fillRect(6,6,244,180);
        ctx.strokeStyle = accepted ? 'rgba(110, 245, 255, 0.92)' : 'rgba(255, 128, 92, 0.92)';
        ctx.lineWidth = 3;
        ctx.strokeRect(8,8,240,176);
        // Backwards-mirrored text so facing the operator reads cleanly to them while seen backwards from behind-shoulder camera!
        ctx.save();
        ctx.translate(256, 0);
        ctx.scale(-1, 1);
        ctx.fillStyle = accepted ? '#a6f9ff' : '#ffb8a8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(accepted ? 'MISSION ACCEPTED' : 'MISSION NOT', 22, 46);
        ctx.font = 'bold 14px monospace';
        ctx.fillText('SECTOR 4 // ORE DEPOT', 22, 76);
        ctx.fillText('OP: ' + String(operatorName || 'VIGIL-01').slice(0,12), 22, 100);
        ctx.fillText(accepted ? 'CONTRACT: LOCKED' : 'CONTRACT: DECLINED', 22, 124);
        // Holographic telemetry bars
        for (var i = 0; i < 8; i++){
          var bh = 12 + ((i * 19 + (accepted ? 11 : 4)) % 28);
          ctx.fillRect(24 + i * 24, 168 - bh, 14, bh);
        }
        ctx.restore();
      }
    };
  }

  // --- Skeletal Pose Solver (World-Space Overrides + CC0 Anim Clip Blender + Morph-Joint Pivot & Skel Proportions!) ---
  function evaluateSkeletonPose(kit, animName, animTime, worldOverrides, rootOffset, heightScale, morphWeights, skelProps){
    var sk = kit.skeleton;
    var n = sk.names.length;
    var anim = (animName && animName !== 'rest') ? (kit.anims[animName] || null) : null;
    var frameF = 0, f0 = 0, f1 = 0, alpha = 0;
    if (anim && anim.frames > 1){
      var tNorm = ((animTime % anim.duration) + anim.duration) % anim.duration / anim.duration;
      frameF = tNorm * (anim.frames - 1);
      f0 = Math.floor(frameF);
      f1 = Math.min(anim.frames - 1, f0 + 1);
      alpha = frameF - f0;
    }

    var worlds = [];
    var skinMats = new Float32Array(n * 16);
    var ovr = worldOverrides || {};
    var ro = rootOffset || [0,0,0];
    var hScale = heightScale || 1.0;
    var sp = skelProps || {};

    // Accumulate world-space morph joint offsets from CC0 base_body.joints.json
    var mj = sk.morphJoints || {};
    var dWorld = null;
    if (morphWeights){
      var mwKeys = Object.keys(morphWeights);
      for (var mki = 0; mki < mwKeys.length; mki++){
        var mk = mwKeys[mki], wval = morphWeights[mk];
        if (!wval || !mj[mk]) continue;
        if (!dWorld){ dWorld = new Float32Array(n * 3); }
        var jmap = mj[mk];
        var jkeys = Object.keys(jmap);
        for (var jki = 0; jki < jkeys.length; jki++){
          var bidx = parseInt(jkeys[jki], 10);
          var dv = jmap[jkeys[jki]];
          dWorld[bidx*3] += dv[0]*wval; dWorld[bidx*3+1] += dv[1]*wval; dWorld[bidx*3+2] += dv[2]*wval;
        }
      }
    }

    // Build bind worlds cleanly once to convert world-space morphJoint offsets to exact local shifts + morphed IBM
    var baseWorlds = null;
    if (dWorld){
      baseWorlds = [];
      for (var bi = 0; bi < n; bi++){
        var bpi = sk.parents[bi];
        var bloc = mat4FromQuat(sk.restR[bi], sk.restT[bi]);
        baseWorlds.push(bpi >= 0 ? mat4Mul(baseWorlds[bpi], bloc) : bloc);
      }
    }

    for (var ji = 0; ji < n; ji++){
      var pi = sk.parents[ji];
      var jname = sk.names[ji];
      var t = sk.restT[ji];
      var r = sk.restR[ji];
      if (anim && anim.tracks[ji] && !ovr[jname]){
        var tr = anim.tracks[ji];
        var q0 = [tr[f0*4], tr[f0*4+1], tr[f0*4+2], tr[f0*4+3]];
        var q1 = [tr[f1*4], tr[f1*4+1], tr[f1*4+2], tr[f1*4+3]];
        var dq = quatSlerp(q0, q1, alpha);
        r = quatMul(r, dq);
      }
      var tx = t[0], ty = t[1], tz = t[2];
      if (dWorld){
        // World delta relative to parent transformed by transpose(parent.R) -> exact local offset!
        var dwx = dWorld[ji*3]   - (pi >= 0 ? dWorld[pi*3]   : 0);
        var dwy = dWorld[ji*3+1] - (pi >= 0 ? dWorld[pi*3+1] : 0);
        var dwz = dWorld[ji*3+2] - (pi >= 0 ? dWorld[pi*3+2] : 0);
        if (pi >= 0){
          var pw = baseWorlds[pi];
          tx += pw[0]*dwx + pw[1]*dwy + pw[2]*dwz;
          ty += pw[4]*dwx + pw[5]*dwy + pw[6]*dwz;
          tz += pw[8]*dwx + pw[9]*dwy + pw[10]*dwz;
        } else {
          tx += dwx; ty += dwy; tz += dwz;
        }
      }
      // Skeleton / Android bone proportion adjustments (shoulderWidth, armLength, legLength, torsoWidth)
      if (jname === 'upperarm_l' || jname === 'clavicle_l') tx += (sp.shoulderWidth || 0) * 0.045;
      if (jname === 'upperarm_r' || jname === 'clavicle_r') tx -= (sp.shoulderWidth || 0) * 0.045;
      if (jname === 'lowerarm_l' || jname === 'hand_l')     ty += (sp.armLength || 0) * 0.055;
      if (jname === 'lowerarm_r' || jname === 'hand_r')     ty += (sp.armLength || 0) * 0.055;
      if (jname === 'calf_l' || jname === 'calf_r')         ty -= (sp.legLength || 0) * 0.055;
      if (jname === 'foot_l' || jname === 'foot_r')         ty -= (sp.legLength || 0) * 0.055;
      if (ji === 0){ tx += ro[0]; ty += ro[1]; tz += ro[2]; }

      var loc = mat4FromQuat(r, [tx, ty, tz]);
      if (ji === 0 && hScale !== 1.0){
        loc[0]*=hScale; loc[1]*=hScale; loc[2]*=hScale;
        loc[4]*=hScale; loc[5]*=hScale; loc[6]*=hScale;
        loc[8]*=hScale; loc[9]*=hScale; loc[10]*=hScale;
      }
      var wNoDelta = pi >= 0 ? mat4Mul(worlds[pi], loc) : loc;
      if (ovr[jname]){
        var eu = ovr[jname];
        var Rw = mat4FromEulerXYZ(eu[0], eu[1], eu[2]);
        var px = wNoDelta[12], py = wNoDelta[13], pz = wNoDelta[14];
        wNoDelta[12] = 0; wNoDelta[13] = 0; wNoDelta[14] = 0;
        var wRot = mat4Mul(Rw, wNoDelta);
        wRot[12] = px; wRot[13] = py; wRot[14] = pz;
        worlds.push(wRot);
      } else {
        worlds.push(wNoDelta);
      }
      // Apply localized skeletal chassis scale (headSize, neckWidth, torsoWidth, calfBulk, footSize)
      var wScaled = worlds[ji];
      if (jname === 'head' && sp.headSize){
        var sc = 1.0 + sp.headSize * 0.18;
        wScaled = new Float32Array(wScaled);
        for (var c=0;c<12;c++) if ((c&3)<3) wScaled[c] *= sc;
      } else if (jname === 'spine_03' && sp.torsoWidth){
        var ts = 1.0 + sp.torsoWidth * 0.16;
        wScaled = new Float32Array(wScaled);
        wScaled[0]*=ts; wScaled[1]*=ts; wScaled[2]*=ts; wScaled[8]*=ts; wScaled[9]*=ts; wScaled[10]*=ts;
      } else if ((jname === 'thigh_l' || jname === 'thigh_r') && sp.hipWidth){
        var hw = 1.0 + sp.hipWidth * 0.16;
        wScaled = new Float32Array(wScaled);
        wScaled[0]*=hw; wScaled[8]*=hw;
      } else if ((jname === 'calf_l' || jname === 'calf_r') && sp.calfBulk){
        var cb = 1.0 + sp.calfBulk * 0.18;
        wScaled = new Float32Array(wScaled);
        wScaled[0]*=cb; wScaled[8]*=cb;
      } else if ((jname === 'foot_l' || jname === 'foot_r' || jname === 'ball_l' || jname === 'ball_r') && sp.footSize){
        var fs = 1.0 + sp.footSize * 0.18;
        wScaled = new Float32Array(wScaled);
        for (var c2=0;c2<12;c2++) if ((c2&3)<3) wScaled[c2] *= fs;
      }
      // Adjust IBM translation cleanly if dWorld shifted this bind joint!
      var ibmMat = sk.ibms[ji];
      if (dWorld){
        var m4 = new Float32Array(ibmMat);
        var jdx = -dWorld[ji*3], jdy = -dWorld[ji*3+1], jdz = -dWorld[ji*3+2];
        m4[12] += ibmMat[0]*jdx + ibmMat[4]*jdy + ibmMat[8]*jdz;
        m4[13] += ibmMat[1]*jdx + ibmMat[5]*jdy + ibmMat[9]*jdz;
        m4[14] += ibmMat[2]*jdx + ibmMat[6]*jdy + ibmMat[10]*jdz;
        ibmMat = m4;
      }
      var sm = mat4Mul(wScaled, ibmMat);
      skinMats.set(sm, ji * 16);
    }
    return { worlds: worlds, skinMats: skinMats };
  }

  // --- Shared Morph Target CPU/GPU Evaluator (with 2D Bust Quad + Bra Lift + Damped Spring Jiggle!) ---
  function computeMorphWeights(state, springDisp){
    var w = {};
    var g = Number(state.gender || 0.0); // -1 male .. +1 female
    if (g >= 0) w.gender_female = g; else w.gender_male = -g;
    var mus = Number(state.muscle || 0.5);
    if (mus >= 0.5) w.muscle_max = (mus - 0.5) * 2.0; else w.muscle_min = (0.5 - mus) * 2.0;
    var wt = Number(state.weight || 0.45);
    if (wt >= 0.5) w.weight_max = (wt - 0.5) * 2.0; else w.weight_min = (0.5 - wt) * 2.0;
    w.age_old = Number(state.age || 0.15);

    // 4-Corner Bust Archetype Quad Pad + Continuous Controls + Bra Lift & Upper Plump (when female!)
    var femWeight = Math.max(0, Math.min(1, (g - 0.1) / 0.9));
    if (femWeight > 0.01){
      var bq = state.bustQuad || { x: 0.25, y: 0.25 }; // [-1..1, -1..1]
      var ux = (Math.max(-1, Math.min(1, bq.x || 0)) + 1) * 0.5;
      var uy = (Math.max(-1, Math.min(1, bq.y || 0)) + 1) * 0.5;
      // 4 corners: TL(Teardrop), TR(Full Round), BL(Petite Athletic), BR(Wide Heavy)
      var cupShift  = (1-ux)*(1-uy)*(-0.55) + ux*(1-uy)*(0.90) + (1-ux)*uy*(0.15) + ux*uy*(0.75);
      var firmShift = (1-ux)*(1-uy)*( 0.40) + ux*(1-uy)*(-0.45) + (1-ux)*uy*(-0.20) + ux*uy*(0.65);
      var hgtShift  = (1-ux)*(1-uy)*( 0.20) + ux*(1-uy)*(-0.35) + (1-ux)*uy*(-0.15) + ux*uy*(0.35);
      var ptShift   = (1-ux)*(1-uy)*(-0.35) + ux*(1-uy)*(-0.10) + (1-ux)*uy*( 0.05) + ux*uy*(0.45);
      var distShift = (1-ux)*(1-uy)*(-0.15) + ux*(1-uy)*( 0.60) + (1-ux)*uy*( 0.00) + ux*uy*(-0.10);

      var cup  = Math.max(-1, Math.min(1, cupShift  + (Number(state.bustSize !== undefined ? state.bustSize : 0.5) - 0.5) * 1.4));
      var firm = Math.max(-1, Math.min(1, firmShift + (Number(state.bustFirmness !== undefined ? state.bustFirmness : 0.5) - 0.5) * 1.4));
      var hgt  = Math.max(-1, Math.min(1, hgtShift  + Number(state.bustHeight || 0) * 0.8));
      var dist = Math.max(-1, Math.min(1, distShift + Number(state.bustSpacing || 0) * 0.9));
      var pt   = Math.max(-1, Math.min(1, ptShift));

      // Realistic Bra Support: lifts + gently plumps upper breast curve when wearing underwear bra!
      var wearingBra = (state.outfit === 'underwear' && (state.underwearBra || 'sport') !== 'none') || (state.outfit !== 'underwear' && state.outfit !== 'none');
      if (wearingBra){
        var liftBoost = state.outfit === 'underwear' ? 0.34 : 0.20;
        hgt  = Math.min(1, hgt + liftBoost);
        firm = Math.min(1, firm + liftBoost * 0.75);
        pt   = Math.min(1, pt + liftBoost * 0.45);
      }

      if (cup >= 0)  w.breast_cup_max  = cup * femWeight;  else w.breast_cup_min  = -cup * femWeight;
      if (firm >= 0) w.breast_firm_max = firm * femWeight; else w.breast_firm_min = -firm * femWeight;
      if (hgt >= 0)  w.bdet_breast_height_incr = hgt * femWeight; else w.bdet_breast_height_decr = -hgt * femWeight;
      if (dist >= 0) w.bdet_breast_dist_incr   = dist * femWeight; else w.bdet_breast_dist_decr   = -dist * femWeight;
      if (pt >= 0)   w.bdet_breast_point_incr  = pt * femWeight;  else w.bdet_breast_point_decr  = -pt * femWeight;

      // Damped spring physics displacement mapped to CC0 dyn_breast_* 2cm targets!
      if (springDisp){
        var sx = Math.max(-1, Math.min(1, springDisp[0] / 0.012));
        var sy = Math.max(-1, Math.min(1, springDisp[1] / 0.012));
        var sz = Math.max(-1, Math.min(1, springDisp[2] / 0.012));
        if (sy > 0.01) w.dyn_breast_up = sy * femWeight;    else if (sy < -0.01) w.dyn_breast_down = -sy * femWeight;
        if (sx > 0.01) w.dyn_breast_left = sx * femWeight;  else if (sx < -0.01) w.dyn_breast_right = -sx * femWeight;
        if (sz > 0.01) w.dyn_breast_fwd = sz * femWeight;   else if (sz < -0.01) w.dyn_breast_back = -sz * femWeight;
      }
    }

    // Automatic corrective cross-morphs (prevents pinching across extreme gender/age/muscle/weight/bust combos!)
    if (w.gender_female && w.age_old)    w.corr_gender_female__age_old    = w.gender_female * w.age_old;
    if (w.gender_male   && w.age_old)    w.corr_gender_male__age_old      = w.gender_male   * w.age_old;
    if (w.gender_female && w.muscle_max) w.corr_gender_female__muscle_max = w.gender_female * w.muscle_max;
    if (w.gender_female && w.muscle_min) w.corr_gender_female__muscle_min = w.gender_female * w.muscle_min;
    if (w.gender_male   && w.muscle_max) w.corr_gender_male__muscle_max   = w.gender_male   * w.muscle_max;
    if (w.gender_male   && w.muscle_min) w.corr_gender_male__muscle_min   = w.gender_male   * w.muscle_min;
    if (w.gender_female && w.weight_max) w.corr_gender_female__weight_max = w.gender_female * w.weight_max;
    if (w.gender_female && w.weight_min) w.corr_gender_female__weight_min = w.gender_female * w.weight_min;
    if (w.gender_male   && w.weight_max) w.corr_gender_male__weight_max   = w.gender_male   * w.weight_max;
    if (w.gender_male   && w.weight_min) w.corr_gender_male__weight_min   = w.gender_male   * w.weight_min;
    if (w.breast_cup_min && w.breast_firm_min) w.corr_breast_cup_min__breast_firm_min = w.breast_cup_min * w.breast_firm_min;
    if (w.breast_cup_min && w.breast_firm_max) w.corr_breast_cup_min__breast_firm_max = w.breast_cup_min * w.breast_firm_max;
    if (w.breast_cup_max && w.breast_firm_min) w.corr_breast_cup_max__breast_firm_min = w.breast_cup_max * w.breast_firm_min;
    if (w.breast_cup_max && w.breast_firm_max) w.corr_breast_cup_max__breast_firm_max = w.breast_cup_max * w.breast_firm_max;

    var mapPair = function(val, decKey, incKey){
      var v = Number(val || 0);
      if (v > 0.01) w[incKey] = v;
      else if (v < -0.01) w[decKey] = -v;
    };
    mapPair(state.noseWidth,  'face_nose_width_decr',  'face_nose_width_incr');
    mapPair(state.noseLength, 'face_nose_length_decr', 'face_nose_length_incr');
    mapPair(state.noseHeight, 'face_nose_height_decr', 'face_nose_height_incr');
    mapPair(state.jawWidth,   'face_jaw_width_decr',   'face_jaw_width_incr');
    mapPair(state.chinSize,   'face_chin_decr',        'face_chin_incr');
    mapPair(state.cheekbones, 'face_cheekbones_decr',  'face_cheekbones_incr');
    mapPair(state.eyeSize,    'face_eye_size_decr',    'face_eye_size_incr');
    mapPair(state.eyeSpacing, 'face_eye_spacing_decr', 'face_eye_spacing_incr');
    mapPair(state.eyeTilt,    'face_eye_tilt_decr',    'face_eye_tilt_incr');
    mapPair(state.lipSize,    'face_lips_decr',        'face_lips_incr');
    mapPair(state.mouthWidth, 'face_mouth_width_decr', 'face_mouth_width_incr');
    mapPair(state.earSize,    'face_ear_size_decr',    'face_ear_size_incr');
    mapPair(state.forehead,   'face_forehead_decr',    'face_forehead_incr');

    var expr = state.expression || 'neutral';
    var blink = Number(state.blink || 0);
    if (expr === 'blink' || blink > 0.1){ w.blink_left = Math.max(blink, 0.9); w.blink_right = Math.max(blink, 0.9); }
    if (expr === 'smirk') w.expr_smirk = 0.88;
    if (expr === 'gasp' || expr === 'bleed') { w.expr_jaw_open = 0.72; w.expr_brow_furrow = 0.65; }
    if (expr === 'focused') w.expr_brow_furrow = 0.80;
    return w;
  }

  function applyMeshMorphsAndTuck(mesh, morphWeights, tuckAmount){
    var p = mesh.dynPos, rp = mesh.restPos;
    p.set(rp);
    var keys = Object.keys(morphWeights);
    for (var k = 0; k < keys.length; k++){
      var mk = keys[k], wt = morphWeights[mk];
      if (!wt || !mesh.morphs[mk]) continue;
      var m = mesh.morphs[mk], idx = m.idx, del = m.delta;
      for (var i = 0; i < idx.length; i++){
        var vi = idx[i] * 3, di = i * 3;
        p[vi] += del[di]*wt; p[vi+1] += del[di+1]*wt; p[vi+2] += del[di+2]*wt;
      }
    }
    if (tuckAmount > 0 && mesh.hairTuck){
      var ht = mesh.hairTuck;
      for (var hi = 0; hi < p.length; hi++) p[hi] += ht[hi] * tuckAmount;
    } else if (mesh.hairCrown){
      // Gently clear skull surface by +3.5mm so crown hair strands never z-fight into scalp
      for (var vi = 0; vi < p.length; vi += 3){
        var dx = p[vi], dy = p[vi+1] - 1.545, dz = p[vi+2] - 0.020;
        var rl = Math.hypot(dx, dy, dz);
        if (rl > 0.04 && rl < 0.135 && p[vi+1] > 1.52){
          var lift = 0.0035 / rl;
          p[vi] += dx * lift; p[vi+1] += dy * lift; p[vi+2] += dz * lift;
        }
      }
    }
    return p;
  }

  // --- GLSL Shaders (WebGL2 & WebGL1-safe: explicit 3-column mat3 constructors!) ---
  var VS_SKINNED =
    'attribute vec3 aPos;\n' +
    'attribute vec3 aNorm;\n' +
    'attribute vec2 aUV;\n' +
    'attribute vec4 aJoint;\n' +
    'attribute vec4 aWeight;\n' +
    'uniform mat4 uProj;\n' +
    'uniform mat4 uView;\n' +
    'uniform mat4 uModel;\n' +
    'uniform mat4 uJointMats[53];\n' +
    'uniform float uUseSkin;\n' +
    'varying vec3 vWorldPos;\n' +
    'varying vec3 vNorm;\n' +
    'varying vec2 vUV;\n' +
    'varying float vBodyPart;\n' +
    'void main(){\n' +
    '  vec4 lp = vec4(aPos, 1.0);\n' +
    '  vec3 ln = aNorm;\n' +
    '  float j = aJoint.x;\n' +
    '  vBodyPart = 0.0;\n' +
    '  if (j >= 5.5 && j <= 23.5) vBodyPart = 1.0;\n' +
    '  else if (j >= 24.5 && j <= 42.5) vBodyPart = 2.0;\n' +
    '  else if (j >= 42.5 && j <= 44.5) vBodyPart = 3.0;\n' +
    '  else if (j >= 44.5 && j <= 48.5) vBodyPart = 4.0;\n' +
    '  else if (j >= 48.5 && j <= 52.5) vBodyPart = 5.0;\n' +
    '  if (uUseSkin > 0.5){\n' +
    '    mat4 sm = uJointMats[int(aJoint.x)] * aWeight.x\n' +
    '            + uJointMats[int(aJoint.y)] * aWeight.y\n' +
    '            + uJointMats[int(aJoint.z)] * aWeight.z\n' +
    '            + uJointMats[int(aJoint.w)] * aWeight.w;\n' +
    '    lp = sm * lp;\n' +
    '    mat3 snm = mat3(sm[0].xyz, sm[1].xyz, sm[2].xyz);\n' +
    '    ln = normalize(snm * ln);\n' +
    '  }\n' +
    '  vec4 wp = uModel * lp;\n' +
    '  mat3 m3 = mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz);\n' +
    '  vWorldPos = wp.xyz;\n' +
    '  vNorm = normalize(m3 * ln);\n' +
    '  vUV = aUV;\n' +
    '  gl_Position = uProj * uView * wp;\n' +
    '}\n';

  var VS_INSTANCED =
    'attribute vec3 aPos;\n' +
    'attribute vec3 aNorm;\n' +
    'attribute vec2 aUV;\n' +
    'attribute vec4 aInstOffset; // xyz = world pos, w = yaw\n' +
    'attribute vec4 aInstTint;   // rgb = color, w = scale\n' +
    'uniform mat4 uProj;\n' +
    'uniform mat4 uView;\n' +
    'varying vec3 vWorldPos;\n' +
    'varying vec3 vNorm;\n' +
    'varying vec2 vUV;\n' +
    'varying vec3 vInstTint;\n' +
    'void main(){\n' +
    '  float c = cos(aInstOffset.w), s = sin(aInstOffset.w);\n' +
    '  vec3 p = aPos * aInstTint.w;\n' +
    '  vec3 rp = vec3(p.x*c + p.z*s, p.y, -p.x*s + p.z*c) + aInstOffset.xyz;\n' +
    '  vec3 rn = vec3(aNorm.x*c + aNorm.z*s, aNorm.y, -aNorm.x*s + aNorm.z*c);\n' +
    '  vWorldPos = rp;\n' +
    '  vNorm = normalize(rn);\n' +
    '  vUV = aUV;\n' +
    '  vInstTint = aInstTint.rgb;\n' +
    '  gl_Position = uProj * uView * vec4(rp, 1.0);\n' +
    '}\n';

  var FS_PBR_SSS =
    'precision highp float;\n' +
    'varying vec3 vWorldPos;\n' +
    'varying vec3 vNorm;\n' +
    'varying vec2 vUV;\n' +
    'varying float vBodyPart;\n' +
    'uniform sampler2D uAlbedo;\n' +
    'uniform sampler2D uNormalMap;\n' +
    'uniform float uHasTex;\n' +
    'uniform float uHasNormal;\n' +
    'uniform float uIsSkin;\n' +
    'uniform float uMetallic;\n' +
    'uniform float uRoughness;\n' +
    'uniform float uAlphaCut;\n' +
    'uniform float uEmissive;\n' +
    'uniform vec4 uTint;\n' +
    'uniform vec3 uCamPos;\n' +
    'uniform vec3 uKeyDir;\n' +
    'uniform vec3 uKeyCol;\n' +
    'uniform vec3 uRimCol;\n' +
    'uniform float uCyberMask;\n' +
    'uniform float uSkinFinish;\n' +
    'vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }\n' +
    'void main(){\n' +
    '  vec4 tex = uHasTex > 0.5 ? texture2D(uAlbedo, vUV) : vec4(1.0);\n' +
    '  if (uAlphaCut > 0.01 && tex.a < uAlphaCut) discard;\n' +
    '  vec3 base = tex.rgb * uTint.rgb;\n' +
    '  float met = uMetallic; float rough = clamp(uRoughness, 0.08, 0.96); float skinW = uIsSkin; float emW = uEmissive;\n' +
    '  float bitDiv = pow(2.0, floor(vBodyPart + 0.5));\n' +
    '  float isCyberPart = floor(mod(uCyberMask / bitDiv, 2.0));\n' +
    '  if (uIsSkin > 0.5 && isCyberPart > 0.5){\n' +
    '    float seam = step(0.92, abs(sin(vUV.x * 165.0)) * abs(cos(vUV.y * 165.0)));\n' +
    '    base = mix(vec3(0.24, 0.28, 0.34), vec3(0.04, 0.85, 0.96), seam * 0.72);\n' +
    '    met = 0.88; rough = 0.22; skinW = 0.0; emW += seam * 0.50;\n' +
    '  } else if (uIsSkin > 0.5 && uSkinFinish > 0.5){\n' +
    '    if (uSkinFinish < 1.5){ rough = 0.26; met = 0.08; }\n' +
    '    else if (uSkinFinish < 2.5){ rough = 0.14; met = 0.88; skinW = 0.25; }\n' +
    '    else {\n' +
    '      float hexG = step(0.94, abs(sin(vUV.x * 210.0)) * abs(cos(vUV.y * 210.0)));\n' +
    '      base = mix(base * vec3(0.92, 0.95, 1.02), vec3(0.14, 0.75, 0.92), hexG * 0.25);\n' +
    '      rough = 0.26; met = 0.42; skinW = 0.20; emW += hexG * 0.16;\n' +
    '    }\n' +
    '  }\n' +
    '  vec3 N = normalize(vNorm);\n' +
    '  if (uHasNormal > 0.5 && skinW > 0.5){\n' +
    '    vec3 nm = texture2D(uNormalMap, vUV).xyz * 2.0 - 1.0;\n' +
    '    vec3 upv = abs(N.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);\n' +
    '    vec3 T = normalize(cross(upv, N));\n' +
    '    vec3 B = cross(N, T);\n' +
    '    N = normalize(N + (T * nm.x + B * nm.y) * 0.45);\n' +
    '  }\n' +
    '  vec3 V = normalize(uCamPos - vWorldPos);\n' +
    '  vec3 L = normalize(uKeyDir);\n' +
    '  vec3 H = normalize(L + V);\n' +
    '  float ndl = dot(N, L);\n' +
    '  float diff = skinW > 0.5 ? clamp((ndl + 0.38) / 1.38, 0.0, 1.0) : max(ndl, 0.0);\n' +
    '  vec3 sssTint = skinW > 0.5 ? vec3(0.92, 0.34, 0.20) * smoothstep(-0.35, 0.25, ndl) * (1.0 - max(ndl, 0.0)) * 0.52 : vec3(0.0);\n' +
    '  float specPow = mix(112.0, 8.0, rough);\n' +
    '  float spec = pow(max(dot(N, H), 0.0001), specPow) * mix(0.30, 0.98, met);\n' +
    '  float fres = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 3.4);\n' +
    '  vec3 rim = uRimCol * fres * mix(0.68, 1.15, met);\n' +
    '  vec3 hemi = mix(vec3(0.09, 0.08, 0.09), vec3(0.24, 0.25, 0.28), N.y * 0.5 + 0.5);\n' +
    '  vec3 col = base * (hemi + uKeyCol * diff + sssTint) + vec3(spec) * mix(vec3(1.0, 0.94, 0.88), base, met) + rim;\n' +
    '  col += base * emW;\n' +
    '  if (uEmissive > 0.5 || uTint.a < 0.99 || tex.a < 0.98){ col = aces(col * 1.12); gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), tex.a * uTint.a); return; }\n' +
    '  col = aces(col * 1.16);\n' +
    '  gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), uTint.a);\n' +
    '}\n';

  var FS_INSTANCED =
    'precision highp float;\n' +
    'varying vec3 vWorldPos;\n' +
    'varying vec3 vNorm;\n' +
    'varying vec2 vUV;\n' +
    'varying vec3 vInstTint;\n' +
    'uniform vec3 uCamPos;\n' +
    'uniform vec3 uKeyDir;\n' +
    'void main(){\n' +
    '  vec3 N = normalize(vNorm);\n' +
    '  vec3 V = normalize(uCamPos - vWorldPos);\n' +
    '  float diff = max(dot(N, normalize(uKeyDir)), 0.0);\n' +
    '  float fres = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 3.2);\n' +
    '  vec3 col = vInstTint * (0.24 + 0.85 * diff) + vec3(0.08, 0.25, 0.34) * fres;\n' +
    '  col = clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14), 0.0, 1.0);\n' +
    '  gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), 1.0);\n' +
    '}\n';

  // --- WGSL Compute + Render Shaders (Native WebGPU Path!) ---
  var WGSL_COMPUTE_SKIN =
    'struct Uniforms { jointCount: u32, vertCount: u32, _p0: u32, _p1: u32 };\n' +
    '@group(0) @binding(0) var<uniform> uInfo: Uniforms;\n' +
    '@group(0) @binding(1) var<storage, read> inPos: array<f32>;\n' +
    '@group(0) @binding(2) var<storage, read> inNorm: array<f32>;\n' +
    '@group(0) @binding(3) var<storage, read> inJoints: array<u32>;\n' +
    '@group(0) @binding(4) var<storage, read> inWeights: array<vec4<f32>>;\n' +
    '@group(0) @binding(5) var<storage, read> jointMats: array<mat4x4<f32>>;\n' +
    '@group(0) @binding(6) var<storage, read_write> outPos: array<f32>;\n' +
    '@group(0) @binding(7) var<storage, read_write> outNorm: array<f32>;\n' +
    '@compute @workgroup_size(64)\n' +
    'fn main(@builtin(global_invocation_id) gid: vec3<u32>){\n' +
    '  let i = gid.x;\n' +
    '  if (i >= uInfo.vertCount) { return; }\n' +
    '  let p = vec4<f32>(inPos[i*3u], inPos[i*3u+1u], inPos[i*3u+2u], 1.0);\n' +
    '  let n = vec3<f32>(inNorm[i*3u], inNorm[i*3u+1u], inNorm[i*3u+2u]);\n' +
    '  let jp = inJoints[i];\n' +
    '  let j0 = jp & 255u; let j1 = (jp >> 8u) & 255u; let j2 = (jp >> 16u) & 255u; let j3 = (jp >> 24u) & 255u;\n' +
    '  let w = inWeights[i];\n' +
    '  let sm = jointMats[j0]*w.x + jointMats[j1]*w.y + jointMats[j2]*w.z + jointMats[j3]*w.w;\n' +
    '  let sp = sm * p;\n' +
    '  let nm = mat3x3<f32>(sm[0].xyz, sm[1].xyz, sm[2].xyz);\n' +
    '  let sn = normalize(nm * n);\n' +
    '  outPos[i*3u]=sp.x; outPos[i*3u+1u]=sp.y; outPos[i*3u+2u]=sp.z;\n' +
    '  outNorm[i*3u]=sn.x; outNorm[i*3u+1u]=sn.y; outNorm[i*3u+2u]=sn.z;\n' +
    '}\n';

  var WGSL_RENDER =
    'struct DrawU {\n' +
    '  projView: mat4x4<f32>,\n' +
    '  model: mat4x4<f32>,\n' +
    '  tint: vec4<f32>,\n' +
    '  camPos: vec4<f32>,\n' +
    '  keyDir: vec4<f32>, // xyz = dir, w = skinFinish\n' +
    '  keyCol: vec4<f32>,\n' +
    '  rimCol: vec4<f32>,\n' +
    '  flags: vec4<f32>, // x=hasTex, y=isSkin, z=metallic, w=roughness\n' +
    '  extra: vec4<f32>, // x=alphaCut, y=emissive, z=instanced, w=cyberMask\n' +
    '};\n' +
    '@group(0) @binding(0) var<uniform> u: DrawU;\n' +
    '@group(0) @binding(1) var samp: sampler;\n' +
    '@group(0) @binding(2) var texAlbedo: texture_2d<f32>;\n' +
    'struct VOut { @builtin(position) pos: vec4<f32>, @location(0) wp: vec3<f32>, @location(1) n: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) tint: vec4<f32>, @location(4) partId: f32 };\n' +
    '@vertex fn vsMain(@location(0) p: vec3<f32>, @location(1) n: vec3<f32>, @location(2) uv: vec2<f32>, @location(3) iOff: vec4<f32>, @location(4) iCol: vec4<f32>, @location(5) jPk: u32) -> VOut {\n' +
    '  var o: VOut;\n' +
    '  var lp = p; var ln = n; var wp4 = u.model * vec4<f32>(lp, 1.0);\n' +
    '  let j0 = jPk & 255u;\n' +
    '  var pid = 0.0;\n' +
    '  if (j0 >= 6u && j0 <= 23u) { pid = 1.0; }\n' +
    '  else if (j0 >= 25u && j0 <= 42u) { pid = 2.0; }\n' +
    '  else if (j0 == 43u || j0 == 44u) { pid = 3.0; }\n' +
    '  else if (j0 >= 45u && j0 <= 48u) { pid = 4.0; }\n' +
    '  else if (j0 >= 49u && j0 <= 52u) { pid = 5.0; }\n' +
    '  o.partId = pid;\n' +
    '  if (u.extra.z > 0.5){\n' +
    '    let c = cos(iOff.w); let s = sin(iOff.w); let sp = p * iCol.w;\n' +
    '    wp4 = vec4<f32>(sp.x*c+sp.z*s+iOff.x, sp.y+iOff.y, -sp.x*s+sp.z*c+iOff.z, 1.0);\n' +
    '    ln = vec3<f32>(n.x*c+n.z*s, n.y, -n.x*s+n.z*c);\n' +
    '    o.tint = vec4<f32>(iCol.rgb, 1.0);\n' +
    '  } else {\n' +
    '    let m3 = mat3x3<f32>(u.model[0].xyz, u.model[1].xyz, u.model[2].xyz);\n' +
    '    ln = normalize(m3 * ln);\n' +
    '    o.tint = u.tint;\n' +
    '  }\n' +
    '  o.wp = wp4.xyz; o.n = normalize(ln); o.uv = uv; o.pos = u.projView * wp4;\n' +
    '  return o;\n' +
    '}\n' +
    'fn aces(x: vec3<f32>) -> vec3<f32> { return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), vec3<f32>(0.0), vec3<f32>(1.0)); }\n' +
    '@fragment fn fsMain(v: VOut) -> @location(0) vec4<f32> {\n' +
    '  let t = textureSample(texAlbedo, samp, v.uv);\n' +
    '  var base = select(vec3<f32>(1.0), t.rgb, u.flags.x > 0.5) * v.tint.rgb;\n' +
    '  if (u.extra.x > 0.01 && t.a < u.extra.x) { discard; }\n' +
    '  var met = u.flags.z; var rough = clamp(u.flags.w, 0.08, 0.96); var isSkin = u.flags.y; var em = u.extra.y;\n' +
    '  let bit = 1u << u32(round(v.partId));\n' +
    '  let isCyberPart = (u32(round(u.extra.w)) & bit) != 0u;\n' +
    '  if (isSkin > 0.5 && isCyberPart){\n' +
    '    let seam = step(0.92, abs(sin(v.uv.x * 165.0)) * abs(cos(v.uv.y * 165.0)));\n' +
    '    base = mix(vec3<f32>(0.24, 0.28, 0.34), vec3<f32>(0.04, 0.85, 0.96), seam * 0.72);\n' +
    '    met = 0.88; rough = 0.22; isSkin = 0.0; em += seam * 0.50;\n' +
    '  } else if (isSkin > 0.5 && u.keyDir.w > 0.5){\n' +
    '    if (u.keyDir.w < 1.5){ rough = 0.26; met = 0.08; }\n' +
    '    else if (u.keyDir.w < 2.5){ rough = 0.14; met = 0.88; isSkin = 0.25; }\n' +
    '    else {\n' +
    '      let hexG = step(0.94, abs(sin(v.uv.x * 210.0)) * abs(cos(v.uv.y * 210.0)));\n' +
    '      base = mix(base * vec3<f32>(0.92, 0.95, 1.02), vec3<f32>(0.14, 0.75, 0.92), hexG * 0.25);\n' +
    '      rough = 0.26; met = 0.42; isSkin = 0.20; em += hexG * 0.16;\n' +
    '    }\n' +
    '  }\n' +
    '  let N = normalize(v.n); let V = normalize(u.camPos.xyz - v.wp); let L = normalize(u.keyDir.xyz); let H = normalize(L+V);\n' +
    '  let ndl = dot(N, L);\n' +
    '  let diff = select(max(ndl, 0.0), clamp((ndl+0.38)/1.38, 0.0, 1.0), isSkin > 0.5);\n' +
    '  let sss = select(vec3<f32>(0.0), vec3<f32>(0.92,0.34,0.20)*smoothstep(-0.35,0.25,ndl)*(1.0-max(ndl,0.0))*0.52, isSkin > 0.5);\n' +
    '  let spPow = mix(112.0, 8.0, rough);\n' +
    '  let sp = pow(max(dot(N, H), 0.0001), spPow) * mix(0.30, 0.98, met);\n' +
    '  let fr = pow(max(1.0 - max(dot(N, V), 0.0), 0.0001), 3.4);\n' +
    '  let hemi = mix(vec3<f32>(0.09,0.08,0.09), vec3<f32>(0.24,0.25,0.28), N.y*0.5+0.5);\n' +
    '  var col = base*(hemi + u.keyCol.xyz*diff + sss) + vec3<f32>(sp)*mix(vec3<f32>(1.0,0.94,0.88), base, met) + u.rimCol.xyz*fr*mix(0.68,1.15,met) + base*em;\n' +
    '  col = aces(col * 1.15);\n' +
    '  return vec4<f32>(pow(col, vec3<f32>(1.0/2.2)), select(v.tint.a, t.a*v.tint.a, u.extra.y > 0.5 || v.tint.a < 0.99 || t.a < 0.98));\n' +
    '}\n';

  // --- Main Engine Factory ---
  async function createEngine(canvas, kitPackB64, forceBackend){
    var rawBytes = await inflateZlibBytes(b64ToBytes(kitPackB64));
    var kit = unpackHumanoidKit(rawBytes);
    var props = buildEnvironmentProps(0);

    // Pre-context WebGPU detection (NEVER touch canvas.getContext before probing navigator.gpu!)
    var backend = 'webgl2';
    var gpuDevice = null, gpuCtx = null, gpuFmt = null;
    var allowGpu = (forceBackend !== 'webgl2' && forceBackend !== 'webgl1');
    if (allowGpu && typeof navigator !== 'undefined' && navigator.gpu && typeof navigator.gpu.requestAdapter === 'function'){
      try {
        var adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter){
          gpuDevice = await adapter.requestDevice();
          gpuCtx = canvas.getContext('webgpu');
          if (gpuCtx && gpuDevice){
            gpuFmt = navigator.gpu.getPreferredCanvasFormat();
            gpuCtx.configure({ device: gpuDevice, format: gpuFmt, alphaMode: 'opaque' });
            backend = 'webgpu';
          }
        }
      } catch (_e){ gpuDevice = null; gpuCtx = null; backend = 'webgl2'; }
    }

    var gl = null;
    var isWebGL2 = false;
    var instExt = null;
    if (backend !== 'webgpu'){
      gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
      if (gl){ isWebGL2 = true; backend = 'webgl2'; }
      else {
        gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true })
          || canvas.getContext('experimental-webgl', { antialias: true, alpha: false, preserveDrawingBuffer: true });
        backend = 'webgl1';
        if (gl) instExt = gl.getExtension('ANGLE_instanced_arrays');
      }
      if (!gl) throw new Error('Neither WebGPU nor WebGL is available on this canvas');
    }

    // Load texture images into DOM <img> objects (decode asynchronously without network)
    var loadedImgs = {};
    var texKeys = Object.keys(kit.manifest.texB64);
    await Promise.all(texKeys.map(function(tk){
      return new Promise(function(resolve){
        if (typeof Image === 'undefined'){ resolve(); return; }
        var im = new Image();
        im.onload = function(){ loadedImgs[tk] = im; resolve(); };
        im.onerror = function(){ resolve(); };
        im.src = 'data:image/webp;base64,' + kit.manifest.texB64[tk];
      });
    }));

    var skinComp = createSkinCompositor(loadedImgs.body_skin_albedo, kit.faceUV, kit.nailUVs, kit.tattooUV);
    var uwComp = createUnderwearCompositor(loadedImgs.bra_cloth_bra_albedo, loadedImgs.panties_cloth_panties_albedo, loadedImgs.briefs_cloth_briefs_albedo);
    var hairComp = createHairCompositor(loadedImgs.hair_short02_hair_short02);
    var holoComp = createHologramCanvas();

    // --- Backend Implementation: WebGL2 / WebGL1 Hardware Skinning + Instanced Crowd ---
    var glState = null;
    function compileGlProgram(vsSrc, fsSrc){
      var vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error('VS: ' + gl.getShaderInfoLog(vs));
      var fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error('FS: ' + gl.getShaderInfoLog(fs));
      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('LINK: ' + gl.getProgramInfoLog(prog));
      return prog;
    }
    function uploadGlTexture(source, isAlpha){
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (source && (source.width > 0 || source.tagName === 'CANVAS')){
        gl.texImage2D(gl.TEXTURE_2D, 0, isAlpha ? gl.RGBA : gl.RGB, isAlpha ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, source);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,255]));
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }

    function initGl(){
      var progSkin = compileGlProgram(VS_SKINNED, FS_PBR_SSS);
      var progInst = compileGlProgram(VS_INSTANCED, FS_INSTANCED);
      var meshBufs = {};
      function mkBufs(m, isSkinned){
        var bPos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bPos);
        gl.bufferData(gl.ARRAY_BUFFER, m.dynPos || m.pos, isSkinned ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
        var bNrm = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bNrm);
        gl.bufferData(gl.ARRAY_BUFFER, m.norm, gl.STATIC_DRAW);
        var bUV = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bUV);
        gl.bufferData(gl.ARRAY_BUFFER, m.uv, gl.STATIC_DRAW);
        var bJnt = null, bWgt = null;
        if (isSkinned && m.joints){
          var jf = new Float32Array(m.joints.length);
          for (var i = 0; i < m.joints.length; i++) jf[i] = m.joints[i];
          bJnt = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bJnt); gl.bufferData(gl.ARRAY_BUFFER, jf, gl.STATIC_DRAW);
          bWgt = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bWgt); gl.bufferData(gl.ARRAY_BUFFER, m.weights, gl.STATIC_DRAW);
        }
        var bIdx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.DYNAMIC_DRAW);
        return { bPos: bPos, bNrm: bNrm, bUV: bUV, bJnt: bJnt, bWgt: bWgt, bIdx: bIdx, icount: m.icount, dynIdx: null };
      }
      Object.keys(kit.meshes).forEach(function(mk){ meshBufs[mk] = mkBufs(kit.meshes[mk], true); });
      Object.keys(props).forEach(function(pk){ meshBufs['prop_' + pk] = mkBufs(props[pk], false); });

      var instOffBuf = gl.createBuffer(), instColBuf = gl.createBuffer();
      var texMap = {};
      Object.keys(loadedImgs).forEach(function(tk){
        texMap[tk] = uploadGlTexture(loadedImgs[tk], tk.indexOf('hair')>=0 || tk.indexOf('eyebrow')>=0 || tk.indexOf('eyelash')>=0);
      });
      texMap.dyn_skin = uploadGlTexture(skinComp ? skinComp.canvas : null, false);
      texMap.dyn_hair = uploadGlTexture(hairComp ? hairComp.canvas : null, true);
      texMap.dyn_holo = uploadGlTexture(holoComp ? holoComp.canvas : null, true);
      texMap.dyn_bra = uploadGlTexture(uwComp ? uwComp.braCanvas : null, true);
      texMap.dyn_panties = uploadGlTexture(uwComp ? uwComp.pantiesCanvas : null, true);
      texMap.dyn_briefs = uploadGlTexture(uwComp ? uwComp.briefsCanvas : null, false);
      texMap.white = uploadGlTexture(null, true);

      glState = {
        progSkin: progSkin, progInst: progInst, meshBufs: meshBufs, texMap: texMap,
        instOffBuf: instOffBuf, instColBuf: instColBuf,
        locSkin: {
          aPos: gl.getAttribLocation(progSkin, 'aPos'), aNorm: gl.getAttribLocation(progSkin, 'aNorm'),
          aUV: gl.getAttribLocation(progSkin, 'aUV'), aJoint: gl.getAttribLocation(progSkin, 'aJoint'),
          aWeight: gl.getAttribLocation(progSkin, 'aWeight'),
          uProj: gl.getUniformLocation(progSkin, 'uProj'), uView: gl.getUniformLocation(progSkin, 'uView'),
          uModel: gl.getUniformLocation(progSkin, 'uModel'), uJointMats: gl.getUniformLocation(progSkin, 'uJointMats[0]'),
          uUseSkin: gl.getUniformLocation(progSkin, 'uUseSkin'), uAlbedo: gl.getUniformLocation(progSkin, 'uAlbedo'),
          uNormalMap: gl.getUniformLocation(progSkin, 'uNormalMap'), uHasTex: gl.getUniformLocation(progSkin, 'uHasTex'),
          uHasNormal: gl.getUniformLocation(progSkin, 'uHasNormal'), uIsSkin: gl.getUniformLocation(progSkin, 'uIsSkin'),
          uMetallic: gl.getUniformLocation(progSkin, 'uMetallic'), uRoughness: gl.getUniformLocation(progSkin, 'uRoughness'),
          uAlphaCut: gl.getUniformLocation(progSkin, 'uAlphaCut'), uEmissive: gl.getUniformLocation(progSkin, 'uEmissive'),
          uTint: gl.getUniformLocation(progSkin, 'uTint'), uCamPos: gl.getUniformLocation(progSkin, 'uCamPos'),
          uKeyDir: gl.getUniformLocation(progSkin, 'uKeyDir'), uKeyCol: gl.getUniformLocation(progSkin, 'uKeyCol'),
          uRimCol: gl.getUniformLocation(progSkin, 'uRimCol'), uCyberMask: gl.getUniformLocation(progSkin, 'uCyberMask'),
          uSkinFinish: gl.getUniformLocation(progSkin, 'uSkinFinish'),
        },
        locInst: {
          aPos: gl.getAttribLocation(progInst, 'aPos'), aNorm: gl.getAttribLocation(progInst, 'aNorm'),
          aUV: gl.getAttribLocation(progInst, 'aUV'), aInstOffset: gl.getAttribLocation(progInst, 'aInstOffset'),
          aInstTint: gl.getAttribLocation(progInst, 'aInstTint'),
          uProj: gl.getUniformLocation(progInst, 'uProj'), uView: gl.getUniformLocation(progInst, 'uView'),
          uCamPos: gl.getUniformLocation(progInst, 'uCamPos'), uKeyDir: gl.getUniformLocation(progInst, 'uKeyDir'),
        }
      };
    }

    // --- Backend Implementation: Native WebGPU Compute Skinning + Render Pipeline ---
    var wgpuState = null;
    function initWebGPU(){
      var computeMod = gpuDevice.createShaderModule({ code: WGSL_COMPUTE_SKIN });
      var renderMod  = gpuDevice.createShaderModule({ code: WGSL_RENDER });
      var computePipe = gpuDevice.createComputePipeline({ layout: 'auto', compute: { module: computeMod, entryPoint: 'main' } });
      var renderPipe = gpuDevice.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: renderMod, entryPoint: 'vsMain',
          buffers: [
            { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
            { arrayStride: 12, attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }] },
            { arrayStride: 8,  attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }] },
            { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 3, offset: 0, format: 'float32x4' }] },
            { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 4, offset: 0, format: 'float32x4' }] },
            { arrayStride: 4,  attributes: [{ shaderLocation: 5, offset: 0, format: 'uint32' }] },
          ]
        },
        fragment: {
          module: renderMod, entryPoint: 'fsMain',
          targets: [{ format: gpuFmt, blend: { color: { srcFactor:'src-alpha', dstFactor:'one-minus-src-alpha' }, alpha: { srcFactor:'one', dstFactor:'one-minus-src-alpha' } } }]
        },
        primitive: { topology: 'triangle-list', cullMode: 'none' },
        depthStencil: { depthWriteEnabled: true, depthCompare: 'less', format: 'depth24plus' }
      });
      var sampler = gpuDevice.createSampler({ magFilter:'linear', minFilter:'linear' });
      var jointMatBuf = gpuDevice.createBuffer({ size: 53 * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      var dummyInstBuf = gpuDevice.createBuffer({ size: 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      gpuDevice.queue.writeBuffer(dummyInstBuf, 0, new Float32Array([0,0,0,0]));
      var dummyJntBuf = gpuDevice.createBuffer({ size: 4096 * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      gpuDevice.queue.writeBuffer(dummyJntBuf, 0, new Uint32Array(4096));
      var instOffBuf = gpuDevice.createBuffer({ size: 64 * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      var instColBuf = gpuDevice.createBuffer({ size: 64 * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });

      var meshesGPU = {};
      function mkGpuMesh(m, skinned){
        var posIn = gpuDevice.createBuffer({ size: (m.dynPos || m.pos).byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        gpuDevice.queue.writeBuffer(posIn, 0, m.dynPos || m.pos);
        var nrmIn = gpuDevice.createBuffer({ size: m.norm.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        gpuDevice.queue.writeBuffer(nrmIn, 0, m.norm);
        var uvBuf = gpuDevice.createBuffer({ size: m.uv.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        gpuDevice.queue.writeBuffer(uvBuf, 0, m.uv);
        var idxBuf = gpuDevice.createBuffer({ size: ((m.indices.byteLength + 3) & ~3), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
        var idxPad = new Uint16Array(((m.indices.length + 1) & ~1)); idxPad.set(m.indices);
        gpuDevice.queue.writeBuffer(idxBuf, 0, idxPad);

        var rec = { posIn: posIn, nrmIn: nrmIn, uvBuf: uvBuf, idxBuf: idxBuf, icount: m.icount, vcount: m.vcount, skinned: skinned };
        if (skinned && m.joints){
          var jPacked = new Uint32Array(m.vcount);
          for (var vi=0; vi<m.vcount; vi++){
            jPacked[vi] = m.joints[vi*4] | (m.joints[vi*4+1]<<8) | (m.joints[vi*4+2]<<16) | (m.joints[vi*4+3]<<24);
          }
          var jBuf = gpuDevice.createBuffer({ size: jPacked.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
          gpuDevice.queue.writeBuffer(jBuf, 0, jPacked);
          var wBuf = gpuDevice.createBuffer({ size: m.weights.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
          gpuDevice.queue.writeBuffer(wBuf, 0, m.weights);
          var posOut = gpuDevice.createBuffer({ size: (m.dynPos || m.pos).byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
          var nrmOut = gpuDevice.createBuffer({ size: m.norm.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX });
          var infoBuf = gpuDevice.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
          gpuDevice.queue.writeBuffer(infoBuf, 0, new Uint32Array([53, m.vcount, 0, 0]));
          var compBG = gpuDevice.createBindGroup({
            layout: computePipe.getBindGroupLayout(0),
            entries: [
              { binding:0, resource:{ buffer: infoBuf } }, { binding:1, resource:{ buffer: posIn } },
              { binding:2, resource:{ buffer: nrmIn } }, { binding:3, resource:{ buffer: jBuf } },
              { binding:4, resource:{ buffer: wBuf } },  { binding:5, resource:{ buffer: jointMatBuf } },
              { binding:6, resource:{ buffer: posOut } },{ binding:7, resource:{ buffer: nrmOut } },
            ]
          });
          rec.jBuf = jBuf; rec.posOut = posOut; rec.nrmOut = nrmOut; rec.compBG = compBG;
        }
        return rec;
      }
      Object.keys(kit.meshes).forEach(function(mk){
        var isSkinnedMesh = (mk !== 'carbine_rifle' && mk !== 'lod2');
        meshesGPU[mk] = mkGpuMesh(kit.meshes[mk], isSkinnedMesh);
      });
      Object.keys(props).forEach(function(pk){ meshesGPU['prop_' + pk] = mkGpuMesh(props[pk], false); });

      function mkGpuTex(src){
        var w = (src && src.width) || 1, h = (src && src.height) || 1;
        var tex = gpuDevice.createTexture({ size:[w, h, 1], format:'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
        if (src && src.width > 0) gpuDevice.queue.copyExternalImageToTexture({ source: src }, { texture: tex }, [w, h]);
        else gpuDevice.queue.writeTexture({ texture: tex }, new Uint8Array([255,255,255,255]), { bytesPerRow: 4 }, [1,1]);
        return tex;
      }
      var gpuTex = { white: mkGpuTex(null) };
      Object.keys(loadedImgs).forEach(function(tk){ gpuTex[tk] = mkGpuTex(loadedImgs[tk]); });
      gpuTex.dyn_skin = mkGpuTex(skinComp ? skinComp.canvas : null);
      gpuTex.dyn_hair = mkGpuTex(hairComp ? hairComp.canvas : null);
      gpuTex.dyn_holo = mkGpuTex(holoComp ? holoComp.canvas : null);
      gpuTex.dyn_bra = mkGpuTex(uwComp ? uwComp.braCanvas : null);
      gpuTex.dyn_panties = mkGpuTex(uwComp ? uwComp.pantiesCanvas : null);
      gpuTex.dyn_briefs = mkGpuTex(uwComp ? uwComp.briefsCanvas : null);

      var depthTex = gpuDevice.createTexture({ size:[Math.max(1,canvas.width), Math.max(1,canvas.height)], format:'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
      var portraitJointMatBuf = gpuDevice.createBuffer({ size: 53 * 64, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      // Add portrait compute bind groups for head/hair/gear meshes
      Object.keys(meshesGPU).forEach(function(mk){
        var mg = meshesGPU[mk];
        if (!mg.skinned || !kit.meshes[mk] || !kit.meshes[mk].joints) return;
        // Reuse existing buffers via computePipe layout
        mg.pCompBG = gpuDevice.createBindGroup({
          layout: computePipe.getBindGroupLayout(0),
          entries: [
            { binding:0, resource:{ buffer: mg.compBG ? (function(){
              var b = gpuDevice.createBuffer({ size:16, usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST });
              gpuDevice.queue.writeBuffer(b, 0, new Uint32Array([53, mg.vcount, 0, 0]));
              return b;
            })() : null } },
            { binding:1, resource:{ buffer: mg.posIn } },
            { binding:2, resource:{ buffer: mg.nrmIn } },
            { binding:3, resource:{ buffer: mg.jBuf } },
            { binding:4, resource:{ buffer: (function(){ var b = gpuDevice.createBuffer({ size: kit.meshes[mk].weights.byteLength, usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST }); gpuDevice.queue.writeBuffer(b, 0, kit.meshes[mk].weights); return b; })() } },
            { binding:5, resource:{ buffer: portraitJointMatBuf } },
            { binding:6, resource:{ buffer: mg.posOut } },
            { binding:7, resource:{ buffer: mg.nrmOut } },
          ]
        });
      });
      // Ring pool of uniform buffers (128 draws * 256 bytes aligned across main + portrait pass)
      var uniformPool = [];
      for (var ui = 0; ui < 128; ui++){
        uniformPool.push(gpuDevice.createBuffer({ size: 256, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }));
      }
      wgpuState = {
        computePipe: computePipe, renderPipe: renderPipe, sampler: sampler,
        jointMatBuf: jointMatBuf, portraitJointMatBuf: portraitJointMatBuf,
        dummyInstBuf: dummyInstBuf, dummyJntBuf: dummyJntBuf, instOffBuf: instOffBuf, instColBuf: instColBuf,
        meshesGPU: meshesGPU, gpuTex: gpuTex, depthTex: depthTex, uniformPool: uniformPool,
        depthW: canvas.width, depthH: canvas.height, bgCache: new Map(), mkGpuMesh: mkGpuMesh
      };
    }

    if (backend === 'webgpu') initWebGPU(); else initGl();

    // Track dirty states + damped spring bust oscillator + biomechanical recoil state
    var lastMorphSig = '', lastWearSig = '', lastSkinSig = '', lastHairSig = '', lastHoloSig = '', lastUwSig = '', lastShipSeed = 0;
    var activeCulledBodyIdx = null;
    var activeCulledHairIdx = {};
    var lastCrowdCount = 0;
    var bustSpring = { pos: [0,0,0], vel: [0,0,0], prevSpine: null };

    function getPartMode(state, partKey){
      var bp = state.bodyParts || {};
      var mode = bp[partKey] || 'organic';
      if (state.chassisMode === 'skeleton' || state.chassisMode === 'android'){
        if (mode === 'organic') mode = 'skeleton';
      }
      if (partKey === 'armL' && state.cyberArm && mode === 'organic') mode = 'cyber';
      return mode;
    }
    function getSkinFinishCode(state){
      var f = state.skinFinish || 'matte';
      if (f === 'shiny') return 1.0;
      if (f === 'metallic') return 2.0;
      if (f === 'android') return 3.0;
      return 0.0;
    }
    function getCyberMaskBits(state){
      var mask = 0;
      if (getPartMode(state, 'torso') === 'cyber') mask |= 1;
      if (getPartMode(state, 'armL')  === 'cyber') mask |= 2;
      if (getPartMode(state, 'armR')  === 'cyber') mask |= 4;
      if (getPartMode(state, 'head')  === 'cyber') mask |= 8;
      if (getPartMode(state, 'legL')  === 'cyber') mask |= 16;
      if (getPartMode(state, 'legR')  === 'cyber') mask |= 32;
      return mask;
    }

    function rebuildBodyCulledIndices(state){
      var bz = kit.bodyZones, m = kit.meshes.base_body;
      var hide = 0;
      var outfit = state.outfit || 'jacket';
      if (outfit !== 'underwear'){
        if (state.gender >= 0.35) hide |= (bz.underwear_f | bz.bra);
        else hide |= bz.underwear_m;
      }
      if (outfit === 'tee' || outfit === 'armor'){ hide |= (bz.torso | bz.shirt | bz.hips | bz.legs | bz.feet | bz.boots); }
      else if (outfit === 'hoodie'){ hide |= (bz.hoodie | bz.torso | bz.shirt | bz.hips | bz.legs | bz.feet | bz.boots); }
      else if (outfit === 'jacket'){ hide |= (bz.torso | bz.shirt | bz.jacket | bz.hips | bz.legs | bz.feet | bz.boots); }

      var skHead  = getPartMode(state, 'head')  === 'skeleton';
      var skTorso = getPartMode(state, 'torso') === 'skeleton';
      var skArmL  = getPartMode(state, 'armL')  === 'skeleton';
      var skArmR  = getPartMode(state, 'armR')  === 'skeleton';
      var skLegL  = getPartMode(state, 'legL')  === 'skeleton';
      var skLegR  = getPartMode(state, 'legR')  === 'skeleton';

      var raw = m.indices, ccz = m.cczone, jts = m.joints, out = [];
      for (var i = 0; i < raw.length; i += 3){
        var a = raw[i], b = raw[i+1], c = raw[i+2];
        var ja = jts[a*4], jb = jts[b*4], jc = jts[c*4];
        if (skHead  && (ja===43||ja===44) && (jb===43||jb===44) && (jc===43||jc===44)) continue;
        if (skTorso && (ja<=5||ja===24) && (jb<=5||jb===24) && (jc<=5||jc===24)) continue;
        if (skArmL  && (ja>=6&&ja<=23) && (jb>=6&&jb<=23) && (jc>=6&&jc<=23)) continue;
        if (skArmR  && (ja>=25&&ja<=42) && (jb>=25&&jb<=42) && (jc>=25&&jc<=42)) continue;
        if (skLegL  && (ja>=45&&ja<=48) && (jb>=45&&jb<=48) && (jc>=45&&jc<=48)) continue;
        if (skLegR  && (ja>=49&&ja<=52) && (jb>=49&&jb<=52) && (jc>=49&&jc<=52)) continue;
        var hits = ((ccz[a] & hide) !== 0 ? 1 : 0) + ((ccz[b] & hide) !== 0 ? 1 : 0) + ((ccz[c] & hide) !== 0 ? 1 : 0);
        if (hits >= 2) continue;
        out.push(a, b, c);
      }
      activeCulledBodyIdx = new Uint16Array(out);
      if (glState){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glState.meshBufs.base_body.bIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, activeCulledBodyIdx, gl.DYNAMIC_DRAW);
        glState.meshBufs.base_body.icount = activeCulledBodyIdx.length;
      } else if (wgpuState){
        var pad = new Uint16Array((activeCulledBodyIdx.length + 1) & ~1); pad.set(activeCulledBodyIdx);
        gpuDevice.queue.writeBuffer(wgpuState.meshesGPU.base_body.idxBuf, 0, pad);
        wgpuState.meshesGPU.base_body.icount = activeCulledBodyIdx.length;
      }

      // Cull tshirt sleeves/back/shoulders when jacket is worn so only front V-chest panel shows cleanly
      var tm = kit.meshes.tshirt;
      if (tm){
        var tIdxArr;
        if (outfit === 'jacket'){
          var tr = tm.indices, tp = tm.restPos, tout = [];
          for (var ti = 0; ti < tr.length; ti += 3){
            var ta = tr[ti], tb = tr[ti+1], tc = tr[ti+2];
            var cx = (tp[ta*3] + tp[tb*3] + tp[tc*3]) / 3;
            var cy = (tp[ta*3+1] + tp[tb*3+1] + tp[tc*3+1]) / 3;
            var cz = (tp[ta*3+2] + tp[tb*3+2] + tp[tc*3+2]) / 3;
            if (Math.abs(cx) < 0.135 && cz > 0.032 && cy > 0.96 && cy < 1.38) tout.push(ta, tb, tc);
          }
          tIdxArr = new Uint16Array(tout);
        } else {
          tIdxArr = tm.indices;
        }
        if (glState){
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glState.meshBufs.tshirt.bIdx);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tIdxArr, gl.DYNAMIC_DRAW);
          glState.meshBufs.tshirt.icount = tIdxArr.length;
        } else if (wgpuState){
          var tpad = new Uint16Array((tIdxArr.length + 1) & ~1); tpad.set(tIdxArr);
          gpuDevice.queue.writeBuffer(wgpuState.meshesGPU.tshirt.idxBuf, 0, tpad);
          wgpuState.meshesGPU.tshirt.icount = tIdxArr.length;
        }
      }
    }

    function rebuildHairVisibility(hairKey, helmetOn){
      var m = kit.meshes[hairKey];
      if (!m) return;
      var raw = m.indices, mask = m.hairCrown, out = [];
      for (var i = 0; i < raw.length; i += 3){
        var a=raw[i], b=raw[i+1], c=raw[i+2];
        if (helmetOn && mask[a] >= 128 && mask[b] >= 128 && mask[c] >= 128) continue;
        out.push(a,b,c);
      }
      var arr = new Uint16Array(out);
      activeCulledHairIdx[hairKey] = arr;
      if (glState){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glState.meshBufs[hairKey].bIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);
        glState.meshBufs[hairKey].icount = arr.length;
      } else if (wgpuState){
        var pad = new Uint16Array((arr.length + 1) & ~1); pad.set(arr);
        gpuDevice.queue.writeBuffer(wgpuState.meshesGPU[hairKey].idxBuf, 0, pad);
        wgpuState.meshesGPU[hairKey].icount = arr.length;
      }
    }

    function stepBustSpring(state, dtSec, spineWorldPos){
      if ((state.gender || 0) <= 0.1 || !spineWorldPos) return [0,0,0];
      var dt = Math.min(0.04, Math.max(0.004, dtSec || 0.016));
      var prev = bustSpring.prevSpine || spineWorldPos;
      var ax = (spineWorldPos[0] - prev[0]) / dt;
      var ay = (spineWorldPos[1] - prev[1]) / dt;
      var az = (spineWorldPos[2] - prev[2]) / dt;
      bustSpring.prevSpine = [spineWorldPos[0], spineWorldPos[1], spineWorldPos[2]];

      // 2.6 Hz damped harmonic oscillator + garment damping (bra=0.55, clothes=0.78, nude/sheer=0.28)
      var firm = Number(state.bustFirmness !== undefined ? state.bustFirmness : 0.5);
      var omega = 2 * Math.PI * (2.3 + firm * 0.9);
      var braSupport = state.outfit === 'underwear' ? ((state.underwearBra === 'none' || state.underwearBra === 'sheer_mesh') ? 0.35 : 0.58) : 0.80;
      var zeta = 0.32 + braSupport * 0.35;
      var k = omega * omega, c = 2 * zeta * omega;
      var gravY = state.outfit === 'underwear' && state.underwearBra === 'none' ? -0.0025 : 0.0;
      var acc = [Math.max(-6, Math.min(6, -ax*0.18)), Math.max(-6, Math.min(6, -ay*0.18 + gravY*k)), Math.max(-6, Math.min(6, -az*0.18))];

      for (var d = 0; d < 3; d++){
        var f = -k * bustSpring.pos[d] - c * bustSpring.vel[d] + acc[d];
        bustSpring.vel[d] += f * dt;
        bustSpring.pos[d] = Math.max(-0.012, Math.min(0.012, bustSpring.pos[d] + bustSpring.vel[d] * dt));
      }
      return bustSpring.pos;
    }

    function syncCharacterAssets(state, springDisp){
      var morphSig = [
        state.gender, state.muscle, state.weight, state.height, state.age,
        JSON.stringify(state.bustQuad), state.bustSize, state.bustFirmness, state.bustHeight, state.bustSpacing,
        state.outfit, state.underwearBra,
        state.noseWidth, state.noseLength, state.noseHeight, state.jawWidth,
        state.chinSize, state.cheekbones, state.eyeSize, state.eyeSpacing, state.eyeTilt,
        state.lipSize, state.mouthWidth, state.earSize, state.forehead,
        state.expression, state.blink, state.helmetMode,
        springDisp ? Math.round(springDisp[0]*1000) + ',' + Math.round(springDisp[1]*1000) + ',' + Math.round(springDisp[2]*1000) : '0'
      ].join('|');

      var helmetOn = state.helmetMode && state.helmetMode !== 'none';
      if (morphSig !== lastMorphSig){
        lastMorphSig = morphSig;
        var mw = computeMorphWeights(state, springDisp);
        var morphMeshes = ['base_body','eye_sclera','eye_iris','eye_cornea','eyebrows','eyelashes','briefs','bra','panties','tshirt','hoodie','jacket','jeans','boots','hair_short02','hair_short04','hair_braid01','wrist_watch','wrist_gauntlet','piercing_brow','piercing_nostril','piercing_lip','piercing_ears'];
        morphMeshes.forEach(function(mk){
          var m = kit.meshes[mk];
          if (!m) return;
          var tuck = (mk.indexOf('hair_') === 0 && helmetOn) ? 1.0 : 0.0;
          var buf = applyMeshMorphsAndTuck(m, mw, tuck);
          if (glState && glState.meshBufs[mk]){
            gl.bindBuffer(gl.ARRAY_BUFFER, glState.meshBufs[mk].bPos);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf);
          } else if (wgpuState && wgpuState.meshesGPU[mk]){
            gpuDevice.queue.writeBuffer(wgpuState.meshesGPU[mk].posIn, 0, buf);
          }
        });
      }

      var wearSig = [state.outfit, state.gender, state.helmetMode, state.hairStyle, state.chassisMode, JSON.stringify(state.bodyParts), state.cyberArm].join('|');
      if (wearSig !== lastWearSig){
        lastWearSig = wearSig;
        rebuildBodyCulledIndices(state);
        ['hair_short02','hair_short04','hair_braid01'].forEach(function(hk){
          rebuildHairVisibility(hk, helmetOn);
        });
      }

      var skinSig = [state.skinHex, state.skinFinish, state.beardStyle, state.hairHex, state.scars, state.scarType, state.cyberFace, state.nailColor, state.tattooStyle, state.tattooZone, state.tattooColor, state.tattooGlow, JSON.stringify(state.scarPos)].join('|');
      if (skinSig !== lastSkinSig && skinComp){
        lastSkinSig = skinSig;
        skinComp.update(state);
        if (glState){
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_skin);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, skinComp.canvas);
        } else if (wgpuState){
          gpuDevice.queue.copyExternalImageToTexture({ source: skinComp.canvas }, { texture: wgpuState.gpuTex.dyn_skin }, [512, 512]);
        }
      }

      var uwSig = [state.underwearBra, state.underwearBottom, state.underwearColor].join('|');
      if (uwSig !== lastUwSig && uwComp){
        lastUwSig = uwSig;
        uwComp.update(state);
        if (glState){
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_bra);     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uwComp.braCanvas);
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_panties); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uwComp.pantiesCanvas);
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_briefs);  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, uwComp.briefsCanvas);
        } else if (wgpuState){
          gpuDevice.queue.copyExternalImageToTexture({ source: uwComp.braCanvas },     { texture: wgpuState.gpuTex.dyn_bra },     [256, 256]);
          gpuDevice.queue.copyExternalImageToTexture({ source: uwComp.pantiesCanvas }, { texture: wgpuState.gpuTex.dyn_panties }, [256, 256]);
          gpuDevice.queue.copyExternalImageToTexture({ source: uwComp.briefsCanvas },  { texture: wgpuState.gpuTex.dyn_briefs },  [256, 256]);
        }
      }

      var hairKey = state.hairStyle === 'braids' ? 'hair_braid01' : (state.hairStyle === 'sleek' ? 'hair_short04' : 'hair_short02');
      var hairImgKey = hairKey + '_' + hairKey;
      var hairSig = [hairKey, JSON.stringify(state.grayStreak)].join('|');
      if (hairSig !== lastHairSig && hairComp){
        lastHairSig = hairSig;
        hairComp.update(state, loadedImgs[hairImgKey]);
        if (glState){
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_hair);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hairComp.canvas);
        } else if (wgpuState){
          gpuDevice.queue.copyExternalImageToTexture({ source: hairComp.canvas }, { texture: wgpuState.gpuTex.dyn_hair }, [512, 512]);
        }
      }

      var holoSig = [state.missionAccepted, state.callsign].join('|');
      if (holoSig !== lastHoloSig && holoComp){
        lastHoloSig = holoSig;
        holoComp.update(!!state.missionAccepted, state.callsign);
        if (glState){
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap.dyn_holo);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, holoComp.canvas);
        } else if (wgpuState){
          gpuDevice.queue.copyExternalImageToTexture({ source: holoComp.canvas }, { texture: wgpuState.gpuTex.dyn_holo }, [256, 192]);
        }
      }

      if ((state.shipSeed || 0) !== lastShipSeed){
        lastShipSeed = state.shipSeed || 0;
        props = buildEnvironmentProps(lastShipSeed);
        if (glState){
          gl.bindBuffer(gl.ARRAY_BUFFER, glState.meshBufs.prop_ship.bPos);
          gl.bufferData(gl.ARRAY_BUFFER, props.ship.pos, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glState.meshBufs.prop_ship.bIdx);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, props.ship.indices, gl.STATIC_DRAW);
          glState.meshBufs.prop_ship.icount = props.ship.icount;
        } else if (wgpuState){
          var oldShip = wgpuState.meshesGPU.prop_ship;
          if (oldShip && oldShip.vcount === props.ship.vcount && oldShip.icount === props.ship.icount){
            gpuDevice.queue.writeBuffer(oldShip.posIn, 0, props.ship.pos);
            gpuDevice.queue.writeBuffer(oldShip.nrmIn, 0, props.ship.norm);
          } else {
            if (oldShip){
              if (oldShip.posIn && oldShip.posIn.destroy) oldShip.posIn.destroy();
              if (oldShip.nrmIn && oldShip.nrmIn.destroy) oldShip.nrmIn.destroy();
              if (oldShip.uvBuf && oldShip.uvBuf.destroy) oldShip.uvBuf.destroy();
              if (oldShip.idxBuf && oldShip.idxBuf.destroy) oldShip.idxBuf.destroy();
            }
            wgpuState.meshesGPU.prop_ship = wgpuState.mkGpuMesh(props.ship, false);
          }
        }
      }
    }

    function buildDrawListForCharacter(state, includeHelmetShell, hideEyesInsideSealed){
      var draws = [];
      var outfit = state.outfit || 'jacket';
      var armorTint = hexToRgb01(state.suitTint || '#4d5d54');
      var hairTint = hexToRgb01(state.hairHex || '#2e221b');
      var eyeTint = hexToRgb01(state.eyeHex || '#3aa7d6');
      var browTint = [hairTint[0]*0.85, hairTint[1]*0.85, hairTint[2]*0.85];

      var skHead  = getPartMode(state, 'head')  === 'skeleton';
      var skTorso = getPartMode(state, 'torso') === 'skeleton';
      draws.push({ mesh:'base_body', tex:'dyn_skin', norm:'body_skin_normal', isSkin:1, tint:[1,1,1,1], met:0.04, rough:0.65, cut:0, em:0 });
      if (!hideEyesInsideSealed && !skHead){
        draws.push({ mesh:'eye_sclera', tex:'body_eye', isSkin:0, tint:[1,1,1,1], met:0.05, rough:0.22, cut:0, em:0 });
        draws.push({ mesh:'eye_iris',   tex:'body_eye', isSkin:0, tint:[eyeTint[0], eyeTint[1], eyeTint[2], 1], met:0.08, rough:0.15, cut:0, em:0.05 });
        draws.push({ mesh:'eye_cornea', tex:'white',    isSkin:0, tint:[1,1,1,0.18], met:0.9, rough:0.06, cut:0, em:0 });
        draws.push({ mesh:'eyebrows',   tex:'body_eyebrow', isSkin:0, tint:[browTint[0],browTint[1],browTint[2],1], met:0.0, rough:0.85, cut:0.32, em:0 });
        draws.push({ mesh:'eyelashes',  tex:'body_eyelash', isSkin:0, tint:[0.08,0.06,0.06,1], met:0.0, rough:0.8, cut:0.35, em:0 });
      }
      // Underwear renders only when outfit is 'underwear' & torso is not stripped to bare skeleton
      if (outfit === 'underwear' && !skTorso){
        if (state.gender >= 0.35){
          if (state.underwearBottom === 'boxers_fem'){
            draws.push({ mesh:'briefs', tex:'dyn_briefs', isSkin:0, tint:[0.96,0.96,0.98,1], met:0.02, rough:0.86, cut:0, em:0 });
          } else {
            draws.push({ mesh:'panties', tex:'dyn_panties', isSkin:0, tint:[0.98,0.98,0.98,1], met:0.04, rough:0.78, cut:0, em:0 });
          }
          if ((state.underwearBra || 'sport') !== 'none'){
            draws.push({ mesh:'bra', tex:'dyn_bra', isSkin:0, tint:[0.98,0.98,0.98,1], met:0.04, rough:0.78, cut:0, em:0 });
          }
        } else {
          draws.push({ mesh:'briefs', tex:'dyn_briefs', isSkin:0, tint:[0.96,0.96,0.98,1], met:0.02, rough:0.86, cut:0, em:0 });
        }
      }

      // Modular Humanoid Skeleton / Android Chassis modules (independent per body part!)
      var skCol = state.skelStyle === 'bone' ? [0.84, 0.80, 0.72, 1] : (state.skelStyle === 'carbon' ? [0.16, 0.19, 0.23, 1] : [0.58, 0.64, 0.70, 1]);
      var skMet = state.skelStyle === 'bone' ? 0.08 : 0.88;
      var skRgh = state.skelStyle === 'bone' ? 0.62 : 0.24;
      if (getPartMode(state, 'head')  === 'skeleton') draws.push({ mesh:'skel_head',  tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.04 });
      if (getPartMode(state, 'torso') === 'skeleton') draws.push({ mesh:'skel_torso', tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.02 });
      if (getPartMode(state, 'armL')  === 'skeleton') draws.push({ mesh:'skel_arm_l', tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.02 });
      if (getPartMode(state, 'armR')  === 'skeleton') draws.push({ mesh:'skel_arm_r', tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.02 });
      if (getPartMode(state, 'legL')  === 'skeleton') draws.push({ mesh:'skel_leg_l', tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.02 });
      if (getPartMode(state, 'legR')  === 'skeleton') draws.push({ mesh:'skel_leg_r', tex:'white', isSkin:0, tint:skCol, met:skMet, rough:skRgh, cut:0, em:0.02 });

      // 3D Morph-Tracked Facial Piercings (default = none; supports glowing cyber or brushed metal!)
      var prc = state.piercings || {};
      var pTint = prc.glow ? hexToRgb01(prc.color || '#00e5ff').concat([1]) : (prc.metal === 'gold' ? [0.92, 0.72, 0.34, 1] : (prc.metal === 'obsidian' ? [0.16, 0.18, 0.22, 1] : [0.84, 0.88, 0.92, 1]));
      var pEm = prc.glow ? 1.55 : 0.04;
      if (prc.brow)    draws.push({ mesh:'piercing_brow',    tex:'white', isSkin:0, tint:pTint, met:0.92, rough:0.14, cut:0, em:pEm });
      if (prc.nostril) draws.push({ mesh:'piercing_nostril', tex:'white', isSkin:0, tint:pTint, met:0.92, rough:0.14, cut:0, em:pEm });
      if (prc.lip)     draws.push({ mesh:'piercing_lip',     tex:'white', isSkin:0, tint:pTint, met:0.92, rough:0.14, cut:0, em:pEm });
      if (prc.ears)    draws.push({ mesh:'piercing_ears',    tex:'white', isSkin:0, tint:pTint, met:0.92, rough:0.14, cut:0, em:pEm });

      if (outfit !== 'underwear'){
        draws.push({ mesh:'jeans', tex:'jeans_cloth_jeans_albedo', isSkin:0, tint:[armorTint[0]*0.78+0.15, armorTint[1]*0.78+0.15, armorTint[2]*0.78+0.15, 1], met:0.04, rough:0.82, cut:0, em:0 });
        draws.push({ mesh:'boots', tex:'boots_cloth_boots_albedo', isSkin:0, tint:[0.52,0.48,0.44,1], met:0.15, rough:0.62, cut:0, em:0 });
        if (outfit !== 'hoodie') draws.push({ mesh:'tshirt', tex:'tshirt_cloth_tshirt_albedo', isSkin:0, tint:[0.32,0.38,0.42,1], met:0.04, rough:0.85, cut:0, em:0 });
        if (outfit === 'hoodie') draws.push({ mesh:'hoodie', tex:'hoodie_cloth_hoodie_albedo', isSkin:0, tint:[armorTint[0]*0.9+0.1, armorTint[1]*0.9+0.1, armorTint[2]*0.9+0.1, 1], met:0.04, rough:0.84, cut:0, em:0 });
        if (outfit === 'jacket') draws.push({ mesh:'jacket', tex:'jacket_cloth_jacket_albedo', isSkin:0, tint:[armorTint[0]*0.9+0.18, armorTint[1]*0.9+0.18, armorTint[2]*0.9+0.18, 1], met:0.08, rough:0.75, cut:0, em:0 });
        if (outfit === 'armor'){
          draws.push({ mesh:'armor_cuirass',    tex:'white', isSkin:0, tint:[armorTint[0], armorTint[1], armorTint[2], 1], met:0.55, rough:0.38, cut:0, em:0 });
          draws.push({ mesh:'armor_pauldrons',  tex:'white', isSkin:0, tint:[0.72, 0.50, 0.20, 1], met:0.62, rough:0.34, cut:0, em:0 });
          draws.push({ mesh:'armor_belt_knees', tex:'white', isSkin:0, tint:[0.36, 0.30, 0.24, 1], met:0.25, rough:0.65, cut:0, em:0 });
        }
      }
      // Left wrist device (shown when wearing tactical gear or during Ramp briefing, omitted in underwear/skeleton)
      if ((outfit !== 'underwear' && getPartMode(state, 'armL') !== 'skeleton') || state.tab === 'ramp'){
        draws.push({ mesh: state.wristDevice === 'gauntlet' ? 'wrist_gauntlet' : 'wrist_watch', tex:'white', isSkin:0, tint:[0.18,0.22,0.28,1], met:0.78, rough:0.28, cut:0, em:0.04 });
      }

      // Hair style (except buzz/bald or bare skel_head)
      if (!skHead && state.hairStyle !== 'bald' && state.hairStyle !== 'buzz'){
        var hk = state.hairStyle === 'braids' ? 'hair_braid01' : (state.hairStyle === 'sleek' ? 'hair_short04' : 'hair_short02');
        draws.push({ mesh: hk, tex:'dyn_hair', isSkin:0, tint:[hairTint[0], hairTint[1], hairTint[2], 1], met:0.05, rough:0.68, cut:0.34, em:0 });
      }

      // Helmet Modes
      var hm = state.helmetMode || 'none';
      if (includeHelmetShell && hm !== 'none'){
        draws.push({ mesh:'helmet_shell', tex:'white', isSkin:0, tint:[armorTint[0]*0.85+0.08, armorTint[1]*0.85+0.12, armorTint[2]*0.85+0.10, 1], met:0.68, rough:0.30, cut:0, em:0 });
        if (hm === 'half')   draws.push({ mesh:'helmet_half_visor',   tex:'white', isSkin:0, tint:[0.14,0.50,0.68,0.62], met:0.88, rough:0.10, cut:0, em:0.10 });
        if (hm === 'sealed') draws.push({ mesh:'helmet_sealed_visor', tex:'white', isSkin:0, tint:[0.10,0.44,0.56,1], met:0.92, rough:0.10, cut:0, em:0.15 });
      }
      return draws;
    }

    function applyWeaponGripFingers(ovr){
      var fNamesR = ['index_01_r','index_02_r','index_03_r','middle_01_r','middle_02_r','middle_03_r','ring_01_r','ring_02_r','ring_03_r','pinky_01_r','pinky_02_r','pinky_03_r'];
      var fNamesL = ['index_01_l','index_02_l','index_03_l','middle_01_l','middle_02_l','middle_03_l','ring_01_l','ring_02_l','ring_03_l','pinky_01_l','pinky_02_l','pinky_03_l'];
      for (var fi = 0; fi < fNamesR.length; fi++){
        var seg = (fi % 3) + 1;
        ovr[fNamesR[fi]] = [-0.24 * seg,  0.10 * seg, -0.08 * seg];
        ovr[fNamesL[fi]] = [-0.24 * seg, -0.10 * seg,  0.08 * seg];
      }
      ovr.thumb_01_r = [-0.15, 0.25, -0.12]; ovr.thumb_02_r = [-0.20, 0.30, -0.15]; ovr.thumb_03_r = [-0.24, 0.35, -0.18];
      ovr.thumb_01_l = [-0.15,-0.25,  0.12]; ovr.thumb_02_l = [-0.20,-0.30,  0.15]; ovr.thumb_03_l = [-0.24,-0.35,  0.18];
    }

    // --- Pose Selection, CQB Corner-Slicing & Biomechanical Cyber-Torque Sequencer ---
    function computeStageTransformAndPose(state, timeSec, mw){
      var tab = state.tab || 'face';
      var anim = 'idle', animT = timeSec, worldOvr = {}, rootOff = [0,0,0], modelMat = mat4Identity();
      var showWeapon = false, showHolo = false, fadeAlpha = 0.0;
      var hScale = 0.94 + Number(state.height || 0.5) * 0.14;

      var yaw = Number(state.turntableYaw || 0);
      if (tab === 'face' || tab === 'body' || tab === 'gear' || tab === 'hair' || tab === 'quarters'){
        anim = 'rest';
        var br = Math.sin(timeSec * 1.8) * 0.015;
        if ((tab === 'gear' || tab === 'quarters') && state.equipRiflePreview){
          showWeapon = true;
          worldOvr = {
            upperarm_r: [-0.46,  0.04, 0.46], lowerarm_r: [-0.84,  0.26, 0.0], hand_r: [0.0, 0.18, -0.24],
            upperarm_l: [-0.58, -0.14,-0.44], lowerarm_l: [-0.72, -0.38, 0.0], hand_l: [0.0,-0.18,  0.22],
            head:       [Math.sin(timeSec*0.7)*0.03, Math.sin(timeSec*0.4)*0.05, 0.0]
          };
          applyWeaponGripFingers(worldOvr);
        } else {
          worldOvr = {
            upperarm_l: [0.05, 0.0, -0.52 - br], upperarm_r: [0.05, 0.0, 0.52 + br],
            lowerarm_l: [-0.18, 0.10, 0.0],      lowerarm_r: [-0.18, -0.10, 0.0],
            head:       [Math.sin(timeSec*0.7)*0.03, Math.sin(timeSec*0.4)*0.06, 0.0]
          };
        }
        modelMat = mat4FromEulerXYZ(0, yaw, 0);
      } else if (tab === 'ramp'){
        var tp = Number(state.rampTimer || 4.0);
        if (tp < 1.5){
          anim = 'rest'; showWeapon = true;
          worldOvr = {
            upperarm_r: [-0.55,  0.25, 0.42], lowerarm_r: [-0.95,  0.35, 0.0],
            upperarm_l: [-0.45, -0.35,-0.45], lowerarm_l: [-0.85, -0.65, 0.0],
            head: [0.22, -0.15, 0.0]
          };
          modelMat = mat4FromEulerXYZ(0, 0.35, 0);
        } else if (tp < 2.9){
          var wt = (tp - 1.5) / 1.4;
          anim = 'walk'; animT = tp * 1.25; showWeapon = true;
          worldOvr = { upperarm_r: [-0.35, 0, 0.48], lowerarm_r: [-0.75, 0, 0], upperarm_l: [-0.25, 0, -0.52] };
          modelMat = mat4FromEulerXYZ(0, Math.PI, 0);
          modelMat[14] = -wt * 1.65;
          if (tp > 2.35) fadeAlpha = (tp - 2.35) / 0.55;
        } else {
          if (tp < 3.45) fadeAlpha = 1.0 - (tp - 2.9) / 0.55;
          anim = 'rest'; showHolo = true;
          worldOvr = {
            pelvis:     [-0.26, 0.0, 0.0],
            spine_01:   [-0.12, 0.0, 0.0],
            thigh_l:    [-1.42, 0.08, 0.06],  calf_l: [0.25, 0.0, 0.0],
            thigh_r:    [-1.48, 0.42,-0.12],  calf_r: [0.55, 0.48, 0.10],
            upperarm_l: [-0.38,-0.25,-0.58],  lowerarm_l: [-1.45,-0.75, 0.12],
            upperarm_r: [-0.22, 0.0,  0.52],  lowerarm_r: [-0.82,-0.32, 0.0],
            head:       [0.24, 0.14, 0.0]
          };
          rootOff = [0.0, -0.34, -0.04];
        }
      } else if (tab === 'action'){
        // @lastmaglab-inspired Drone-Angle CQB: Corner Slicing ("Pieing"), Outside-Foot Plant, Speed Lean, Aim Skill & Cyber-Arm Torque!
        var cqbMode = state.cqbMode || state.peek || 'center';
        var isFast = state.cqbSpeed === 'fast';
        anim = state.cqbMoving ? (cqbMode === 'pie_left' ? 'strafe_left' : (cqbMode === 'pie_right' ? 'strafe_right' : 'walk')) : 'rest';
        showWeapon = true;
        var peekDir = (cqbMode === 'left' || cqbMode === 'pie_left') ? -1.0 : ((cqbMode === 'right' || cqbMode === 'pie_right') ? 1.0 : 0.0);
        var leanScale = isFast ? 0.34 : 0.18;
        var peekOffset = peekDir === 0 ? 0.0 : (peekDir * (isFast ? 0.24 : 0.18));
        var strideYaw = Number(state.strideYaw !== undefined ? state.strideYaw : 0.22) - peekDir * 0.28;
        var aimYaw = Number(state.aimYaw !== undefined ? state.aimYaw : -0.18) - peekDir * 0.42;
        var twist = aimYaw - strideYaw;

        // Aim Skill steadiness (0.2 novice -> drift & kick, 0.95 veteran -> locked cheek weld)
        var skill = Number(state.aimSkill !== undefined ? state.aimSkill : (state.veteran ? 0.90 : 0.40));
        var driftAmp = (1.0 - skill) * 0.055 + (state.suppressed ? (1.0 - skill) * 0.075 : 0.0);
        var driftY = Math.sin(timeSec * 3.1) * driftAmp + (state.suppressed ? Math.sin(timeSec * 27.0) * driftAmp * 0.55 : 0.0);
        var driftP = Math.cos(timeSec * 2.4) * driftAmp * 0.65;
        var recoil = state.firing ? Math.max(0, Math.sin(timeSec * 16.0)) * (0.04 + (1.0 - skill) * 0.09) : 0.0;

        // Biomechanical Cyber-Arm Torque Physics: strong/fast cybernetic arm against unreinforced organic torso creates counter-twist & shoulder pull!
        var hasCyberArm = (getPartMode(state, 'armR') !== 'organic') || (getPartMode(state, 'armL') !== 'organic');
        var reinforcedTorso = getPartMode(state, 'torso') !== 'organic';
        var torquePull = (hasCyberArm && !reinforcedTorso) ? (Math.sin(timeSec * 11.0) * (state.firing ? 0.22 : 0.04) + (isFast ? peekDir * 0.12 : 0.0)) : 0.0;

        // Leg injury limp kinematics
        var limpDrop = state.injuredLeg ? Math.abs(Math.sin(timeSec * 4.5)) * 0.065 : 0.0;
        var limpTilt = state.injuredLeg ? Math.sin(timeSec * 4.5) * 0.14 : 0.0;

        // Boxer stance outside-foot plant when slicing corners (eyes + muzzle clear edge while trailing foot & elbow stay tucked!)
        worldOvr = {
          pelvis:     [0.06 + (state.injuredLeg ? 0.08 : 0.0), twist * 0.15, peekDir * 0.08 + limpTilt],
          spine_02:   [0.10, twist * 0.45 - torquePull * 0.65, peekDir * leanScale * 0.72 + limpTilt * 0.5],
          spine_03:   [0.08 + driftP * 0.5, twist * 0.35 - torquePull * 0.45, peekDir * leanScale * 0.55],
          upperarm_r: [-0.84 + recoil + driftP, 0.12 + twist * 0.25 + driftY + torquePull, 0.30], lowerarm_r: [-1.02, 0.28, 0.0], hand_r: [0.0, 0.25, -0.18],
          upperarm_l: [-0.92 + recoil + driftP,-0.22 + twist * 0.30 + driftY,-0.28], lowerarm_l: [-0.52,-0.32, 0.0], hand_l: [0.0,-0.22,  0.18],
          head:       [-0.08 + driftP * 0.4, twist * 0.28 + driftY * 0.4, peekDir * 0.12]
        };
        if (cqbMode === 'pie_left' || cqbMode === 'left'){
          // Left outside foot steps wide and plants flat; right foot trails tucked behind cover!
          worldOvr.thigh_l = [-0.28, 0.12, -0.26]; worldOvr.calf_l = [0.42, 0.0, 0.0];
          worldOvr.thigh_r = [ 0.10,-0.08,  0.12]; worldOvr.calf_r = [0.24, 0.0, 0.0];
        } else if (cqbMode === 'pie_right' || cqbMode === 'right'){
          worldOvr.thigh_r = [-0.28,-0.12,  0.26]; worldOvr.calf_r = [0.42, 0.0, 0.0];
          worldOvr.thigh_l = [ 0.10, 0.08, -0.12]; worldOvr.calf_l = [0.24, 0.0, 0.0];
        }
        if (state.injuredLeg){
          worldOvr.thigh_r = [-0.14, 0.0, 0.10]; worldOvr.calf_r = [0.48, 0.0, 0.0];
        }
        applyWeaponGripFingers(worldOvr);
        modelMat = mat4FromEulerXYZ(0, strideYaw, 0);
        modelMat[12] = peekOffset; modelMat[13] = -limpDrop; modelMat[14] = 1.12;
      }

      var pose = evaluateSkeletonPose(kit, anim, animT, worldOvr, rootOff, hScale, mw, state.skelProps);
      return {
        pose: pose, modelMat: modelMat, showWeapon: showWeapon, showHolo: showHolo,
        hScale: hScale, fadeAlpha: Math.max(0, Math.min(1, fadeAlpha))
      };
    }

    // --- Render Frame (Main Viewport + Live 3D Corner Portrait Scissor Pass!) ---
    var frameCount = 0, fpsTimer = 0, lastFps = 60, lastDrawCalls = 0, lastTrisDrawn = 0;
    var lodStats = { lod0: 1, lod1: 0, lod2: 0 };

    function renderFrame(state, dtSec, totalSec){
      frameCount++; fpsTimer += dtSec;
      if (fpsTimer >= 0.5){ lastFps = Math.round(frameCount / fpsTimer); frameCount = 0; fpsTimer = 0; }
      var springDisp = stepBustSpring(state, dtSec, bustSpring.prevSpine || [0,1.1,0]);
      syncCharacterAssets(state, springDisp);

      var W = canvas.width || 960, H = canvas.height || 640;
      var aspect = W / Math.max(1, H);
      var mw = computeMorphWeights(state, springDisp);
      var stage = computeStageTransformAndPose(state, totalSec, mw);
      if (stage.pose && stage.pose.worlds[4]){
        bustSpring.prevSpine = [stage.pose.worlds[4][12], stage.pose.worlds[4][13], stage.pose.worlds[4][14]];
      }
      var hs = stage.hScale || 1.0;
      var tab = state.tab || 'face';
      var pitch = Math.max(-0.52, Math.min(0.64, Number(state.camPitch || 0)));
      var zoom  = Math.max(0.45, Math.min(1.85, Number(state.camZoom || 1.0)));
      var panX  = Math.max(-0.85, Math.min(0.85, Number(state.camPanX || 0)));
      var panY  = Math.max(-0.85, Math.min(0.85, Number(state.camPanY || 0)));

      // Responsive camera framing per creator screen + Captain's Quarters mirror POV + Drone-angle CQB!
      var baseEye = [0.16, 1.56 * hs, 0.82], camTgt = [0.0, 1.53 * hs, 0.04], fov = 28;
      if (tab === 'body' || tab === 'gear' || tab === 'hair'){
        baseEye = [0.36, 1.10 * hs, 2.50]; camTgt = [0.0, 0.88 * hs, 0.0]; fov = 42;
      } else if (tab === 'quarters'){
        // Mirror POV inside Captain's Quarters cabin framing head-to-boots + metallic cabin walls!
        baseEye = [0.06, 1.08 * hs, 2.38]; camTgt = [0.0, 0.90 * hs, 0.0]; fov = 42;
      } else if (tab === 'ramp'){
        var tp = Number(state.rampTimer || 4.0);
        if (tp < 2.9){ baseEye = [1.45, 1.32 * hs, 2.35]; camTgt = [0.0, 1.02 * hs, -0.4]; fov = 44; }
        else { baseEye = [-1.45, 1.18, 1.85]; camTgt = [0.08, 0.78, 0.15]; fov = 40; }
      } else if (tab === 'action'){
        // @lastmaglab-inspired elevated Drone-Angle 3/4 CQB view clear through doorway gap!
        baseEye = [2.15, 4.45, -1.55]; camTgt = [0.0, 0.95, 2.35]; fov = 42;
      }
      camTgt = [camTgt[0] + panX, camTgt[1] + panY, camTgt[2]];

      // Orbit pitch + zoom + stageOrbitYaw (for ramp/action/quarters camera orbit drag!)
      var stageYaw = (tab === 'ramp' || tab === 'action' || tab === 'quarters') ? Number(state.stageOrbitYaw || 0) : 0;
      var dx = baseEye[0] - (camTgt[0]-panX), dy = baseEye[1] - (camTgt[1]-panY), dz = baseEye[2] - camTgt[2];
      var dist = Math.hypot(dx, dy, dz) * zoom;
      var horiz = Math.hypot(dx, dz) || 0.001;
      var baseYaw = Math.atan2(dx, dz) + stageYaw;
      var basePitch = Math.max(-0.55, Math.min(0.85, Math.atan2(dy, horiz) + pitch));
      var ch = Math.cos(basePitch) * dist;
      var camEye = [
        camTgt[0] + Math.sin(baseYaw) * ch,
        camTgt[1] + Math.sin(basePitch) * dist,
        camTgt[2] + Math.cos(baseYaw) * ch
      ];
      var effFovDeg = aspect < 1.0
        ? Math.min(72, (2 * Math.atan(Math.tan((fov * Math.PI / 180) * 0.5) / Math.max(0.65, aspect))) * 180 / Math.PI)
        : fov;

      var proj = (backend === 'webgpu')
        ? mat4PerspectiveZO(effFovDeg * Math.PI / 180, aspect, 0.08, 60.0)
        : mat4Perspective(effFovDeg * Math.PI / 180, aspect, 0.08, 60.0);
      var view = mat4LookAt(camEye, camTgt, [0,1,0]);
      var drawCalls = 0, trisDrawn = 0;
      var charDraws = buildDrawListForCharacter(state, true, state.helmetMode === 'sealed');
      var skinFinishCode = getSkinFinishCode(state);
      var cyberMaskBits = getCyberMaskBits(state);

      // Compute hand_r / hand_l palm sockets & two-handed rifle grip alignment!
      var handRWorld = mat4Mul(stage.modelMat, stage.pose.worlds[27]);
      var midRWorld  = mat4Mul(stage.modelMat, stage.pose.worlds[31]);
      var handLWorld = mat4Mul(stage.modelMat, stage.pose.worlds[8]);
      var midLWorld  = mat4Mul(stage.modelMat, stage.pose.worlds[12]);
      // Exact consistent left-wrist emitter position for BOTH Watch and Gauntlet!
      var emitterLocal = [0.443, 1.060, 0.168];
      var emitterSkin = mat4Mul(stage.modelMat, stage.pose.skinMats.subarray(7*16, 8*16));
      var holoOrigin = mat4TransformPoint(emitterSkin, emitterLocal);
      var holoMat = mat4FromEulerXYZ(0.18, 0.35, 0.0);
      holoMat[12] = holoOrigin[0]; holoMat[13] = holoOrigin[1] + 0.055; holoMat[14] = holoOrigin[2] + 0.045;

      // Align carbine +Z barrel cleanly from right palm (pistol grip) straight through left palm (angled foregrip)!
      var pRx = handRWorld[12]*0.55 + midRWorld[12]*0.45, pRy = handRWorld[13]*0.55 + midRWorld[13]*0.45, pRz = handRWorld[14]*0.55 + midRWorld[14]*0.45;
      var pLx = handLWorld[12]*0.55 + midLWorld[12]*0.45, pLy = handLWorld[13]*0.55 + midLWorld[13]*0.45, pLz = handLWorld[14]*0.55 + midLWorld[14]*0.45;
      var fdx = pLx - pRx, fdy = pLy - pRy, fdz = pLz - pRz;
      var flen = Math.hypot(fdx, fdy, fdz) || 1;
      var fvx = fdx / flen, fvy = fdy / flen, fvz = fdz / flen;
      // right = normalize(cross([0,1,0], fwd)) = [fvz, 0, -fvx]
      var rvx = fvz, rvy = 0, rvz = -fvx;
      var rlen = Math.hypot(rvx, rvy, rvz) || 1;
      rvx /= rlen; rvz /= rlen;
      // up = cross(fwd, right)
      var uvx = fvy * rvz - fvz * rvy;
      var uvy = fvz * rvx - fvx * rvz;
      var uvz = fvx * rvy - fvy * rvx;
      var rifleMat = new Float32Array([
        rvx, rvy, rvz, 0,
        uvx, uvy, uvz, 0,
        fvx, fvy, fvz, 0,
        pRx - fvx * 0.015 + uvx * 0.008 - rvx * 0.014,
        pRy - fvy * 0.015 + uvy * 0.008 - rvy * 0.014,
        pRz - fvz * 0.015 + uvz * 0.008 - rvz * 0.014,
        1
      ]);

      // Build Crowd LOD2 instances when in Action View (avoiding corridor cover crates!)
      var crowdCount = tab === 'action' ? (state.crowd25 ? 25 : 4) : 0;
      lodStats = { lod0: 1, lod1: tab === 'action' ? 2 : 0, lod2: crowdCount };
      var instOffArr = null, instColArr = null;
      if (crowdCount > 0){
        var crates = [[-1.15, 3.2, 0.92, 0.72], [1.25, 5.8, 0.88, 0.74], [0.15, 7.6, 0.85, 0.68]];
        instOffArr = new Float32Array(crowdCount * 4);
        instColArr = new Float32Array(crowdCount * 4);
        for (var ci = 0; ci < crowdCount; ci++){
          var row = Math.floor(ci / 3), col = ci % 3;
          var cx = (col - 1) * 1.45 + Math.sin(ci*1.7)*0.25;
          var cz = 3.25 + row * 1.35;
          for (var kb = 0; kb < crates.length; kb++){
            var cr = crates[kb];
            if (Math.abs(cx - cr[0]) < cr[2] && Math.abs(cz - cr[1]) < cr[3]){
              cz = cr[1] + cr[3] + 0.15;
            }
          }
          instOffArr[ci*4]   = cx;
          instOffArr[ci*4+1] = 0.0;
          instOffArr[ci*4+2] = cz;
          instOffArr[ci*4+3] = Math.PI + Math.sin(totalSec + ci)*0.25;
          var hostile = (ci % 4 !== 0);
          instColArr[ci*4]   = hostile ? 0.68 : 0.32;
          instColArr[ci*4+1] = hostile ? 0.24 : 0.66;
          instColArr[ci*4+2] = hostile ? 0.20 : 0.78;
          instColArr[ci*4+3] = 0.96 + (ci%3)*0.04;
        }
      }

      if (backend === 'webgl2' || backend === 'webgl1'){
        gl.viewport(0, 0, W, H);
        gl.disable(gl.SCISSOR_TEST);
        gl.clearColor(0.044, 0.048, 0.058, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        var ls = glState.locSkin;
        gl.useProgram(glState.progSkin);
        gl.uniformMatrix4fv(ls.uProj, false, proj);
        gl.uniformMatrix4fv(ls.uView, false, view);
        gl.uniform3fv(ls.uCamPos, camEye);
        gl.uniform3f(ls.uKeyDir, 0.58, 0.72, 0.68);
        gl.uniform3f(ls.uKeyCol, 1.26, 1.06, 0.86);
        gl.uniform3f(ls.uRimCol, 0.12, 0.72, 0.90);
        gl.uniform1f(ls.uCyberMask, cyberMaskBits);
        gl.uniform1f(ls.uSkinFinish, skinFinishCode);

        function drawGlMesh(bufKey, modelM, useSkin, texKey, normKey, tint4, isSkin, met, rough, cut, em){
          var mb = glState.meshBufs[bufKey];
          if (!mb || mb.icount === 0) return;
          gl.uniformMatrix4fv(ls.uModel, false, modelM);
          gl.uniform1f(ls.uUseSkin, useSkin ? 1.0 : 0.0);
          gl.uniform4fv(ls.uTint, tint4);
          gl.uniform1f(ls.uIsSkin, isSkin);
          gl.uniform1f(ls.uMetallic, met);
          gl.uniform1f(ls.uRoughness, rough);
          gl.uniform1f(ls.uAlphaCut, cut);
          gl.uniform1f(ls.uEmissive, em);
          gl.uniform1f(ls.uHasTex, texKey && texKey !== 'white' ? 1.0 : 0.0);
          gl.uniform1f(ls.uHasNormal, normKey ? 1.0 : 0.0);

          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap[texKey] || glState.texMap.white);
          gl.uniform1i(ls.uAlbedo, 0);
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, glState.texMap[normKey] || glState.texMap.white);
          gl.uniform1i(ls.uNormalMap, 1);

          gl.bindBuffer(gl.ARRAY_BUFFER, mb.bPos); gl.enableVertexAttribArray(ls.aPos); gl.vertexAttribPointer(ls.aPos, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, mb.bNrm); gl.enableVertexAttribArray(ls.aNorm); gl.vertexAttribPointer(ls.aNorm, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, mb.bUV);  gl.enableVertexAttribArray(ls.aUV);   gl.vertexAttribPointer(ls.aUV, 2, gl.FLOAT, false, 0, 0);
          if (ls.aJoint >= 0){
            if (mb.bJnt){
              gl.bindBuffer(gl.ARRAY_BUFFER, mb.bJnt); gl.enableVertexAttribArray(ls.aJoint);  gl.vertexAttribPointer(ls.aJoint, 4, gl.FLOAT, false, 0, 0);
              gl.bindBuffer(gl.ARRAY_BUFFER, mb.bWgt); gl.enableVertexAttribArray(ls.aWeight); gl.vertexAttribPointer(ls.aWeight, 4, gl.FLOAT, false, 0, 0);
            } else {
              gl.disableVertexAttribArray(ls.aJoint); gl.disableVertexAttribArray(ls.aWeight);
              gl.vertexAttrib4f(ls.aJoint, 0,0,0,0); gl.vertexAttrib4f(ls.aWeight, 1,0,0,0);
            }
          }
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mb.bIdx);
          gl.drawElements(gl.TRIANGLES, mb.icount, gl.UNSIGNED_SHORT, 0);
          drawCalls++; trisDrawn += mb.icount / 3;
        }

        // Environment Props
        var idMat = mat4Identity();
        if (tab === 'face' || tab === 'body' || tab === 'gear' || tab === 'hair'){
          drawGlMesh('prop_turntableDisk', idMat, false, 'white', null, [0.06,0.07,0.09,1], 0, 0.55, 0.45, 0, 0.02);
        } else if (tab === 'quarters'){
          drawGlMesh('prop_cabin', idMat, false, 'white', null, [0.16,0.18,0.22,1], 0, 0.65, 0.36, 0, 0);
        } else if (tab === 'ramp'){
          drawGlMesh('prop_floorPlane', idMat, false, 'white', null, [0.07,0.09,0.11,1], 0, 0.45, 0.25, 0, 0);
          drawGlMesh('prop_ramp',  idMat, false, 'white', null, [0.22,0.25,0.28,1], 0, 0.55, 0.45, 0, 0);
          drawGlMesh('prop_ship',  idMat, false, 'white', null, [0.26,0.30,0.34,1], 0, 0.60, 0.40, 0, 0);
          drawGlMesh('prop_chair', idMat, false, 'white', null, [0.32,0.34,0.38,1], 0, 0.72, 0.38, 0, 0);
          drawGlMesh('prop_crate', idMat, false, 'white', null, [0.28,0.32,0.26,1], 0, 0.35, 0.65, 0, 0);
        } else if (tab === 'action'){
          drawGlMesh('prop_floorPlane', idMat, false, 'white', null, [0.09,0.11,0.13,1], 0, 0.4, 0.5, 0, 0);
          drawGlMesh('prop_corridor', idMat, false, 'white', null, [0.22,0.26,0.30,1], 0, 0.5, 0.48, 0, 0);
        }

        // Skinned Hero (enable alpha blending automatically for sheer/lace bra & panties + sealed/half visor!)
        gl.uniformMatrix4fv(ls.uJointMats, false, stage.pose.skinMats);
        for (var di = 0; di < charDraws.length; di++){
          var d = charDraws[di];
          var isAlphaTex = (d.tex === 'dyn_bra' || d.tex === 'dyn_panties' || d.tint[3] < 0.99);
          if (isAlphaTex){ gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
          drawGlMesh(d.mesh, stage.modelMat, true, d.tex, d.norm, d.tint, d.isSkin, d.met, d.rough, d.cut, d.em);
          if (isAlphaTex) gl.disable(gl.BLEND);
        }
        if (stage.showWeapon){
          drawGlMesh('carbine_rifle', rifleMat, false, 'white', null, [0.22,0.25,0.28,1], 0, 0.78, 0.32, 0, 0);
        }
        if (stage.showHolo){
          gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          drawGlMesh('prop_holoCard', holoMat, false, 'dyn_holo', null, [1,1,1,0.92], 0, 0, 1, 0, 1.4);
          gl.disable(gl.BLEND);
        }

        // Instanced LOD2 Corridor Crowd in 1 single GPU draw call!
        if (crowdCount > 0){
          var li = glState.locInst, lb = glState.meshBufs.lod2;
          gl.useProgram(glState.progInst);
          gl.uniformMatrix4fv(li.uProj, false, proj);
          gl.uniformMatrix4fv(li.uView, false, view);
          gl.uniform3fv(li.uCamPos, camEye);
          gl.uniform3f(li.uKeyDir, 0.55, 0.75, 0.65);

          gl.bindBuffer(gl.ARRAY_BUFFER, lb.bPos); gl.enableVertexAttribArray(li.aPos); gl.vertexAttribPointer(li.aPos, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, lb.bNrm); gl.enableVertexAttribArray(li.aNorm); gl.vertexAttribPointer(li.aNorm, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, lb.bUV);  gl.enableVertexAttribArray(li.aUV);   gl.vertexAttribPointer(li.aUV, 2, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, glState.instOffBuf);
          gl.bufferData(gl.ARRAY_BUFFER, instOffArr, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(li.aInstOffset); gl.vertexAttribPointer(li.aInstOffset, 4, gl.FLOAT, false, 0, 0);

          gl.bindBuffer(gl.ARRAY_BUFFER, glState.instColBuf);
          gl.bufferData(gl.ARRAY_BUFFER, instColArr, gl.DYNAMIC_DRAW);
          gl.enableVertexAttribArray(li.aInstTint); gl.vertexAttribPointer(li.aInstTint, 4, gl.FLOAT, false, 0, 0);

          if (isWebGL2){
            gl.vertexAttribDivisor(li.aInstOffset, 1);
            gl.vertexAttribDivisor(li.aInstTint, 1);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lb.bIdx);
            gl.drawElementsInstanced(gl.TRIANGLES, lb.icount, gl.UNSIGNED_SHORT, 0, crowdCount);
            gl.vertexAttribDivisor(li.aInstOffset, 0);
            gl.vertexAttribDivisor(li.aInstTint, 0);
          } else if (instExt){
            instExt.vertexAttribDivisorANGLE(li.aInstOffset, 1);
            instExt.vertexAttribDivisorANGLE(li.aInstTint, 1);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lb.bIdx);
            instExt.drawElementsInstancedANGLE(gl.TRIANGLES, lb.icount, gl.UNSIGNED_SHORT, 0, crowdCount);
            instExt.vertexAttribDivisorANGLE(li.aInstOffset, 0);
            instExt.vertexAttribDivisorANGLE(li.aInstTint, 0);
          }
          drawCalls++; trisDrawn += (lb.icount / 3) * crowdCount;
        }

        // --- LIVE 3D CORNER STATUS PORTRAIT PASS (Synced directly to Helmet Visor Geometry!) ---
        var pw = Math.max(96, Math.min(260, Math.round(state.portraitBoxPx || Math.min(180, Math.floor(W * 0.24))))), ph = pw;
        var pOff = Math.max(8, Math.round(state.portraitOffPx || 14));
        if (state.showCornerPortrait !== false){
          var px = pOff, py = pOff;
          gl.enable(gl.SCISSOR_TEST);
          gl.scissor(px, py, pw, ph);
          gl.viewport(px, py, pw, ph);
          gl.clearColor(0.025, 0.055, 0.085, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          var hm = state.helmetMode || 'none';
          // Half-visor frames tactical eye shield + helmet brow + lower face; Sealed/Open frames full face/visor!
          var pEye = hm === 'half' ? [0.06, 1.585, 0.54] : [0.09, 1.565, 0.54];
          var pTgt = hm === 'half' ? [0.00, 1.575, 0.04] : [0.00, 1.550, 0.05];
          var pProj = mat4Perspective((hm === 'half' ? 30 : 28) * Math.PI / 180, 1.0, 0.05, 10.0);
          var pView = mat4LookAt(pEye, pTgt, [0,1,0]);
          var pPose = evaluateSkeletonPose(kit, 'rest', totalSec, { head: [0, Math.sin(totalSec*0.9)*0.06, 0] }, [0,0,0], 1.0, mw, state.skelProps);

          gl.useProgram(glState.progSkin);
          gl.uniformMatrix4fv(ls.uProj, false, pProj);
          gl.uniformMatrix4fv(ls.uView, false, pView);
          gl.uniform3fv(ls.uCamPos, pEye);
          gl.uniformMatrix4fv(ls.uJointMats, false, pPose.skinMats);
          var pDraws = buildDrawListForCharacter(state, true, hm === 'sealed');
          var pId = mat4Identity();
          for (var pdi = 0; pdi < pDraws.length; pdi++){
            var pd = pDraws[pdi];
            if (pd.mesh === 'jeans' || pd.mesh === 'boots' || pd.mesh === 'armor_belt_knees' || pd.mesh === 'briefs' || pd.mesh === 'panties' || pd.mesh === 'bra') continue;
            drawGlMesh(pd.mesh, pId, true, pd.tex, pd.norm, pd.tint, pd.isSkin, pd.met, pd.rough, pd.cut, pd.em);
          }
          gl.disable(gl.SCISSOR_TEST);
        }
      } else if (backend === 'webgpu' && wgpuState){
        // Native WebGPU Compute Skinning + Render Pass!
        if (wgpuState.depthW !== W || wgpuState.depthH !== H){
          wgpuState.depthTex.destroy();
          wgpuState.depthTex = gpuDevice.createTexture({ size:[Math.max(1,W), Math.max(1,H)], format:'depth24plus', usage: GPUTextureUsage.RENDER_ATTACHMENT });
          wgpuState.depthW = W; wgpuState.depthH = H;
        }
        gpuDevice.queue.writeBuffer(wgpuState.jointMatBuf, 0, stage.pose.skinMats);
        var enc = gpuDevice.createCommandEncoder();
        // 1) Compute Skinning Pass for active hero meshes
        var cp = enc.beginComputePass();
        cp.setPipeline(wgpuState.computePipe);
        charDraws.forEach(function(d){
          var mg = wgpuState.meshesGPU[d.mesh];
          if (mg && mg.compBG){
            cp.setBindGroup(0, mg.compBG);
            cp.dispatchWorkgroups(Math.ceil(mg.vcount / 64));
          }
        });
        cp.end();

        // 2) Render Pass
        var viewTex = gpuCtx.getCurrentTexture().createView();
        var rp = enc.beginRenderPass({
          colorAttachments: [{ view: viewTex, clearValue:{r:0.044,g:0.048,b:0.058,a:1}, loadOp:'clear', storeOp:'store' }],
          depthStencilAttachment: { view: wgpuState.depthTex.createView(), depthClearValue:1.0, depthLoadOp:'clear', depthStoreOp:'store' }
        });
        rp.setViewport(0, 0, W, H, 0, 1);
        rp.setScissorRect(0, 0, W, H);
        rp.setPipeline(wgpuState.renderPipe);
        var pv = mat4Mul(proj, view);
        var poolIdx = 0;

        function drawGpuMesh(pass, pvMat, bufKey, modelM, texKey, tint4, isSkin, met, rough, cut, em, instCount){
          var mg = wgpuState.meshesGPU[bufKey];
          if (!mg || mg.icount === 0 || poolIdx >= wgpuState.uniformPool.length) return;
          var ub = wgpuState.uniformPool[poolIdx++];
          var uArr = new Float32Array(64);
          uArr.set(pvMat, 0); uArr.set(modelM, 16);
          uArr.set(tint4, 32);
          uArr.set([camEye[0], camEye[1], camEye[2], 1], 36);
          uArr.set([0.58, 0.72, 0.68, skinFinishCode], 40);
          uArr.set([1.26, 1.06, 0.86, 0], 44);
          uArr.set([0.12, 0.72, 0.90, 0], 48);
          uArr.set([(texKey && texKey !== 'white') ? 1 : 0, isSkin, met, rough], 52);
          uArr.set([cut, em, instCount > 0 ? 1 : 0, cyberMaskBits], 56);
          gpuDevice.queue.writeBuffer(ub, 0, uArr);

          var tk = texKey || 'white';
          var bgKey = poolIdx + '|' + tk;
          var bg = wgpuState.bgCache.get(bgKey);
          if (!bg){
            bg = gpuDevice.createBindGroup({
              layout: wgpuState.renderPipe.getBindGroupLayout(0),
              entries: [
                { binding:0, resource:{ buffer: ub } },
                { binding:1, resource: wgpuState.sampler },
                { binding:2, resource: (wgpuState.gpuTex[tk] || wgpuState.gpuTex.white).createView() }
              ]
            });
            wgpuState.bgCache.set(bgKey, bg);
          }
          pass.setBindGroup(0, bg);
          pass.setVertexBuffer(0, instCount > 0 ? mg.posIn : (mg.posOut || mg.posIn));
          pass.setVertexBuffer(1, instCount > 0 ? mg.nrmIn : (mg.nrmOut || mg.nrmIn));
          pass.setVertexBuffer(2, mg.uvBuf);
          pass.setVertexBuffer(3, instCount > 0 ? wgpuState.instOffBuf : wgpuState.dummyInstBuf);
          pass.setVertexBuffer(4, instCount > 0 ? wgpuState.instColBuf : wgpuState.dummyInstBuf);
          pass.setVertexBuffer(5, mg.jBuf || wgpuState.dummyJntBuf);
          pass.setIndexBuffer(mg.idxBuf, 'uint16');
          pass.drawIndexed(mg.icount, Math.max(1, instCount || 1));
          drawCalls++; trisDrawn += (mg.icount / 3) * Math.max(1, instCount || 1);
        }

        var idM = mat4Identity();
        if (tab === 'face' || tab === 'body' || tab === 'gear' || tab === 'hair'){
          drawGpuMesh(rp, pv, 'prop_turntableDisk', idM, 'white', [0.06,0.07,0.09,1], 0, 0.55, 0.45, 0, 0.02, 0);
        } else if (tab === 'quarters'){
          drawGpuMesh(rp, pv, 'prop_cabin', idM, 'white', [0.16,0.18,0.22,1], 0, 0.65, 0.36, 0, 0, 0);
        } else if (tab === 'ramp'){
          drawGpuMesh(rp, pv, 'prop_floorPlane', idM, 'white', [0.07,0.09,0.11,1], 0, 0.45, 0.25, 0, 0, 0);
          drawGpuMesh(rp, pv, 'prop_ramp',  idM, 'white', [0.22,0.25,0.28,1], 0, 0.55, 0.45, 0, 0, 0);
          drawGpuMesh(rp, pv, 'prop_ship',  idM, 'white', [0.26,0.30,0.34,1], 0, 0.60, 0.40, 0, 0, 0);
          drawGpuMesh(rp, pv, 'prop_chair', idM, 'white', [0.32,0.34,0.38,1], 0, 0.72, 0.38, 0, 0, 0);
          drawGpuMesh(rp, pv, 'prop_crate', idM, 'white', [0.28,0.32,0.26,1], 0, 0.35, 0.65, 0, 0, 0);
        } else if (tab === 'action'){
          drawGpuMesh(rp, pv, 'prop_floorPlane', idM, 'white', [0.09,0.11,0.13,1], 0, 0.4, 0.5, 0, 0, 0);
          drawGpuMesh(rp, pv, 'prop_corridor', idM, 'white', [0.22,0.26,0.30,1], 0, 0.5, 0.48, 0, 0, 0);
        }
        charDraws.forEach(function(d){
          drawGpuMesh(rp, pv, d.mesh, stage.modelMat, d.tex, d.tint, d.isSkin, d.met, d.rough, d.cut, d.em, 0);
        });
        if (stage.showWeapon) drawGpuMesh(rp, pv, 'carbine_rifle', rifleMat, 'white', [0.22,0.25,0.28,1], 0, 0.78, 0.32, 0, 0, 0);
        if (stage.showHolo) drawGpuMesh(rp, pv, 'prop_holoCard', holoMat, 'dyn_holo', [1,1,1,0.92], 0, 0, 1, 0, 1.4, 0);
        if (crowdCount > 0){
          gpuDevice.queue.writeBuffer(wgpuState.instOffBuf, 0, instOffArr);
          gpuDevice.queue.writeBuffer(wgpuState.instColBuf, 0, instColArr);
          drawGpuMesh(rp, pv, 'lod2', idM, 'white', [1,1,1,1], 0, 0.4, 0.5, 0, 0, crowdCount);
        }
        rp.end();

        // 3) Live 3D Corner Status Portrait Pass on WebGPU (bottom-left scissor HUD!)
        if (state.showCornerPortrait !== false){
          var pw = Math.max(96, Math.min(260, Math.round(state.portraitBoxPx || Math.min(180, Math.floor(W * 0.24))))), ph = pw;
          var px = Math.max(8, Math.round(state.portraitOffPx || 14));
          var pyTop = Math.max(0, H - px - ph);
          var hmW = state.helmetMode || 'none';
          var pEyeW = hmW === 'half' ? [0.06, 1.585, 0.54] : [0.09, 1.565, 0.54];
          var pTgtW = hmW === 'half' ? [0.00, 1.575, 0.04] : [0.00, 1.550, 0.05];
          var pProjW = mat4PerspectiveZO((hmW === 'half' ? 30 : 28) * Math.PI / 180, 1.0, 0.05, 10.0);
          var pViewW = mat4LookAt(pEyeW, pTgtW, [0,1,0]);
          var pPV = mat4Mul(pProjW, pViewW);
          var pPoseW = evaluateSkeletonPose(kit, 'rest', totalSec, { head:[0, Math.sin(totalSec*0.9)*0.06, 0] }, [0,0,0], 1.0, mw, state.skelProps);
          gpuDevice.queue.writeBuffer(wgpuState.portraitJointMatBuf, 0, pPoseW.skinMats);
          var pDrawsW = buildDrawListForCharacter(state, true, hmW === 'sealed');

          var cp2 = enc.beginComputePass();
          cp2.setPipeline(wgpuState.computePipe);
          pDrawsW.forEach(function(pd){
            if (pd.mesh === 'jeans' || pd.mesh === 'boots' || pd.mesh === 'armor_belt_knees' || pd.mesh === 'briefs' || pd.mesh === 'panties' || pd.mesh === 'bra') return;
            var mg = wgpuState.meshesGPU[pd.mesh];
            if (mg && mg.pCompBG){ cp2.setBindGroup(0, mg.pCompBG); cp2.dispatchWorkgroups(Math.ceil(mg.vcount / 64)); }
          });
          cp2.end();

          var rp2 = enc.beginRenderPass({
            colorAttachments: [{ view: viewTex, loadOp:'load', storeOp:'store' }],
            depthStencilAttachment: { view: wgpuState.depthTex.createView(), depthClearValue:1.0, depthLoadOp:'clear', depthStoreOp:'store' }
          });
          rp2.setViewport(px, pyTop, pw, ph, 0, 1);
          rp2.setScissorRect(px, pyTop, pw, ph);
          rp2.setPipeline(wgpuState.renderPipe);
          // Clear corner portrait scissor box cleanly with dark navy backdrop quad at z=0.998
          drawGpuMesh(rp2, idM, 'prop_portraitBg', idM, 'white', [0.004,0.011,0.019,1], 0, 0, 1, 0, 1.0, 0);
          pDrawsW.forEach(function(pd){
            if (pd.mesh === 'jeans' || pd.mesh === 'boots' || pd.mesh === 'armor_belt_knees' || pd.mesh === 'briefs' || pd.mesh === 'panties' || pd.mesh === 'bra') return;
            drawGpuMesh(rp2, pPV, pd.mesh, idM, pd.tex, pd.tint, pd.isSkin, pd.met, pd.rough, pd.cut, pd.em, 0);
          });
          rp2.end();
        }
        gpuDevice.queue.submit([enc.finish()]);
      }

      lastDrawCalls = drawCalls;
      lastTrisDrawn = Math.round(trisDrawn);
      return {
        backend: backend, fps: lastFps, drawCalls: lastDrawCalls, tris: lastTrisDrawn,
        lodStats: lodStats, fadeAlpha: stage.fadeAlpha,
        lod0Tris: kit.meshes.base_body.icount / 3,
        lod1Tris: kit.meshes.lod1.icount / 3,
        lod2Tris: kit.meshes.lod2.icount / 3,
      };
    }

    return {
      backend: backend,
      kit: kit,
      renderFrame: renderFrame,
      getTelemetry: function(){
        return {
          backend: backend, fps: lastFps, drawCalls: lastDrawCalls, tris: lastTrisDrawn,
          lodStats: lodStats,
          lod0Tris: kit.meshes.base_body.icount / 3,
          lod1Tris: kit.meshes.lod1.icount / 3,
          lod2Tris: kit.meshes.lod2.icount / 3,
        };
      }
    };
  }

  return { createEngine: createEngine, computeMorphWeights: computeMorphWeights, evaluateSkeletonPose: evaluateSkeletonPose };
});
