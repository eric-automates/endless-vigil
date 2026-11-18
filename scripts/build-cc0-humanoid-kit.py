#!/usr/bin/env python3
"""
Endless Vigil — CC0 Humanoid + Tactical Kit Compiler (v0.6.0-alpha)
Builds quantized, zlib-compressed binary payloads from verified CC0 MakeHuman / MPFB2 /
kblood CharacterCreator GLB outputs plus 100% original sculpted tactical armor, 3-mode
combat helmets, wrist watch/gauntlet emitters, carbine rifle, LOD1/LOD2 decimated meshes,
and CC0 skeletal animation clips.

Output:
  - /home/user/assets/ev-humanoid-kit.bin   (raw zlib payload)
  - /home/user/js/ev-humanoid-kit.js        (UMD self-contained loader for offline & web)
"""

import base64
import json
import math
import os
import struct
import zlib
import io
import numpy as np
from PIL import Image

SRC_DIR = "/tmp/cc0_inspect"
OUT_BIN = "/home/user/assets/ev-humanoid-kit.bin"
OUT_JS  = "/home/user/js/ev-humanoid-kit.js"

KEEP_TARGETS = [
    "gender_female", "gender_male", "age_old", "age_child",
    "weight_min", "weight_max", "muscle_min", "muscle_max",
    "height_short", "height_tall", "proportions_ideal", "proportions_uncommon",
    "breast_cup_min", "breast_cup_max", "breast_firm_min", "breast_firm_max",
    "bdet_breast_dist_decr", "bdet_breast_dist_incr",
    "bdet_breast_point_decr", "bdet_breast_point_incr",
    "bdet_breast_height_decr", "bdet_breast_height_incr",
    "dyn_breast_up", "dyn_breast_down",
    "dyn_breast_left", "dyn_breast_right",
    "dyn_breast_fwd", "dyn_breast_back",
    "corr_gender_female__age_old", "corr_gender_male__age_old",
    "corr_gender_female__muscle_min", "corr_gender_female__muscle_max",
    "corr_gender_male__muscle_min", "corr_gender_male__muscle_max",
    "corr_gender_female__weight_min", "corr_gender_female__weight_max",
    "corr_gender_male__weight_min", "corr_gender_male__weight_max",
    "corr_breast_cup_min__breast_firm_min", "corr_breast_cup_min__breast_firm_max",
    "corr_breast_cup_max__breast_firm_min", "corr_breast_cup_max__breast_firm_max",
    "face_nose_width_decr", "face_nose_width_incr",
    "face_nose_length_decr", "face_nose_length_incr",
    "face_nose_height_decr", "face_nose_height_incr",
    "face_jaw_width_decr", "face_jaw_width_incr",
    "face_chin_decr", "face_chin_incr",
    "face_cheekbones_decr", "face_cheekbones_incr",
    "face_eye_size_decr", "face_eye_size_incr",
    "face_eye_spacing_decr", "face_eye_spacing_incr",
    "face_eye_tilt_decr", "face_eye_tilt_incr",
    "face_lips_decr", "face_lips_incr",
    "face_mouth_width_decr", "face_mouth_width_incr",
    "face_ear_size_decr", "face_ear_size_incr",
    "face_forehead_decr", "face_forehead_incr",
    "blink_left", "blink_right",
    "look_left", "look_right", "look_up", "look_down"
]

BODY_ZONES = {
    "feet": 1, "legs": 2, "hips": 4, "torso": 8, "coat": 16,
    "underwear_m": 32, "underwear_f": 64, "bra": 128, "shorts": 256,
    "shirt": 512, "hoodie": 1024, "dress": 2048, "jacket": 4096, "boots": 8192
}

def load_glb(path):
    with open(path, "rb") as f:
        magic, ver, length = struct.unpack("<III", f.read(12))
        assert magic == 0x46546C67, f"Invalid GLB: {path}"
        clen, ctype = struct.unpack("<II", f.read(8))
        gltf = json.loads(f.read(clen))
        blen, btype = struct.unpack("<II", f.read(8))
        b = f.read(blen)
    return gltf, b

def read_acc(gltf, b, idx):
    acc = gltf["accessors"][idx]
    cnt = acc["count"]
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[acc["type"]]
    dt_map = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    dt = dt_map[acc["componentType"]]
    if "bufferView" in acc:
        bv = gltf["bufferViews"][acc["bufferView"]]
        off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = bv.get("byteStride", 0)
        if stride and stride != comps * np.dtype(dt).itemsize:
            out = np.zeros((cnt, comps), dtype=dt)
            for i in range(cnt):
                out[i] = np.frombuffer(b, dtype=dt, count=comps, offset=off + i * stride)
            if comps == 1:
                out = out[:, 0]
        else:
            arr = np.frombuffer(b, dtype=dt, count=cnt * comps, offset=off).copy()
            out = arr.reshape(cnt, comps) if comps > 1 else arr
    else:
        out = np.zeros((cnt, comps) if comps > 1 else cnt, dtype=dt)
    if "sparse" in acc:
        sp = acc["sparse"]
        scnt = sp["count"]
        idx_bv = gltf["bufferViews"][sp["indices"]["bufferView"]]
        idx_off = idx_bv.get("byteOffset", 0) + sp["indices"].get("byteOffset", 0)
        idx_dt = dt_map[sp["indices"]["componentType"]]
        s_idx = np.frombuffer(b, dtype=idx_dt, count=scnt, offset=idx_off)
        val_bv = gltf["bufferViews"][sp["values"]["bufferView"]]
        val_off = val_bv.get("byteOffset", 0) + sp["values"].get("byteOffset", 0)
        val_stride = val_bv.get("byteStride", 0)
        if val_stride and val_stride != comps * np.dtype(dt).itemsize:
            s_val = np.zeros((scnt, comps), dtype=dt)
            for i in range(scnt):
                s_val[i] = np.frombuffer(b, dtype=dt, count=comps, offset=val_off + i * val_stride)
        else:
            s_val = np.frombuffer(b, dtype=dt, count=scnt * comps, offset=val_off)
            if comps > 1:
                s_val = s_val.reshape(scnt, comps)
        out[s_idx] = s_val
    if acc.get("normalized", False):
        norm_div = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}.get(acc["componentType"], 1.0)
        out = out.astype(np.float32) / norm_div
    return out

def encode_octahedral_normals(normals):
    n = normals.copy()
    l1 = np.abs(n[:, 0]) + np.abs(n[:, 1]) + np.abs(n[:, 2])
    l1 = np.maximum(l1, 1e-8)
    n /= l1[:, None]
    mask = n[:, 2] < 0.0
    nx = n[mask, 0].copy()
    ny = n[mask, 1].copy()
    n[mask, 0] = (1.0 - np.abs(ny)) * np.where(nx >= 0.0, 1.0, -1.0)
    n[mask, 1] = (1.0 - np.abs(nx)) * np.where(ny >= 0.0, 1.0, -1.0)
    q = np.clip(np.round(n[:, :2] * 127.0), -127, 127).astype(np.int8)
    return q

def quantize_pos(pos, scale=10000.0):
    # 0.1 mm resolution across [-3.27m .. +3.27m]
    return np.clip(np.round(pos * scale), -32767, 32767).astype(np.int16)

def quantize_uv(uv):
    u = np.where((uv >= -0.025) & (uv <= 1.025), np.clip(uv, 0.0, 1.0), np.mod(uv, 1.00001))
    return np.clip(np.round(u * 65535.0), 0, 65535).astype(np.uint16)

def pack_prim_mesh(gltf, b, mesh_idx, prim_idx=0, target_names_keep=None, name="mesh", hair_helmet_tuck=False, pos_scale=10000.0):
    m = gltf["meshes"][mesh_idx]
    pr = m["primitives"][prim_idx]
    attrs = pr["attributes"]
    pos = read_acc(gltf, b, attrs["POSITION"]).astype(np.float32)
    norm = read_acc(gltf, b, attrs["NORMAL"]).astype(np.float32)
    uv = read_acc(gltf, b, attrs["TEXCOORD_0"]).astype(np.float32)
    joints = read_acc(gltf, b, attrs["JOINTS_0"]).astype(np.uint8)
    weights_f = read_acc(gltf, b, attrs["WEIGHTS_0"]).astype(np.float32)
    # Normalize weights cleanly to uint8 summing to 255
    wsum = np.maximum(weights_f.sum(axis=1, keepdims=True), 1e-6)
    wn = weights_f / wsum
    weights_u8 = np.clip(np.round(wn * 255.0), 0, 255).astype(np.uint8)
    for vi in range(len(weights_u8)):
        s = int(weights_u8[vi].sum())
        if s != 255:
            mi = int(np.argmax(weights_u8[vi]))
            weights_u8[vi, mi] = np.clip(int(weights_u8[vi, mi]) + (255 - s), 0, 255)

    idx = read_acc(gltf, b, pr["indices"]).astype(np.uint16)
    cczone = read_acc(gltf, b, attrs["_CCZONE"]).astype(np.uint16) if "_CCZONE" in attrs else np.zeros(len(pos), dtype=np.uint16)
    if name == "base_body":
        # Protect front neck & throat under open collars from accidental jacket/hoodie culling
        front_neck = (pos[:, 1] > 1.365) & (pos[:, 2] > -0.02)
        cczone[front_neck] = 0

    # Extract requested sparse morph deltas
    tnames = m.get("extras", {}).get("targetNames", [])
    tmap = {tn: ti for ti, tn in enumerate(tnames)}
    morphs = {}
    targets = pr.get("targets", [])
    for tk in (target_names_keep or []):
        if tk in tmap and tmap[tk] < len(targets):
            tpos = read_acc(gltf, b, targets[tmap[tk]]["POSITION"]).astype(np.float32)
            qd = np.clip(np.round(tpos * pos_scale), -32767, 32767).astype(np.int16)
            nz = np.any(qd != 0, axis=1)
            nz_idx = np.where(nz)[0].astype(np.uint16)
            if len(nz_idx) > 0:
                morphs[tk] = (nz_idx, qd[nz_idx])

    out = {
        "name": name,
        "vcount": int(len(pos)),
        "icount": int(len(idx)),
        "pos": quantize_pos(pos, pos_scale),
        "norm_oct": encode_octahedral_normals(norm),
        "uv": quantize_uv(uv),
        "joints": joints,
        "weights": weights_u8,
        "indices": idx,
        "cczone": cczone,
        "morphs": morphs,
        "_pos_f32": pos,
        "_norm_f32": norm,
    }

    if hair_helmet_tuck:
        # Compute helmet crown anti-clipping tuck delta & visibility mask per hair vertex
        hc = np.array([0.0, 1.548, 0.020], dtype=np.float32)
        rel = pos - hc
        tuck_delta = np.zeros_like(pos)
        crown_mask = np.zeros(len(pos), dtype=np.uint8)
        for vi in range(len(pos)):
            y, z, x = pos[vi, 1], pos[vi, 2], pos[vi, 0]
            rx, ry, rz = rel[vi, 0], rel[vi, 1], rel[vi, 2]
            r = math.sqrt(rx*rx + ry*ry*0.92 + rz*rz*0.86) + 1e-6
            # Crown/upper-back dome covered by helmet metal: retract inward & mark crown-culled
            if y > 1.595 or (y > 1.495 and z < 0.025):
                crown_mask[vi] = 255
                tuck_delta[vi] = -np.array([rx/r, ry/r, rz/r]) * 0.024
            else:
                # Visible temples, sideburns, bangs right under brow rim, and lower nape fringe: hug skull/cheek cleanly!
                crown_mask[vi] = 0
                tuck_delta[vi] = -np.array([rx/r, 0.0, rz/r]) * 0.005
        out["hair_tuck_delta"] = quantize_pos(tuck_delta, pos_scale)
        out["hair_crown_mask"] = crown_mask
    return out

def synthesize_expression_morphs(pos, pos_scale=10000.0):
    """Build smooth anatomical expression morphs directly on hm08 base_body."""
    morphs = {}
    # 1. Smirk: subtle left-side confident mouth-corner pull + slight cheek lift + soft right corner tighten
    smirk = np.zeros_like(pos)
    c_l = np.array([0.026, 1.474, 0.136], dtype=np.float32)
    d_l = np.linalg.norm(pos - c_l, axis=1)
    w_l = np.exp(-(d_l / 0.022) ** 2) * (pos[:, 1] > 1.43) * (pos[:, 2] > 0.10)
    smirk[:, 0] += w_l * 0.0045
    smirk[:, 1] += w_l * 0.0065
    smirk[:, 2] -= w_l * 0.0025
    # Cheek dimple lift
    ck_l = np.array([0.036, 1.495, 0.128], dtype=np.float32)
    w_ck = np.exp(-(np.linalg.norm(pos - ck_l, axis=1) / 0.024) ** 2) * (pos[:, 2] > 0.10)
    smirk[:, 1] += w_ck * 0.0032
    smirk[:, 2] += w_ck * 0.0020
    qd = np.clip(np.round(smirk * pos_scale), -32767, 32767).astype(np.int16)
    nz = np.where(np.any(qd != 0, axis=1))[0].astype(np.uint16)
    morphs["expr_smirk"] = (nz, qd[nz])

    # 2. Jaw open / Gasp: rotate lower lip & chin smoothly around jaw condyle [0, 1.495, 0.045]
    jaw = np.zeros_like(pos)
    piv = np.array([0.0, 1.495, 0.045], dtype=np.float32)
    # Mask lower jaw region below lip commissure & forward of neck
    lower_lip_mask = np.clip((1.474 - pos[:, 1]) / 0.018, 0.0, 1.0) * np.clip((pos[:, 1] - 1.375) / 0.035, 0.0, 1.0) * np.clip((pos[:, 2] - 0.04) / 0.04, 0.0, 1.0)
    theta = -0.22 * lower_lip_mask
    ry = pos[:, 1] - piv[1]
    rz = pos[:, 2] - piv[2]
    ny = piv[1] + ry * np.cos(theta) - rz * np.sin(theta)
    nzp = piv[2] + ry * np.sin(theta) + rz * np.cos(theta)
    jaw[:, 1] = ny - pos[:, 1]
    jaw[:, 2] = nzp - pos[:, 2]
    qd2 = np.clip(np.round(jaw * pos_scale), -32767, 32767).astype(np.int16)
    nz2 = np.where(np.any(qd2 != 0, axis=1))[0].astype(np.uint16)
    morphs["expr_jaw_open"] = (nz2, qd2[nz2])

    # 3. Brow furrow (focused / suppressed / combat glare)
    brow = np.zeros_like(pos)
    for sx in (-0.016, 0.016):
        bc = np.array([sx, 1.546, 0.135], dtype=np.float32)
        wb = np.exp(-(np.linalg.norm(pos - bc, axis=1) / 0.018) ** 2) * (pos[:, 2] > 0.11)
        brow[:, 1] -= wb * 0.0042
        brow[:, 2] += wb * 0.0018
        brow[:, 0] -= wb * math.copysign(0.0022, sx)
    qd3 = np.clip(np.round(brow * pos_scale), -32767, 32767).astype(np.int16)
    nz3 = np.where(np.any(qd3 != 0, axis=1))[0].astype(np.uint16)
    morphs["expr_brow_furrow"] = (nz3, qd3[nz3])
    return morphs

def decimate_skinned_mesh(pos, norm, uv, joints, weights, indices, target_cell_size):
    """Bone-region-aware spatial vertex clustering preserving limbs, bone skinning, and outward winding."""
    tris = indices.reshape(-1, 3)
    # Partition dominant bone into anatomical limb regions so arms never weld to torso or leg-to-leg!
    dom_j = joints[np.arange(len(joints)), np.argmax(weights, axis=1)]
    region = np.zeros(len(pos), dtype=np.int32)
    # 0=torso/pelvis, 1=head/neck (43,44), 2=arm_l (5..23), 3=arm_r (24..42), 4=leg_l (45..48), 5=leg_r (49..52)
    region[(dom_j == 43) | (dom_j == 44)] = 1
    region[(dom_j >= 5) & (dom_j <= 23)] = 2
    region[(dom_j >= 24) & (dom_j <= 42)] = 3
    region[(dom_j >= 45) & (dom_j <= 48)] = 4
    region[(dom_j >= 49) & (dom_j <= 52)] = 5

    # Keep head cells finer and prevent boot sole/toe fragmentation in LOD2
    head_mask = (region == 1) | (pos[:, 1] > 1.38)
    grid_pts = pos / target_cell_size
    grid_pts[head_mask] = (pos[head_mask] - np.array([0, 1.38, 0])) / (target_cell_size * 0.72) + np.array([0, 1.38 / target_cell_size, 0])
    # Snap sole/toe Y slightly so boots weld cleanly into solid silhouette at coarse LOD2
    foot_mask = pos[:, 1] < 0.14
    grid_pts[foot_mask, 1] = 0.0
    keys = np.round(grid_pts).astype(np.int32)
    cell_map = {}
    v_to_new = np.zeros(len(pos), dtype=np.int32)
    groups = []
    for vi in range(len(pos)):
        k = (int(region[vi]), int(keys[vi, 0]), int(keys[vi, 1]), int(keys[vi, 2]))
        gi = cell_map.get(k)
        if gi is None:
            gi = len(groups)
            cell_map[k] = gi
            groups.append([vi])
        else:
            groups[gi].append(vi)
        v_to_new[vi] = gi

    n_verts = len(groups)
    new_pos = np.zeros((n_verts, 3), dtype=np.float32)
    new_norm = np.zeros((n_verts, 3), dtype=np.float32)
    new_uv = np.zeros((n_verts, 2), dtype=np.float32)
    new_joints = np.zeros((n_verts, 4), dtype=np.uint8)
    new_weights = np.zeros((n_verts, 4), dtype=np.uint8)

    for gi, grp in enumerate(groups):
        arr = np.array(grp, dtype=np.int32)
        new_pos[gi] = pos[arr].mean(axis=0)
        nsum = norm[arr].sum(axis=0)
        nlen = np.linalg.norm(nsum)
        new_norm[gi] = nsum / max(nlen, 1e-6)
        new_uv[gi] = uv[arr[0]]
        # Keep dominant vertex skinning in cluster
        new_joints[gi] = joints[arr[0]]
        new_weights[gi] = weights[arr[0]]

    new_tris = []
    seen = set()
    for a, b, c in tris:
        na, nb, nc = int(v_to_new[a]), int(v_to_new[b]), int(v_to_new[c])
        if na == nb or nb == nc or na == nc:
            continue
        key = tuple(sorted((na, nb, nc)))
        if key in seen:
            continue
        # Ensure triangle winding aligns with original geometric normal
        orig_n = np.cross(pos[b] - pos[a], pos[c] - pos[a])
        new_n = np.cross(new_pos[nb] - new_pos[na], new_pos[nc] - new_pos[na])
        if np.linalg.norm(new_n) < 1e-10:
            continue
        if np.dot(orig_n, new_n) < 0:
            new_tris.append((na, nc, nb))
        else:
            new_tris.append((na, nb, nc))
        seen.add(key)

    new_idx = np.array(new_tris, dtype=np.uint16).reshape(-1)
    return {
        "vcount": n_verts,
        "icount": len(new_idx),
        "pos": quantize_pos(new_pos),
        "norm_oct": encode_octahedral_normals(new_norm),
        "uv": quantize_uv(new_uv),
        "joints": new_joints,
        "weights": new_weights,
        "indices": new_idx
    }

def build_custom_hard_surface_meshes(body_pos, body_norm, body_joints, body_weights, body_morphs=None):
    """Build original beveled sci-fi armor, 3-mode combat helmet, watch/gauntlet, carbine,
    modular articulated humanoid skeleton / android endoskeleton modules, & morph-tracked piercings."""
    meshes = {}

    def nearest_skin(pts):
        # Match nearest vertices in body_pos for smooth 53-bone skinning of armor plates
        # Vectorized chunked distance
        out_j = np.zeros((len(pts), 4), dtype=np.uint8)
        out_w = np.zeros((len(pts), 4), dtype=np.uint8)
        for i in range(0, len(pts), 256):
            chunk = pts[i:i+256]
            d2 = ((chunk[:, None, :] - body_pos[None, :, :]) ** 2).sum(axis=2)
            nn = np.argmin(d2, axis=1)
            out_j[i:i+256] = body_joints[nn]
            out_w[i:i+256] = body_weights[nn]
        return out_j, out_w

    def copy_nearest_morphs(verts, target_keys=None):
        if not body_morphs:
            return {}
        d2 = ((verts[:, None, :] - body_pos[None, :, :]) ** 2).sum(axis=2)
        nn = np.argmin(d2, axis=1)
        out_m = {}
        keys = target_keys or list(body_morphs.keys())
        for mk in keys:
            if mk not in body_morphs:
                continue
            bidx, bdel = body_morphs[mk]
            bmap = {int(vi): di for di, vi in enumerate(bidx)}
            m_idx, m_del = [], []
            for vi, b_vi in enumerate(nn):
                if int(b_vi) in bmap:
                    m_idx.append(vi)
                    m_del.append(bdel[bmap[int(b_vi)]])
            if m_idx:
                out_m[mk] = (np.array(m_idx, dtype=np.uint16), np.array(m_del, dtype=np.int16))
        return out_m

    def make_loft_shell(ring_list, closed_caps=True, uv_scale=(1.0, 1.0)):
        verts = []
        uvs = []
        tris = []
        n_rings = len(ring_list)
        n_seg = len(ring_list[0])
        for ri, ring in enumerate(ring_list):
            vcoord = ri / max(1, n_rings - 1) * uv_scale[1]
            for si, p in enumerate(ring):
                verts.append(p)
                uvs.append([si / n_seg * uv_scale[0], vcoord])
        for ri in range(n_rings - 1):
            for si in range(n_seg):
                ns = (si + 1) % n_seg
                a = ri * n_seg + si
                b = ri * n_seg + ns
                c = (ri + 1) * n_seg + ns
                d = (ri + 1) * n_seg + si
                tris.extend([a, b, c, a, c, d])
        if closed_caps:
            bcenter = len(verts)
            verts.append(np.mean(ring_list[0], axis=0))
            uvs.append([0.5, 0.0])
            for si in range(n_seg):
                ns = (si + 1) % n_seg
                tris.extend([bcenter, ns, si])
            tcenter = len(verts)
            verts.append(np.mean(ring_list[-1], axis=0))
            uvs.append([0.5, 1.0])
            base_t = (n_rings - 1) * n_seg
            for si in range(n_seg):
                ns = (si + 1) % n_seg
                tris.extend([tcenter, base_t + si, base_t + ns])
        v_arr = np.array(verts, dtype=np.float32)
        idx_arr = np.array(tris, dtype=np.uint16)
        if closed_caps and len(idx_arr) >= 3:
            t_np = idx_arr.reshape(-1, 3)
            v0, v1, v2 = v_arr[t_np[:, 0]], v_arr[t_np[:, 1]], v_arr[t_np[:, 2]]
            sv = float(np.sum(np.einsum('ij,ij->i', v0, np.cross(v1, v2))) / 6.0)
            if sv < 0.0:
                idx_arr = t_np[:, [0, 2, 1]].reshape(-1)
        n_arr = compute_vertex_normals(v_arr, idx_arr)
        return v_arr, n_arr, np.array(uvs, dtype=np.float32), idx_arr

    def compute_vertex_normals(v, idx):
        n = np.zeros_like(v)
        t = idx.reshape(-1, 3)
        e1 = v[t[:, 1]] - v[t[:, 0]]
        e2 = v[t[:, 2]] - v[t[:, 0]]
        fn = np.cross(e1, e2)
        for k in range(3):
            np.add.at(n, t[:, k], fn)
        l = np.linalg.norm(n, axis=1, keepdims=True)
        return n / np.maximum(l, 1e-6)

    def make_beveled_box(cx, cy, cz, hx, hy, hz, bevel=0.004, bone_idx=None):
        # 18-face crisp chamfered solid plate with outward normals & optional rigid bone bind
        # Subdivided 3-ring bevel loft along Y so bevels catch specular light smoothly!
        pts_base = [
            (-hx + bevel, -hz), (hx - bevel, -hz), (hx, -hz + bevel), (hx, hz - bevel),
            (hx - bevel, hz), (-hx + bevel, hz), (-hx, hz - bevel), (-hx, -hz + bevel)
        ]
        rings = []
        for dy, shrink in [(-hy, 1.0 - bevel / max(hx, hz, 0.01)), (-hy + bevel, 1.0), (hy - bevel, 1.0), (hy, 1.0 - bevel / max(hx, hz, 0.01))]:
            rings.append([np.array([cx + x * shrink, cy + dy, cz + z * shrink], dtype=np.float32) for x, z in pts_base])
        v, n, u, idx = make_loft_shell(rings, closed_caps=True)
        if bone_idx is not None:
            j = np.zeros((len(v), 4), dtype=np.uint8)
            j[:, 0] = bone_idx
            w = np.zeros((len(v), 4), dtype=np.uint8)
            w[:, 0] = 255
        else:
            j, w = nearest_skin(v)
        return v, n, u, idx, j, w

    def combine_parts(parts_list):
        all_v, all_n, all_u, all_i, all_j, all_w = [], [], [], [], [], []
        voff = 0
        for v, n, u, idx, j, w in parts_list:
            all_v.append(v); all_n.append(n); all_u.append(u)
            all_i.append(idx + voff)
            all_j.append(j); all_w.append(w)
            voff += len(v)
        v = np.vstack(all_v); n = np.vstack(all_n); u = np.vstack(all_u)
        idx = np.concatenate(all_i).astype(np.uint16)
        j = np.vstack(all_j); w = np.vstack(all_w)
        return {
            "vcount": len(v), "icount": len(idx),
            "pos": quantize_pos(v), "norm_oct": encode_octahedral_normals(n),
            "uv": quantize_uv(u), "joints": j, "weights": w, "indices": idx
        }

    # 1. TACTICAL CHEST CUIRASS + SHOULDER PAULDRONS + BELT/POUCHES + KNEEPADS
    # Conformed cleanly over hm08 torso (y=1.06..1.38) & upperarm (x=±0.20, y=1.30)
    cuirass_parts = []
    # Sculpted tactical armor cuirass sitting cleanly outside tshirt/jacket chest & shoulders
    chest_rings = []
    for y, rx, rz_f, rz_b in [
        (1.04, 0.184, 0.158, 0.135),
        (1.13, 0.192, 0.172, 0.142),
        (1.24, 0.205, 0.186, 0.152),
        (1.32, 0.190, 0.162, 0.138),
        (1.37, 0.125, 0.106, 0.105),
    ]:
        ring = []
        for si in range(20):
            a = 2.0 * math.pi * si / 20.0
            ca, sa = math.sin(a), math.cos(a)
            rz = rz_f if sa >= 0 else rz_b
            crest = 0.015 * max(0.0, 1.0 - abs(ca) * 2.5) if sa > 0.3 else 0.0
            ring.append(np.array([ca * rx, y, sa * (rz + crest) + 0.012], dtype=np.float32))
        chest_rings.append(ring)
    v_c, n_c, u_c, i_c = make_loft_shell(chest_rings, closed_caps=False)
    j_c, w_c = nearest_skin(v_c)
    cuirass_parts.append((v_c, n_c, u_c, i_c, j_c, w_c))
    # Chest bevel trauma insert & shoulder harness straps (proud of vest surface so zero z-fighting)
    cuirass_parts.append(make_beveled_box(0.0, 1.24, 0.210, 0.082, 0.064, 0.014, 0.005, bone_idx=4))
    cuirass_parts.append(make_beveled_box(0.0, 1.13, 0.194, 0.068, 0.032, 0.012, 0.004, bone_idx=3))
    cuirass_parts.append(make_beveled_box(-0.092, 1.35, 0.032, 0.028, 0.026, 0.080, 0.005, bone_idx=24))
    cuirass_parts.append(make_beveled_box( 0.092, 1.35, 0.032, 0.028, 0.026, 0.080, 0.005, bone_idx=5))
    # Back oxygen/power cell pack
    cuirass_parts.append(make_beveled_box(0.0, 1.22, -0.155, 0.092, 0.110, 0.030, 0.007, bone_idx=4))
    meshes["armor_cuirass"] = combine_parts(cuirass_parts)

    # Pauldrons (curved beveled deltoid shields rigged to upperarm_l=6, upperarm_r=25, wrapping outside sleeves)
    paul_parts = []
    for side, bx, bone_i in [(-1, -0.228, 25), (1, 0.228, 6)]:
        prings = []
        for dy, sy, rad in [(-0.075, 0.92, 0.074), (-0.025, 1.0, 0.082), (0.032, 0.95, 0.072), (0.068, 0.72, 0.048)]:
            ring = []
            for si in range(12):
                a = math.pi * (si / 11.0 - 0.5) * 1.45
                ox = bx + side * math.cos(a) * rad * 0.72
                oz = 0.018 + math.sin(a) * rad * 1.05
                oy = 1.318 + dy
                ring.append(np.array([ox, oy, oz], dtype=np.float32))
            for si in range(11, -1, -1):
                a = math.pi * (si / 11.0 - 0.5) * 1.45
                ox = bx + side * (math.cos(a) * rad * 0.72 - 0.012)
                oz = 0.018 + math.sin(a) * (rad * 1.05 - 0.010)
                oy = 1.318 + dy
                ring.append(np.array([ox, oy, oz], dtype=np.float32))
            prings.append(ring)
        vp, np_, up, ip = make_loft_shell(prings, closed_caps=True)
        jp = np.zeros((len(vp), 4), dtype=np.uint8); jp[:, 0] = bone_i
        wp = np.zeros((len(vp), 4), dtype=np.uint8); wp[:, 0] = 255
        paul_parts.append((vp, np_, up, ip, jp, wp))
    meshes["armor_pauldrons"] = combine_parts(paul_parts)

    # Utility belt + mag pouches + kneepads sitting snugly against jeans waist & knee!
    belt_parts = []
    belt_rings = []
    for dy, scale in [(-0.024, 0.99), (-0.011, 1.02), (0.011, 1.02), (0.024, 0.99)]:
        ring = []
        for si in range(20):
            a = 2.0 * math.pi * si / 20.0
            ring.append(np.array([math.sin(a)*0.178*scale, 0.935+dy, math.cos(a)*0.128*scale + 0.022], dtype=np.float32))
        belt_rings.append(ring)
    vb, nb, ub, ib = make_loft_shell(belt_rings, closed_caps=False)
    jb, wb = nearest_skin(vb)
    belt_parts.append((vb, nb, ub, ib, jb, wb))
    belt_parts.append(make_beveled_box(0.0, 0.935, 0.152, 0.030, 0.022, 0.012, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box(-0.184, 0.930, 0.022, 0.020, 0.032, 0.028, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box( 0.184, 0.930, 0.022, 0.020, 0.032, 0.028, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box(-0.184, 0.916,-0.045, 0.022, 0.034, 0.030, 0.004, bone_idx=1))
    # Kneepads snug at patella crest (y=0.472) & smoothly skinned via nearest_skin so they track bent knees cleanly!
    belt_parts.append(make_beveled_box( 0.146, 0.472, 0.095, 0.034, 0.038, 0.011, 0.004, bone_idx=None))
    belt_parts.append(make_beveled_box(-0.142, 0.472, 0.100, 0.034, 0.038, 0.011, 0.004, bone_idx=None))
    meshes["armor_belt_knees"] = combine_parts(belt_parts)

    # 2. CONSISTENT LEFT WRIST EMITTER DEVICES (Watch vs Full Gauntlet, centered & morph-tracked to forearm skin!)
    p_lo = np.array([0.331, 1.140, 0.020], dtype=np.float32)
    p_ha = np.array([0.453, 1.016, 0.183], dtype=np.float32)
    ax_arm = p_ha - p_lo; ax_arm /= max(float(np.linalg.norm(ax_arm)), 1e-5)
    ref_up = np.array([0.0, 1.0, 0.0], dtype=np.float32)
    u_arm = np.cross(ref_up, ax_arm); u_arm /= max(float(np.linalg.norm(u_arm)), 1e-5)
    v_arm = np.cross(ax_arm, u_arm)
    wrist_c = np.array([0.423, 1.047, 0.140], dtype=np.float32)

    w_band = []
    for dt in (-0.013, 0.0, 0.013):
        c = wrist_c + ax_arm * dt
        ring = []
        for si in range(14):
            a = 2.0 * math.pi * si / 14.0
            ring.append(c + (math.cos(a) * u_arm * 0.032) + (math.sin(a) * v_arm * 0.029))
        w_band.append(ring)
    vwb, nwb, uwb, iwb = make_loft_shell(w_band, closed_caps=False)
    jwb = np.zeros((len(vwb), 4), dtype=np.uint8); jwb[:, 0] = 7
    wwb = np.zeros((len(vwb), 4), dtype=np.uint8); wwb[:, 0] = 255
    dial_c = wrist_c + v_arm * 0.028
    watch_parts = [
        (vwb, nwb, uwb, iwb, jwb, wwb),
        make_beveled_box(dial_c[0], dial_c[1], dial_c[2], 0.014, 0.005, 0.015, 0.002, bone_idx=7)
    ]
    meshes["wrist_watch"] = combine_parts(watch_parts)
    meshes["wrist_watch"]["morphs"] = copy_nearest_morphs(meshes["wrist_watch"]["pos"].astype(np.float32) / 10000.0)

    gaunt_parts = []
    grings = []
    for t, ru, rv in [(0.18, 0.045, 0.041), (0.48, 0.040, 0.036), (0.76, 0.035, 0.031), (0.90, 0.033, 0.029)]:
        c = p_lo * (1.0 - t) + p_ha * t
        ring = []
        for si in range(14):
            a = 2.0 * math.pi * si / 14.0
            ring.append(c + (math.cos(a) * u_arm * ru) + (math.sin(a) * v_arm * rv))
        grings.append(ring)
    vg, ng, ug, ig = make_loft_shell(grings, closed_caps=False)
    jg = np.zeros((len(vg), 4), dtype=np.uint8); jg[:, 0] = 7
    wg = np.zeros((len(vg), 4), dtype=np.uint8); wg[:, 0] = 255
    gaunt_parts.append((vg, ng, ug, ig, jg, wg))
    g_box_c = wrist_c + v_arm * 0.029 - ax_arm * 0.020
    gaunt_parts.append(make_beveled_box(g_box_c[0], g_box_c[1], g_box_c[2], 0.024, 0.011, 0.030, 0.004, bone_idx=7))
    meshes["wrist_gauntlet"] = combine_parts(gaunt_parts)
    meshes["wrist_gauntlet"]["morphs"] = copy_nearest_morphs(meshes["wrist_gauntlet"]["pos"].astype(np.float32) / 10000.0)

    # 3. 3-MODE COMBAT HELMET (Open Visor / Half-Visor / Sealed Visor) rigged to head bone (44)
    # Sleek modern high-cut EV-TAC MK.IV ballistic helmet: smooth continuous 360° profile with horizontal brow rim & high-cut ear arch!
    h_parts = []
    n_s = 32
    n_r = 9
    outer_rings = []
    inner_rings = []
    hc = np.array([0.0, 1.580, 0.038], dtype=np.float32)

    def _helm_rim_y(ang):
        # ang = 0 is dead-center front forehead; pi is dead-center back nape
        ca = math.cos(ang)
        if ca >= 0.45:
            # Smooth gentle brow curve across forehead (~1.602 center -> 1.606 temples)
            return 1.602 + 0.006 * (1.0 - (ca - 0.45) / 0.55)
        elif ca >= -0.35:
            # High-cut ear-arch swoop above ears & side comms rails (1.608 -> 1.530)
            t = (0.45 - ca) / 0.80
            return 1.608 - 0.078 * (t * t * (3.0 - 2.0 * t))
        else:
            # Occipital nape shell protection down back of skull (1.530 -> 1.478)
            t = (-0.35 - ca) / 0.65
            return 1.530 - 0.052 * (t * t * (3.0 - 2.0 * t))

    for ri in range(n_r):
        v_t = ri / (n_r - 1)  # 0.0 = bottom sculpted rim -> 1.0 = crown ring
        # Radius profile across dome height
        if v_t < 0.35:
            st = v_t / 0.35
            rx = 0.122 + 0.002 * math.sin(st * math.pi)
            rz = 0.148 + 0.002 * math.sin(st * math.pi)
            zoff = 0.026 + 0.012 * st
        else:
            dt = (v_t - 0.35) / 0.65
            arch = math.cos(dt * math.pi * 0.44)
            rx = 0.032 + 0.090 * arch
            rz = 0.042 + 0.106 * arch
            zoff = 0.038 + 0.004 * math.sin(dt * math.pi) - 0.004 * dt
        o_ring, i_ring = [], []
        for si in range(n_s):
            ang = 2.0 * math.pi * (si / n_s)
            y_bot = _helm_rim_y(ang)
            y_top = 1.728
            # Smooth easing upward from sculpted lower rim toward crown dome
            y = y_bot + (y_top - y_bot) * (v_t ** 0.86)
            px = math.sin(ang) * rx
            pz = math.cos(ang) * rz + zoff
            p_out = np.array([px, y, pz], dtype=np.float32)
            o_ring.append(p_out)
            din = hc - p_out
            p_in = p_out + (din / (np.linalg.norm(din) + 1e-6)) * 0.007
            i_ring.append(p_in)
        outer_rings.append(o_ring)
        inner_rings.append(i_ring)

    verts_h, tris_h, uvs_h = [], [], []
    for ri in range(n_r):
        for si in range(n_s):
            verts_h.append(outer_rings[ri][si])
            uvs_h.append([si / n_s, ri / (n_r - 1)])
    in_off = len(verts_h)
    for ri in range(n_r):
        for si in range(n_s):
            verts_h.append(inner_rings[ri][si])
            uvs_h.append([si / n_s, ri / (n_r - 1)])
    for ri in range(n_r - 1):
        for si in range(n_s):
            ns = (si + 1) % n_s
            a, b, c, d = ri*n_s+si, ri*n_s+ns, (ri+1)*n_s+ns, (ri+1)*n_s+si
            tris_h.extend([a, b, c, a, c, d])
            ia, ib, ic, id_ = in_off+a, in_off+b, in_off+c, in_off+d
            tris_h.extend([ia, ic, ib, ia, id_, ic])
    # Seal bottom sculpted rim cleanly between outer_rings[0] and inner_rings[0]
    for si in range(n_s):
        ns = (si + 1) % n_s
        a, b, ia, ib = si, ns, in_off+si, in_off+ns
        tris_h.extend([a, ia, ib, a, ib, b])
    # Seal outer & inner top crown caps
    tc_out = len(verts_h); verts_h.append(np.array([0.0, 1.734, 0.034], dtype=np.float32)); uvs_h.append([0.5, 1.0])
    tc_in  = len(verts_h); verts_h.append(np.array([0.0, 1.727, 0.034], dtype=np.float32)); uvs_h.append([0.5, 1.0])
    top_base = (n_r - 1) * n_s
    for si in range(n_s):
        ns = (si + 1) % n_s
        tris_h.extend([tc_out, top_base + si, top_base + ns])
        tris_h.extend([tc_in, in_off + top_base + ns, in_off + top_base + si])

    vh = np.array(verts_h, dtype=np.float32)
    ih = np.array(tris_h, dtype=np.uint16)
    nh = compute_vertex_normals(vh, ih)
    uh = np.array(uvs_h, dtype=np.float32)
    jh = np.zeros((len(vh), 4), dtype=np.uint8); jh[:, 0] = 44
    wh = np.zeros((len(vh), 4), dtype=np.uint8); wh[:, 0] = 255
    h_parts.append((vh, nh, uh, ih, jh, wh))
    # Low-profile side tactical ARC comms rails + compact antenna pod (mounted cleanly on high-cut ear arch)
    h_parts.append(make_beveled_box(-0.125, 1.568, 0.022, 0.009, 0.018, 0.032, 0.004, bone_idx=44))
    h_parts.append(make_beveled_box( 0.125, 1.568, 0.022, 0.009, 0.018, 0.032, 0.004, bone_idx=44))
    h_parts.append(make_beveled_box( 0.130, 1.606, 0.014, 0.004, 0.034, 0.006, 0.002, bone_idx=44))
    meshes["helmet_shell"] = combine_parts(h_parts)

    # Half-Visor: sleek tactical ballistic eye shield tucked cleanly into horizontal brow rim (y=1.556..1.612)
    hv_rings = []
    for y, rz, rx in [(1.556, 0.144, 0.092), (1.576, 0.152, 0.098), (1.598, 0.150, 0.098), (1.612, 0.140, 0.092)]:
        ring = []
        for si in range(13):
            a = -0.76 + 1.52 * (si / 12.0)
            # Clean nose-bridge notch so nostrils & tip of nose stay completely open below eyepro!
            nose_arch = 0.012 * math.exp(-(a / 0.24)**2) if y < 1.570 else 0.0
            ring.append(np.array([math.sin(a)*rx, y + nose_arch, math.cos(a)*rz + 0.020], dtype=np.float32))
        for si in range(12, -1, -1):
            a = -0.76 + 1.52 * (si / 12.0)
            nose_arch = 0.012 * math.exp(-(a / 0.24)**2) if y < 1.570 else 0.0
            ring.append(np.array([math.sin(a)*(rx-0.004), y + nose_arch, math.cos(a)*(rz-0.004) + 0.020], dtype=np.float32))
        hv_rings.append(ring)
    vhv, nhv, uhv, ihv = make_loft_shell(hv_rings, closed_caps=True)
    jhv = np.zeros((len(vhv), 4), dtype=np.uint8); jhv[:, 0] = 44
    whv = np.zeros((len(vhv), 4), dtype=np.uint8); whv[:, 0] = 255
    meshes["helmet_half_visor"] = combine_parts([(vhv, nhv, uhv, ihv, jhv, whv)])

    # Sealed Lower Faceplate + Full Reflective Visor (contoured angled sci-fi faceplate y=1.456..1.612)
    sv_rings = []
    for y, rz, rx in [(1.456, 0.120, 0.072), (1.495, 0.144, 0.088), (1.542, 0.156, 0.098), (1.584, 0.154, 0.100), (1.612, 0.142, 0.094)]:
        ring = []
        for si in range(13):
            a = -0.90 + 1.80 * (si / 12.0)
            ring.append(np.array([math.sin(a)*rx, y, math.cos(a)*rz + 0.022], dtype=np.float32))
        for si in range(12, -1, -1):
            a = -0.90 + 1.80 * (si / 12.0)
            ring.append(np.array([math.sin(a)*(rx-0.004), y, math.cos(a)*(rz-0.004) + 0.022], dtype=np.float32))
        sv_rings.append(ring)
    vsv, nsv, usv, isv = make_loft_shell(sv_rings, closed_caps=True)
    jsv = np.zeros((len(vsv), 4), dtype=np.uint8); jsv[:, 0] = 44
    wsv = np.zeros((len(vsv), 4), dtype=np.uint8); wsv[:, 0] = 255
    meshes["helmet_sealed_visor"] = combine_parts([(vsv, nsv, usv, isv, jsv, wsv)])

    # 4. DETAILED TACTICAL CARBINE RIFLE (built in hand_r local origin so grip = (0,0,0), barrel points +Z!)
    rifle_parts = [
        make_beveled_box(0.0, 0.045,  0.040, 0.022, 0.036, 0.165, 0.005, bone_idx=0),  # receiver
        make_beveled_box(0.0, 0.052,  0.290, 0.020, 0.028, 0.125, 0.005, bone_idx=0),  # M-LOK handguard
        make_beveled_box(0.0, 0.056,  0.465, 0.011, 0.011, 0.085, 0.003, bone_idx=0),  # fluted barrel + comp
        make_beveled_box(0.0, 0.096,  0.065, 0.017, 0.022, 0.048, 0.004, bone_idx=0),  # holographic optic
        make_beveled_box(0.0, -0.015, 0.000, 0.016, 0.052, 0.022, 0.004, bone_idx=0),  # pistol grip (at origin)
        make_beveled_box(0.0, -0.045, 0.105, 0.015, 0.072, 0.028, 0.004, bone_idx=0),  # 30-rd magazine
        make_beveled_box(0.0,  0.012, 0.255, 0.014, 0.032, 0.020, 0.004, bone_idx=0),  # angled foregrip (IK target!)
        make_beveled_box(0.0,  0.032,-0.215, 0.018, 0.055, 0.115, 0.005, bone_idx=0),  # adjustable stock
    ]
    meshes["carbine_rifle"] = combine_parts(rifle_parts)

    # 5. MODULAR ARTICULATED HUMANOID SKELETON / ANDROID ENDOSKELETON (6 anatomical rig modules!)
    def make_limb_tube(p0, p1, r0, r1, bone_idx, n_seg=8):
        p0 = np.array(p0, dtype=np.float32); p1 = np.array(p1, dtype=np.float32)
        d = p1 - p0; dl = float(np.linalg.norm(d))
        ax = d / max(dl, 1e-5)
        ref = np.array([0.0, 1.0, 0.0], dtype=np.float32) if abs(ax[1]) < 0.92 else np.array([1.0, 0.0, 0.0], dtype=np.float32)
        u = np.cross(ref, ax); u /= max(float(np.linalg.norm(u)), 1e-5)
        v = np.cross(ax, u)
        rings = []
        for t, r in [(0.0, r0*0.85), (0.14, r0), (0.50, (r0+r1)*0.42), (0.86, r1), (1.0, r1*0.85)]:
            c = p0 * (1.0 - t) + p1 * t
            ring = []
            for si in range(n_seg):
                a = 2.0 * math.pi * si / n_seg
                ring.append(c + (math.cos(a) * u + math.sin(a) * v) * r)
            rings.append(ring)
        va, na, ua, ia = make_loft_shell(rings, closed_caps=True)
        ja = np.zeros((len(va), 4), dtype=np.uint8); ja[:, 0] = bone_idx
        wa = np.zeros((len(va), 4), dtype=np.uint8); wa[:, 0] = 255
        return va, na, ua, ia, ja, wa

    def make_joint_sphere(c, rx, ry, rz, bone_idx):
        c = np.array(c, dtype=np.float32)
        rings = []
        for ri in range(5):
            phi = -math.pi * 0.42 + (math.pi * 0.84) * (ri / 4.0)
            cp, sp = math.cos(phi), math.sin(phi)
            ring = []
            for si in range(8):
                a = 2.0 * math.pi * si / 8.0
                ring.append(c + np.array([math.cos(a)*cp*rx, sp*ry, math.sin(a)*cp*rz], dtype=np.float32))
            rings.append(ring)
        va, na, ua, ia = make_loft_shell(rings, closed_caps=True)
        ja = np.zeros((len(va), 4), dtype=np.uint8); ja[:, 0] = bone_idx
        wa = np.zeros((len(va), 4), dtype=np.uint8); wa[:, 0] = 255
        return va, na, ua, ia, ja, wa

    # 5A. skel_head: Sculpted Cranium + Cheek Zygoma + Brow Bridge + Hinged Mandible + Cervical Spine
    sk_head = []
    cran_rings = []
    for y, rx, rz, zc in [
        (1.505, 0.056, 0.072, 0.015), (1.545, 0.072, 0.088, 0.032),
        (1.592, 0.078, 0.095, 0.036), (1.640, 0.074, 0.090, 0.030),
        (1.680, 0.054, 0.068, 0.022), (1.702, 0.025, 0.034, 0.016)
    ]:
        ring = []
        for si in range(14):
            a = 2.0 * math.pi * si / 14.0
            ca, sa = math.sin(a), math.cos(a)
            # Carve orbital eye recesses on forward cheek face (y ~ 1.56..1.60, sa > 0.4)
            orbit_dip = 0.016 * math.exp(-((abs(ca) - 0.34) / 0.18)**2) if (1.55 < y < 1.605 and sa > 0.35) else 0.0
            ring.append(np.array([ca * rx, y, sa * (rz - orbit_dip) + zc], dtype=np.float32))
        cran_rings.append(ring)
    vc, nc, uc, ic = make_loft_shell(cran_rings, closed_caps=True)
    jc = np.zeros((len(vc), 4), dtype=np.uint8); jc[:, 0] = 44
    wc = np.zeros((len(vc), 4), dtype=np.uint8); wc[:, 0] = 255
    sk_head.append((vc, nc, uc, ic, jc, wc))
    # Maxilla / nasal bridge + articulated cyber mandible + jaw hinge pistons + 2 glowing eye cores!
    sk_head.append(make_beveled_box(0.0, 1.505, 0.092, 0.026, 0.018, 0.024, 0.005, bone_idx=44))
    sk_head.append(make_beveled_box(0.0, 1.442, 0.088, 0.034, 0.016, 0.026, 0.005, bone_idx=44))
    sk_head.append(make_limb_tube((-0.056, 1.495, 0.048), (-0.034, 1.444, 0.086), 0.011, 0.009, 44, 6))
    sk_head.append(make_limb_tube(( 0.056, 1.495, 0.048), ( 0.034, 1.444, 0.086), 0.011, 0.009, 44, 6))
    sk_head.append(make_joint_sphere((-0.031, 1.584, 0.098), 0.014, 0.012, 0.012, 44))
    sk_head.append(make_joint_sphere(( 0.031, 1.584, 0.098), 0.014, 0.012, 0.012, 44))
    # Cervical spine vertebrae + flush neck base socket collar (bone 43)
    for vy in (1.425, 1.455, 1.485):
        sk_head.append(make_joint_sphere((0.0, vy, 0.012), 0.026, 0.012, 0.024, 43))
    sk_head.append(make_limb_tube((0.0, 1.385, 0.014), (0.0, 1.422, 0.014), 0.052, 0.042, 43, 12))
    meshes["skel_head"] = combine_parts(sk_head)

    # 5B. skel_torso: Lumbar/Thoracic Spine + Sternum Core + 6 Rib Arch Pairs + Clavicles + Pelvis Frame
    sk_torso = []
    for vy, bi in [(0.91, 1), (0.955, 2), (1.00, 2), (1.045, 3), (1.095, 3), (1.155, 4), (1.220, 4), (1.285, 4), (1.350, 4)]:
        sk_torso.append(make_joint_sphere((0.0, vy, -0.015), 0.028, 0.018, 0.026, bi))
    # Sternum shock plate & spinal actuator column
    sk_torso.append(make_beveled_box(0.0, 1.245, 0.096, 0.030, 0.092, 0.018, 0.006, bone_idx=4))
    sk_torso.append(make_beveled_box(0.0, 1.240,-0.045, 0.026, 0.115, 0.018, 0.005, bone_idx=4))
    # Curved anatomical/android ribs (6 symmetric pairs spanning spine -> sternum!)
    for ry, rw, rd, bi in [(1.33, 0.120, 0.088, 4), (1.29, 0.136, 0.100, 4), (1.24, 0.144, 0.106, 4), (1.19, 0.140, 0.102, 4), (1.14, 0.128, 0.094, 3), (1.09, 0.110, 0.082, 3)]:
        for sgn in (-1.0, 1.0):
            p_back = (sgn * 0.024, ry + 0.014, -0.020)
            p_mid  = (sgn * rw, ry, 0.026)
            p_front= (sgn * 0.028, ry - 0.014, rd)
            sk_torso.append(make_limb_tube(p_back, p_mid, 0.010, 0.011, bi, 6))
            sk_torso.append(make_limb_tube(p_mid, p_front, 0.011, 0.009, bi, 6))
    # Clavicles & Pelvis Iliac Chassis
    sk_torso.append(make_limb_tube((0.022, 1.345, 0.032), (0.168, 1.322, 0.020), 0.013, 0.014, 5, 6))
    sk_torso.append(make_limb_tube((-0.022, 1.345, 0.032), (-0.168, 1.322, 0.020), 0.013, 0.014, 24, 6))
    sk_torso.append(make_beveled_box(0.0, 0.875, 0.012, 0.102, 0.042, 0.054, 0.012, bone_idx=1))
    sk_torso.append(make_limb_tube((-0.085, 0.905, 0.018), (-0.102, 0.866, 0.006), 0.026, 0.022, 1, 8))
    sk_torso.append(make_limb_tube(( 0.085, 0.905, 0.018), ( 0.102, 0.866, 0.006), 0.026, 0.022, 1, 8))
    meshes["skel_torso"] = combine_parts(sk_torso)

    # 5C. skel_arm_l & skel_arm_r (Flush Deltoid Prosthetic Socket Collar -> Shoulder Servo -> Humerus -> Elbow -> Forearm -> Hand)
    for side, sgn, b_cl, b_up, b_lo, b_ha, f_base in [("l", 1.0, 5, 6, 7, 8, 9), ("r", -1.0, 24, 25, 26, 27, 28)]:
        p_cl = (sgn * 0.140, 1.318, 0.016)
        p_sh = (sgn * 0.170, 1.316, 0.019)
        p_el = (sgn * 0.331, 1.140, 0.020)
        p_wr = (sgn * 0.453, 1.016, 0.183)
        p_kn = (sgn * 0.486, 0.968, 0.252)
        arm_parts = [
            make_limb_tube(p_cl, p_sh, 0.036, 0.038, b_cl, 10), # Flush shoulder socket cuff!
            make_joint_sphere(p_sh, 0.040, 0.040, 0.040, b_up),
            make_limb_tube(p_sh, p_el, 0.026, 0.021, b_up, 8),
            make_limb_tube((p_sh[0]-sgn*0.012, p_sh[1]-0.02, p_sh[2]+0.018), (p_el[0]-sgn*0.008, p_el[1]+0.01, p_el[2]+0.015), 0.009, 0.008, b_up, 6),
            make_joint_sphere(p_el, 0.025, 0.025, 0.025, b_lo),
            make_limb_tube((p_el[0], p_el[1], p_el[2]+0.010), (p_wr[0], p_wr[1], p_wr[2]+0.008), 0.014, 0.011, b_lo, 6),
            make_limb_tube((p_el[0], p_el[1], p_el[2]-0.010), (p_wr[0], p_wr[1], p_wr[2]-0.008), 0.014, 0.011, b_lo, 6),
            make_joint_sphere(p_wr, 0.019, 0.017, 0.019, b_ha),
            make_limb_tube(p_wr, p_kn, 0.021, 0.023, b_ha, 6),
        ]
        for fi, dz, b_off in [(0, 0.018, 3), (1, 0.0, 6), (2, -0.018, 9), (3, -0.032, 12)]:
            fp0 = (p_kn[0] + sgn*0.004, p_kn[1] - 0.006, p_kn[2] + dz)
            fp1 = (fp0[0] + sgn*0.010, fp0[1] - 0.048, fp0[2] + 0.014)
            arm_parts.append(make_limb_tube(fp0, fp1, 0.006, 0.005, f_base + b_off, 6))
        meshes[f"skel_arm_{side}"] = combine_parts(arm_parts)

    # 5D. skel_leg_l & skel_leg_r (Flush Hip Socket Collar -> Femur + Actuator -> Knee Cap -> Dual Tibia/Fibula -> Foot Frame)
    for side, sgn, b_th, b_ca, b_ft, b_bl in [("l", 1.0, 45, 46, 47, 48), ("r", -1.0, 49, 50, 51, 52)]:
        p_pel= (sgn * 0.072, 0.905, 0.008)
        p_hp = (sgn * 0.102, 0.866, 0.005)
        p_kn = (sgn * 0.143, 0.474, 0.037)
        p_ak = (sgn * 0.181, 0.069, 0.022)
        p_bl = (sgn * 0.186, 0.022, 0.145)
        leg_parts = [
            make_limb_tube(p_pel, p_hp, 0.056, 0.048, 1, 10), # Flush hip socket cuff!
            make_joint_sphere(p_hp, 0.042, 0.042, 0.042, b_th),
            make_limb_tube(p_hp, p_kn, 0.034, 0.027, b_th, 8),
            make_limb_tube((p_hp[0]+sgn*0.026, p_hp[1]-0.03, p_hp[2]+0.015), (p_kn[0]+sgn*0.020, p_kn[1]+0.03, p_kn[2]+0.018), 0.010, 0.009, b_th, 6),
            make_joint_sphere(p_kn, 0.032, 0.032, 0.032, b_ca),
            make_limb_tube((p_kn[0]-sgn*0.012, p_kn[1], p_kn[2]+0.008), (p_ak[0]-sgn*0.010, p_ak[1], p_ak[2]+0.006), 0.019, 0.015, b_ca, 8),
            make_limb_tube((p_kn[0]+sgn*0.018, p_kn[1], p_kn[2]-0.010), (p_ak[0]+sgn*0.014, p_ak[1], p_ak[2]-0.008), 0.011, 0.009, b_ca, 6),
            make_joint_sphere(p_ak, 0.024, 0.024, 0.024, b_ft),
            make_limb_tube((p_ak[0], p_ak[1]-0.035, p_ak[2]-0.035), p_bl, 0.022, 0.026, b_ft, 6),
            make_beveled_box(p_bl[0], 0.014, p_bl[2] + 0.035, 0.034, 0.012, 0.042, 0.004, bone_idx=b_bl),
        ]
        meshes[f"skel_leg_{side}"] = combine_parts(leg_parts)

    # 6. MORPH-TRACKED 3D FACIAL PIERCINGS (Brow, Nostril, Lip, Ears — measured exact hm08 landmarks!)
    def make_piercing_mesh(centers_radii):
        parts = []
        for c, rad in centers_radii:
            parts.append(make_joint_sphere(c, rad, rad, rad, 44))
        res = combine_parts(parts)
        verts_f32 = res["pos"].astype(np.float32) / 10000.0
        res["morphs"] = copy_nearest_morphs(verts_f32)
        return res

    meshes["piercing_brow"] = make_piercing_mesh([
        ([0.047, 1.568, 0.129], 0.0024), ([0.049, 1.559, 0.130], 0.0022)
    ])
    meshes["piercing_nostril"] = make_piercing_mesh([
        ([0.017, 1.518, 0.143], 0.0022)
    ])
    meshes["piercing_lip"] = make_piercing_mesh([
        ([0.000, 1.462, 0.1425], 0.0024)
    ])
    meshes["piercing_ears"] = make_piercing_mesh([
        ([0.072, 1.506, 0.049], 0.0032), ([-0.072, 1.506, 0.049], 0.0032),
        ([0.081, 1.537, 0.030], 0.0025), ([-0.081, 1.537, 0.030], 0.0025),
    ])

    return meshes

def encode_webp_b64(img_bytes, max_size=512, quality=84, keep_alpha=False):
    im = Image.open(io.BytesIO(img_bytes))
    if max(im.size) > max_size:
        im = im.resize((max_size, max_size), Image.Resampling.LANCZOS)
    if not keep_alpha and im.mode != "RGB":
        im = im.convert("RGB")
    elif keep_alpha and im.mode != "RGBA":
        im = im.convert("RGBA")
    buf = io.BytesIO()
    im.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()

def serialize_mesh_pack(m):
    # Compact binary encoding per mesh
    buf = bytearray()
    has_cc = "cczone" in m
    has_tuck = "hair_tuck_delta" in m
    flags = (1 if has_cc else 0) | (2 if has_tuck else 0)
    morphs = m.get("morphs", {})
    buf += struct.pack("<IIHH", m["vcount"], m["icount"], flags, len(morphs))
    buf += m["pos"].astype("<i2").tobytes()
    buf += m["norm_oct"].astype("<i1").tobytes()
    buf += m["uv"].astype("<u2").tobytes()
    buf += m["joints"].astype("<u1").tobytes()
    buf += m["weights"].astype("<u1").tobytes()
    buf += m["indices"].astype("<u2").tobytes()
    if has_cc:
        buf += m["cczone"].astype("<u2").tobytes()
    if has_tuck:
        buf += m["hair_tuck_delta"].astype("<i2").tobytes()
        buf += m["hair_crown_mask"].astype("<u1").tobytes()
    for mk, (nz_idx, qd) in morphs.items():
        mkb = mk.encode("utf-8")
        buf += struct.pack("<HI", len(mkb), len(nz_idx))
        buf += mkb
        buf += nz_idx.astype("<u2").tobytes()
        buf += qd.astype("<i2").tobytes()
    return bytes(buf)

def main():
    os.makedirs(os.path.dirname(OUT_BIN), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)

    gltf_b, bin_b = load_glb(f"{SRC_DIR}/base_body.glb")
    body = pack_prim_mesh(gltf_b, bin_b, 0, 0, KEEP_TARGETS, "base_body")
    # Add synthesized expression morphs (smirk, jaw_open, brow_furrow)
    expr_m = synthesize_expression_morphs(body["_pos_f32"])
    body["morphs"].update(expr_m)

    # Eyes (Sclera, Iris, Cornea), Eyebrows, Eyelashes, Teeth (decimated for open mouth)
    eye_sclera = pack_prim_mesh(gltf_b, bin_b, 3, 0, KEEP_TARGETS, "eye_sclera")
    eye_iris   = pack_prim_mesh(gltf_b, bin_b, 3, 1, KEEP_TARGETS, "eye_iris")
    eye_cornea = pack_prim_mesh(gltf_b, bin_b, 3, 2, KEEP_TARGETS, "eye_cornea")
    eyebrows   = pack_prim_mesh(gltf_b, bin_b, 1, 0, KEEP_TARGETS, "eyebrows")
    eyelashes  = pack_prim_mesh(gltf_b, bin_b, 2, 0, KEEP_TARGETS, "eyelashes")

    # Skeleton metadata (53 joints: parent index, rest T/R, inverseBindMatrix)
    skin = gltf_b["skins"][0]
    joint_nodes = skin["joints"]
    node_to_joint = {ni: ji for ji, ni in enumerate(joint_nodes)}
    parents = [-1] * len(joint_nodes)
    rest_t = []
    rest_r = []
    joint_names = []
    for ji, ni in enumerate(joint_nodes):
        node = gltf_b["nodes"][ni]
        joint_names.append(node.get("name", f"j{ji}"))
        rest_t.append(node.get("translation", [0.0, 0.0, 0.0]))
        rest_r.append(node.get("rotation", [0.0, 0.0, 0.0, 1.0]))
        for ch in node.get("children", []):
            if ch in node_to_joint:
                parents[node_to_joint[ch]] = ji
    ibm = read_acc(gltf_b, bin_b, skin["inverseBindMatrices"]).astype(np.float32)

    # Compute exact Face UV, Fingernail UV & Body Tattoo UV Anchors from hm08
    bp = body["_pos_f32"]
    buv = body["uv"].astype(np.float32) / 65535.0
    bjnt = body["joints"][:, 0]
    face_uv_island = buv[:, 0] > 0.72
    def uv_center(x0, x1, y0, y1, zmin=0.05):
        m = face_uv_island & (bp[:,0]>=x0)&(bp[:,0]<=x1)&(bp[:,1]>=y0)&(bp[:,1]<=y1)&(bp[:,2]>=zmin)
        if not np.any(m): return [0.87, 0.52]
        return [float(buv[m,0].mean()), float(buv[m,1].mean())]
    face_uv_anchors = {
        "nose":     uv_center(-0.012, 0.012, 1.495, 1.530, 0.12),
        "ulip":     uv_center(-0.018, 0.018, 1.472, 1.490, 0.12),
        "llip":     uv_center(-0.018, 0.018, 1.452, 1.472, 0.11),
        "chin":     uv_center(-0.025, 0.025, 1.415, 1.450, 0.09),
        "lcheek":   uv_center( 0.025, 0.058, 1.475, 1.520, 0.09),
        "rcheek":   uv_center(-0.058,-0.025, 1.475, 1.520, 0.09),
        "forehead": uv_center(-0.030, 0.030, 1.565, 1.610, 0.11),
        "lbrow":    uv_center( 0.018, 0.048, 1.535, 1.555, 0.11),
        "rbrow":    uv_center(-0.048,-0.018, 1.535, 1.555, 0.11),
        "ljaw":     uv_center( 0.030, 0.068, 1.425, 1.470, 0.04),
        "rjaw":     uv_center(-0.068,-0.030, 1.425, 1.470, 0.04),
    }
    nail_uvs = []
    for fji in [11, 14, 17, 20, 23, 30, 33, 36, 39, 42]:
        fm = (bjnt == fji)
        if np.any(fm):
            fp = bp[fm]; fu = buv[fm]
            tip = int(np.argmin(fp[:, 1]))
            nail_uvs.append([round(float(fu[tip, 0]), 4), round(float(fu[tip, 1]), 4)])
    tattoo_uv = {
        "chest": [0.381, 0.297], "neck": [0.455, 0.087],
        "arm_l": [0.606, 0.171], "arm_r": [0.155, 0.171],
        "forearm_l": [0.708, 0.178], "face": [0.855, 0.415],
    }

    # Garments & Hair
    garments = {}
    garment_files = [
        ("briefs",   "clothing_briefs.glb",  False),
        ("bra",      "clothing_bra.glb",     False),
        ("panties",  "clothing_panties.glb", False),
        ("tshirt",   "clothing_tshirt.glb",  False),
        ("hoodie",   "clothing_hoodie.glb",  False),
        ("jacket",   "clothing_jacket.glb",  False),
        ("jeans",    "clothing_jeans.glb",   False),
        ("boots",    "clothing_boots.glb",   False),
        ("hair_short02", "hair_short02.glb", True),
        ("hair_short04", "hair_short04.glb", True),
        ("hair_braid01", "hair_braid01.glb", True),
    ]
    tex_blobs = {}

    def extract_imgs(gltf_x, bin_x, prefix, tex_specs):
        for img in gltf_x.get("images", []):
            iname = img.get("name", "tex")
            if iname in tex_specs:
                sz, q, alpha = tex_specs[iname]
                bv = gltf_x["bufferViews"][img["bufferView"]]
                raw = bin_x[bv["byteOffset"]:bv["byteOffset"]+bv["byteLength"]]
                tex_blobs[f"{prefix}_{iname}"] = encode_webp_b64(raw, sz, q, alpha)

    extract_imgs(gltf_b, bin_b, "body", {
        "skin_albedo": (1024, 84, False),
        "skin_normal": (512,  92, False),
        "ccRegions":   (256,  80, False),
        "eye":         (256,  86, False),
        "eyebrow":     (512,  86, True),
        "eyelash":     (512,  86, True),
    })

    for key, fn, is_hair in garment_files:
        gg, gb = load_glb(f"{SRC_DIR}/{fn}")
        garments[key] = pack_prim_mesh(gg, gb, 0, 0, KEEP_TARGETS, key, hair_helmet_tuck=is_hair)
        extract_imgs(gg, gb, key, {
            f"cloth_{key}_albedo": (512, 82, False),
            f"cloth_{key}_normal": (256, 88, False),
            key:                   (512, 84, True),
        })

    # Custom Hard-Surface Armor / Helmet / Watch / Gauntlet / Carbine / Skeleton / Piercings
    custom = build_custom_hard_surface_meshes(body["_pos_f32"], body["_norm_f32"], body["joints"], body["weights"], body["morphs"])

    # LOD1 (~3,500 tris) & LOD2 (~750 tris) decimated clothed humanoids
    # Build combined clothed reference (jacket + jeans + boots + exposed head/hands of base) for realistic LOD silhouettes
    base_tris = body["indices"].reshape(-1, 3)
    exposed_mask = (body["cczone"][base_tris] & (BODY_ZONES["jacket"] | BODY_ZONES["legs"] | BODY_ZONES["boots"] | BODY_ZONES["underwear_m"])) == 0
    exposed_tris = base_tris[np.all(exposed_mask, axis=1)].reshape(-1)

    comb_pos = [body["_pos_f32"], garments["jacket"]["_pos_f32"], garments["jeans"]["_pos_f32"], garments["boots"]["_pos_f32"]]
    comb_nrm = [body["_norm_f32"], garments["jacket"]["_norm_f32"], garments["jeans"]["_norm_f32"], garments["boots"]["_norm_f32"]]
    comb_uv  = [body["uv"].astype(np.float32)/65535.0, garments["jacket"]["uv"].astype(np.float32)/65535.0, garments["jeans"]["uv"].astype(np.float32)/65535.0, garments["boots"]["uv"].astype(np.float32)/65535.0]
    comb_j   = [body["joints"], garments["jacket"]["joints"], garments["jeans"]["joints"], garments["boots"]["joints"]]
    comb_w   = [body["weights"], garments["jacket"]["weights"], garments["jeans"]["weights"], garments["boots"]["weights"]]
    comb_i   = []
    vo = 0
    for arr_v, arr_i in [
        (body["_pos_f32"], exposed_tris),
        (garments["jacket"]["_pos_f32"], garments["jacket"]["indices"]),
        (garments["jeans"]["_pos_f32"], garments["jeans"]["indices"]),
        (garments["boots"]["_pos_f32"], garments["boots"]["indices"]),
    ]:
        comb_i.append(arr_i.astype(np.uint32) + vo)
        vo += len(arr_v)
    c_pos = np.vstack(comb_pos)
    c_nrm = np.vstack(comb_nrm)
    c_uv  = np.vstack(comb_uv)
    c_j   = np.vstack(comb_j)
    c_w   = np.vstack(comb_w)
    c_i   = np.concatenate(comb_i)

    # Bake alert tactical ready combat stance into LOD1/LOD2 (so 25-unit crowd stands combat-ready instead of A-pose!)
    def _q_to_m4(q):
        x, y, z, w = q
        return np.array([
            [1-2*(y*y+z*z), 2*(x*y-w*z),   2*(x*z+w*y),   0],
            [2*(x*y+w*z),   1-2*(x*x+z*z), 2*(y*z-w*x),   0],
            [2*(x*z-w*y),   2*(y*z+w*x),   1-2*(x*x+y*y), 0],
            [0, 0, 0, 1]
        ], dtype=np.float32)
    def _eul_xyz(rx, ry, rz):
        cx, sx = math.cos(rx), math.sin(rx); cy, sy = math.cos(ry), math.sin(ry); cz, sz = math.cos(rz), math.sin(rz)
        Rx = np.array([[1,0,0,0],[0,cx,-sx,0],[0,sx,cx,0],[0,0,0,1]], dtype=np.float32)
        Ry = np.array([[cy,0,sy,0],[0,1,0,0],[-sy,0,cy,0],[0,0,0,1]], dtype=np.float32)
        Rz = np.array([[cz,-sz,0,0],[sz,cz,0,0],[0,0,1,0],[0,0,0,1]], dtype=np.float32)
        return Rz @ Ry @ Rx
    lod_ovr = {
        "spine_02":   (0.08, 0.0, 0.0),
        "upperarm_r": (-0.52, 0.18, 0.44), "lowerarm_r": (-0.90, 0.34, 0.0),
        "upperarm_l": (-0.48,-0.28,-0.46), "lowerarm_l": (-0.92,-0.58, 0.0),
        "thigh_l":    (-0.14, 0.02, 0.03), "calf_l":     (0.24, 0.0, 0.0),
        "thigh_r":    (-0.10,-0.02,-0.03), "calf_r":     (0.18, 0.0, 0.0),
    }
    lod_worlds = []
    lod_skins = np.zeros((len(joint_names), 4, 4), dtype=np.float32)
    for ji, jn in enumerate(joint_names):
        M = _q_to_m4(rest_r[ji])
        M[:3, 3] = rest_t[ji]
        pi = parents[ji]
        W = (lod_worlds[pi] @ M) if pi >= 0 else M
        if jn in lod_ovr:
            W = W.copy()
            px, py, pz = W[:3, 3].copy()
            W[:3, 3] = 0
            W = _eul_xyz(*lod_ovr[jn]) @ W
            W[:3, 3] = [px, py, pz]
        lod_worlds.append(W)
        lod_skins[ji] = W @ ibm[ji].reshape(4, 4).T
    c_p4 = np.concatenate([c_pos, np.ones((len(c_pos), 1), dtype=np.float32)], axis=1)
    c_pos_p = np.zeros_like(c_pos)
    c_nrm_p = np.zeros_like(c_nrm)
    wf = c_w.astype(np.float32) / 255.0
    for k in range(4):
        S = lod_skins[c_j[:, k]]
        c_pos_p += wf[:, k:k+1] * np.einsum("vij,vj->vi", S, c_p4)[:, :3]
        c_nrm_p += wf[:, k:k+1] * np.einsum("vij,vj->vi", S[:, :3, :3], c_nrm)
    c_pos_p[:, 1] -= float(c_pos_p[:, 1].min())
    c_nrm_p /= np.maximum(np.linalg.norm(c_nrm_p, axis=1, keepdims=True), 1e-6)

    lod1 = decimate_skinned_mesh(c_pos_p, c_nrm_p, c_uv, c_j, c_w, c_i, 0.036)
    lod2 = decimate_skinned_mesh(c_pos_p, c_nrm_p, c_uv, c_j, c_w, c_i, 0.095)

    # Compact CC0 Animations (idle, walk, run, strafe_left, strafe_right — 15fps quantized int16 quaternions mapped to our 53 bones!)
    anims = {}
    jname_to_idx = {jn: ji for ji, jn in enumerate(joint_names)}
    for aname, afn in [("idle", "anim_idle.json"), ("walk", "anim_walk.json"), ("run", "anim_run.json"), ("strafe_left", "anim_strafe_left.json"), ("strafe_right", "anim_strafe_right.json")]:
        with open(f"{SRC_DIR}/{afn}") as f:
            aj = json.load(f)
        bmap = aj["boneMap"]
        n_frames = aj["frames"]
        step = max(1, n_frames // 20)
        sel_frames = list(range(0, n_frames, step))
        # Store active animated bones as int16 quaternions (32767)
        tracks = {}
        for src_bone, dst_bone in bmap.items():
            if dst_bone in jname_to_idx and src_bone in aj["joints"]:
                raw_qs = aj["joints"][src_bone]
                qs = [raw_qs[fi] for fi in sel_frames]
                qarr = np.clip(np.round(np.array(qs, dtype=np.float32) * 32767.0), -32767, 32767).astype(np.int16)
                tracks[str(jname_to_idx[dst_bone])] = base64.b64encode(qarr.tobytes()).decode("ascii")
        anims[aname] = {
            "duration": float(aj["duration"]),
            "frames": len(sel_frames),
            "tracks": tracks,
        }

    # Assemble single JSON header + binary mesh blob + texture b64 dict -> single zlib payload!
    mesh_catalog = {
        "base_body": body, "eye_sclera": eye_sclera, "eye_iris": eye_iris,
        "eye_cornea": eye_cornea, "eyebrows": eyebrows, "eyelashes": eyelashes,
        "lod1": lod1, "lod2": lod2,
    }
    mesh_catalog.update(garments)
    mesh_catalog.update(custom)

    mesh_blobs = bytearray()
    mesh_toc = {}
    for k, m in mesh_catalog.items():
        mb = serialize_mesh_pack(m)
        mesh_toc[k] = [len(mesh_blobs), len(mb)]
        mesh_blobs += mb

    # Load CC0 base_body.joints.json world-space morph joint offsets for accurate pivot tracking
    morph_joints = {}
    jpath = f"{SRC_DIR}/base_body.joints.json"
    if os.path.exists(jpath):
        with open(jpath) as f:
            jj = json.load(f)
        jname_map = {jn: ji for ji, jn in enumerate(joint_names)}
        for mk in KEEP_TARGETS:
            jm = jj.get("morphs", {}).get(mk)
            if not jm:
                continue
            entries = {}
            for bn, dxyz in jm.items():
                if bn in jname_map and (abs(dxyz[0]) > 1e-4 or abs(dxyz[1]) > 1e-4 or abs(dxyz[2]) > 1e-4):
                    entries[str(jname_map[bn])] = [round(float(dxyz[0]), 5), round(float(dxyz[1]), 5), round(float(dxyz[2]), 5)]
            if entries:
                morph_joints[mk] = entries

    manifest = {
        "version": "ev-humanoid-kit-1.1",
        "license": "CC0-1.0 (MakeHuman/MPFB2/CharacterCreator assets) + MIT (Endless Vigil custom armor/skeleton/props)",
        "bodyZones": BODY_ZONES,
        "faceUV": face_uv_anchors,
        "nailUVs": nail_uvs,
        "tattooUV": tattoo_uv,
        "skeleton": {
            "names": joint_names,
            "parents": parents,
            "restT": [[round(float(x), 6) for x in t] for t in rest_t],
            "restR": [[round(float(x), 6) for x in r] for r in rest_r],
            "ibmB64": base64.b64encode(ibm.astype("<f4").tobytes()).decode("ascii"),
            "morphJoints": morph_joints,
        },
        "meshToc": mesh_toc,
        "anims": anims,
        "texB64": {k: base64.b64encode(v).decode("ascii") for k, v in tex_blobs.items()},
    }
    mbytes = json.dumps(manifest, separators=(",", ":")).encode("utf-8")
    raw_pack = struct.pack("<I", len(mbytes)) + mbytes + bytes(mesh_blobs)
    zpack = zlib.compress(raw_pack, level=9)
    with open(OUT_BIN, "wb") as f:
        f.write(zpack)

    zb64 = base64.b64encode(zpack).decode("ascii")
    js_content = f"""/* Endless Vigil — CC0 Humanoid & Tactical Kit v1.0 (Auto-generated by build-cc0-humanoid-kit.py) */
(function(root, factory){{
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EV_HUMANOID_KIT_PACK = factory();
}})(typeof self !== 'undefined' ? self : this, function(){{
  return "{zb64}";
}});
"""
    with open(OUT_JS, "w") as f:
        f.write(js_content)

    print("=== CC0 HUMANOID KIT COMPILED ===")
    print(f"Raw pack: {len(raw_pack)//1024} KB -> Zlib compressed: {len(zpack)//1024} KB -> JS UMD: {len(js_content)//1024} KB")
    print(f"Textures packed ({len(tex_blobs)}): {sum(len(v) for v in tex_blobs.values())//1024} KB")
    for k, m in mesh_catalog.items():
        print(f"  mesh {k:20s}: verts={m['vcount']:5d} tris={m['icount']//3:5d} morphs={len(m.get('morphs', {})):2d}")

if __name__ == "__main__":
    main()
