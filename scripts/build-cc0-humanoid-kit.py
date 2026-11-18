#!/usr/bin/env python3
"""
Compile Endless Vigil's self-contained CC0 Humanoid + Tactical Kit (ev-humanoid-kit-1.2).
Sources:
  - CC0 MakeHuman / MPFB2 / CharacterCreator mesh + 73 morphs + 53-bone rig + animations (/tmp/cc0_inspect)
  - CC0 MakeHuman / vrm-avatar-maker hairs, 3D beards, moustache, cargo trousers, cyborg suit, real skins & masks (/tmp/vrm_inspect)
  - MIT Endless Vigil original sculpted armor, helmet, carbine, wrist devices, articulated cybernetics & endoskeleton modules.
Zero GPL code is imported or copied. Output: assets/ev-humanoid-kit.bin + js/ev-humanoid-kit.js.
"""
import os, json, struct, zlib, gzip, base64, io, math, urllib.request
import numpy as np
from PIL import Image, ImageFilter
from scipy.spatial import cKDTree

SRC_DIR = "/tmp/cc0_inspect"
VRM_DIR = "/tmp/vrm_inspect"
OUT_BIN = "/home/user/assets/ev-humanoid-kit.bin"
OUT_JS  = "/home/user/js/ev-humanoid-kit.js"

KEEP_TARGETS = [
    "gender_male", "gender_female",
    "age_old",
    "muscle_min", "muscle_max",
    "weight_min", "weight_max",
    "height_min", "height_max",
    "breast_cup_min", "breast_cup_max",
    "breast_firm_min", "breast_firm_max",
    "breast_height_min", "breast_height_max",
    "breast_dist_min", "breast_dist_max",
    "breast_point_min", "breast_point_max",
    "breast_shape_round", "breast_shape_natural",
    "dyn_breast_in", "dyn_breast_out",
    "dyn_breast_up", "dyn_breast_down",
    "dyn_breast_left", "dyn_breast_right",
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

def _ensure_file(path, url):
    if os.path.exists(path) and os.path.getsize(path) > 64:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "EndlessVigilAssetBuilder/1.2"})
    with urllib.request.urlopen(req, timeout=45) as resp, open(path, "wb") as out:
        out.write(resp.read())

def ensure_cc0_sources():
    cc_base = "https://raw.githubusercontent.com/kblood/CharacterCreator/master/output"
    for fn, src_fn in [
        ("base_body.glb", "base_body.glb"),
        ("base_body.joints.json", "base_body.joints.json"),
        ("clothing_briefs.glb", "clothing_briefs.glb"),
        ("clothing_bra.glb", "clothing_bra.glb"),
        ("clothing_panties.glb", "clothing_panties.glb"),
        ("clothing_tshirt.glb", "clothing_tshirt.glb"),
        ("clothing_hoodie.glb", "clothing_hoodie.glb"),
        ("clothing_jacket.glb", "clothing_jacket.glb"),
        ("clothing_jeans.glb", "clothing_jeans.glb"),
        ("clothing_boots.glb", "clothing_boots.glb"),
        ("hair_short02.glb", "hair_short02.glb"),
        ("hair_short04.glb", "hair_short04.glb"),
        ("hair_braid01.glb", "hair_braid01.glb"),
        ("anim_idle.json", "animations/idle.json"),
        ("anim_walk.json", "animations/walk.json"),
        ("anim_run.json", "animations/run.json"),
        ("anim_strafe_left.json", "animations/strafe_left.json"),
        ("anim_strafe_right.json", "animations/strafe_right.json"),
    ]:
        _ensure_file(f"{SRC_DIR}/{fn}", f"{cc_base}/{src_fn}")

    vrm_base = "https://raw.githubusercontent.com/ffunch/vrm-avatar-maker/main/web/assets"
    for p in ["base.json", "base.bin.gz"]:
        _ensure_file(f"{VRM_DIR}/{p}", f"{vrm_base}/{p}")
    for item_id in [
        "beard_goatee", "beard_short", "rehmanpolanski_beard_viking", "rehmanpolanski_moustache_viking",
        "short01", "cortu_short_messy_hair", "cortu_shaggy_green_hair", "bob02", "long01", "ponytail01", "afro01",
        "toigo_wool_pants", "ours_space_suit"
    ]:
        _ensure_file(f"{VRM_DIR}/items/{item_id}.json", f"{vrm_base}/items/{item_id}.json")
        _ensure_file(f"{VRM_DIR}/items/{item_id}.bin.gz", f"{vrm_base}/items/{item_id}.bin.gz")
    for tex_p in [
        "textures/view/skin_young_caucasian_male.jpg",
        "textures/view/skin_young_african_male.jpg",
        "textures/view/eye_brown.jpg",
        "textures/view/beard_goatee.webp",
        "textures/view/beard_short.webp",
        "textures/view/rehmanpolanski_beard_viking.webp",
        "textures/view/rehmanpolanski_moustache_viking.webp",
        "textures/view/short01.webp",
        "textures/view/cortu_short_messy_hair.webp",
        "textures/view/cortu_shaggy_green_hair.webp",
        "textures/view/bob02.webp",
        "textures/view/long01.webp",
        "textures/view/ponytail01.webp",
        "textures/view/afro01.webp",
        "textures/view/toigo_wool_pants.jpg",
        "textures/view/ours_space_suit.jpg",
        "textures/view/toigo_ankle_boots_male.jpg",
        "masks/mask_beard.png",
        "masks/mask_lips.png",
    ]:
        out_rel = tex_p.replace("textures/view/", "textures/")
        _ensure_file(f"{VRM_DIR}/{out_rel}", f"{vrm_base}/{tex_p}")

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
    return np.clip(np.round(n[:, :2] * 127.0), -127, 127).astype(np.int8)

def quantize_pos(pos, scale=10000.0):
    return np.clip(np.round(pos * scale), -32767, 32767).astype(np.int16)

def quantize_uv(uv):
    u = np.where((uv >= -0.025) & (uv <= 1.025), np.clip(uv, 0.0, 1.0), np.mod(uv, 1.00001))
    return np.clip(np.round(u * 65535.0), 0, 65535).astype(np.uint16)

def compute_vertex_normals(verts, tris):
    acc = np.zeros_like(verts)
    t = tris.reshape(-1, 3)
    v0, v1, v2 = verts[t[:, 0]], verts[t[:, 1]], verts[t[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    np.add.at(acc, t[:, 0], fn)
    np.add.at(acc, t[:, 1], fn)
    np.add.at(acc, t[:, 2], fn)
    ln = np.linalg.norm(acc, axis=1, keepdims=True)
    acc /= np.maximum(ln, 1e-7)
    return acc

def pack_prim_mesh(gltf, b, mesh_idx, prim_idx=0, target_names_keep=None, name="mesh", hair_helmet_tuck=False, normal_push_m=0.0, pos_scale=10000.0):
    m = gltf["meshes"][mesh_idx]
    pr = m["primitives"][prim_idx]
    attrs = pr["attributes"]
    pos = read_acc(gltf, b, attrs["POSITION"]).astype(np.float32)
    norm = read_acc(gltf, b, attrs["NORMAL"]).astype(np.float32)
    uv = read_acc(gltf, b, attrs["TEXCOORD_0"]).astype(np.float32)
    joints = read_acc(gltf, b, attrs["JOINTS_0"]).astype(np.uint8)
    weights_f = read_acc(gltf, b, attrs["WEIGHTS_0"]).astype(np.float32)
    wsum = np.maximum(weights_f.sum(axis=1, keepdims=True), 1e-6)
    wn = weights_f / wsum
    weights_u8 = np.clip(np.round(wn * 255.0), 0, 255).astype(np.uint8)
    for vi in range(len(weights_u8)):
        s = int(weights_u8[vi].sum())
        if s != 255:
            mi = int(np.argmax(weights_u8[vi]))
            weights_u8[vi, mi] = np.clip(int(weights_u8[vi, mi]) + (255 - s), 0, 255)

    if normal_push_m != 0.0:
        pos = pos + norm * float(normal_push_m)

    idx = read_acc(gltf, b, pr["indices"]).astype(np.uint16)
    cczone = read_acc(gltf, b, attrs["_CCZONE"]).astype(np.uint16) if "_CCZONE" in attrs else np.zeros(len(pos), dtype=np.uint16)
    if name == "base_body":
        front_neck = (pos[:, 1] > 1.365) & (pos[:, 2] > -0.02)
        cczone[front_neck] = 0

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
        hc = np.array([0.0, 1.548, 0.020], dtype=np.float32)
        rel = pos - hc
        tuck_delta = np.zeros_like(pos)
        crown_mask = np.zeros(len(pos), dtype=np.uint8)
        for vi in range(len(pos)):
            y, z = pos[vi, 1], pos[vi, 2]
            rx, ry, rz = rel[vi, 0], rel[vi, 1], rel[vi, 2]
            r = math.sqrt(rx*rx + ry*ry*0.92 + rz*rz*0.86) + 1e-6
            if y > 1.595 or (y > 1.495 and z < 0.025):
                crown_mask[vi] = 255
                tuck_delta[vi] = -np.array([rx/r, ry/r, rz/r]) * 0.024
            else:
                crown_mask[vi] = 0
                tuck_delta[vi] = -np.array([rx/r, 0.0, rz/r]) * 0.005
        out["hair_tuck_delta"] = quantize_pos(tuck_delta, pos_scale)
        out["hair_crown_mask"] = crown_mask
    return out

def _unplane_vrm_buf(raw, layout):
    buf = bytearray(raw)
    for k, entry in layout.items():
        off, cnt, _kind = entry[0], entry[1], entry[2]
        flag = entry[3] if len(entry) > 3 else None
        if flag not in ("planes", "xyz"):
            continue
        u8 = np.frombuffer(buf, dtype=np.uint8, count=cnt*2, offset=off).copy()
        out = np.empty_like(u8)
        if flag == "planes":
            out[0::2] = u8[:cnt]
            out[1::2] = u8[cnt:]
        else:
            n = cnt // 3
            for c in range(3):
                out[c*2::6] = u8[c*n:(c+1)*n]
                out[c*2+1::6] = u8[cnt+c*n:cnt+(c+1)*n]
        buf[off:off+cnt*2] = out.tobytes()
    return bytes(buf)

def build_vrm_source_to_kb_map(kb_pos, kb_uv):
    """Exact UV bijection mapping vrm-avatar-maker's 19,158 base vertices to kblood's 14,517 base_body vertices."""
    base_info = json.load(open(f"{VRM_DIR}/base.json"))
    braw = _unplane_vrm_buf(gzip.decompress(open(f"{VRM_DIR}/base.bin.gz", "rb").read()), base_info["layout"])
    vrm_uv = np.frombuffer(braw, dtype="<f4", count=base_info["layout"]["uv"][1], offset=base_info["layout"]["uv"][0]).reshape(-1, 2)
    vrm_src = np.frombuffer(braw, dtype="<u4", count=base_info["layout"]["source"][1], offset=base_info["layout"]["source"][0])
    vrm_pos = np.frombuffer(braw, dtype="<f4", count=base_info["layout"]["positions"][1], offset=base_info["layout"]["positions"][0]).reshape(-1, 3) / 10.0
    vrm_pos[:, 1] -= vrm_pos[:, 1].min()

    kb_map = {(round(float(u), 5), round(float(1.0 - v), 5)): ki for ki, (u, v) in enumerate(kb_uv)}
    src_to_kb = np.full(base_info["vertexCount"], -1, dtype=np.int32)
    for r in range(len(vrm_src)):
        u, v = round(float(vrm_uv[r, 0]), 5), round(float(vrm_uv[r, 1]), 5)
        ki = kb_map.get((u, v))
        if ki is None:
            ki = int(np.argmin((kb_uv[:, 0] - u)**2 + ((1.0 - kb_uv[:, 1]) - v)**2))
        src_to_kb[vrm_src[r]] = ki

    mapped_idx = np.where(src_to_kb >= 0)[0]
    vrm_pos_kb = np.zeros_like(vrm_pos)
    unmapped = np.where(src_to_kb < 0)[0]
    vrm_pos_kb[mapped_idx] = kb_pos[src_to_kb[mapped_idx]]
    if len(unmapped) > 0:
        _, nn = cKDTree(vrm_pos[mapped_idx]).query(vrm_pos[unmapped])
        nearest_m = mapped_idx[nn]
        src_to_kb[unmapped] = src_to_kb[nearest_m]
        vrm_pos_kb[unmapped] = kb_pos[src_to_kb[nearest_m]] + (vrm_pos[unmapped] - vrm_pos[nearest_m])
    return src_to_kb, vrm_pos_kb

def _precompute_dense_morphs_f32(kb_len, kb_morphs, pos_scale=10000.0):
    dense = {}
    for mk, (bidx, bqd) in kb_morphs.items():
        arr = np.zeros((kb_len, 3), dtype=np.float32)
        arr[bidx] = bqd.astype(np.float32) / pos_scale
        dense[mk] = arr
    return dense

def compile_vrm_item(item_id, name, body, src_to_kb, vrm_pos_kb, dense_kb_morphs, is_hair=False, min_clear_m=0.0016, pos_scale=10000.0):
    """Compile a CC0 vrm-avatar-maker .mhclo asset onto base_body with full 73-morph transfer + zero-clipping guarantee."""
    it_info = json.load(open(f"{VRM_DIR}/items/{item_id}.json"))
    iraw = _unplane_vrm_buf(gzip.decompress(open(f"{VRM_DIR}/items/{item_id}.bin.gz", "rb").read()), it_info["layout"])
    L = it_info["layout"]
    dt = {"f": "<f4", "I": "<u4", "h": "<i2", "H": "<u2"}
    def vw(k): return np.frombuffer(iraw, dtype=dt[L[k][2]], count=L[k][1], offset=L[k][0])

    isrc  = vw("source").astype(np.int32)
    iuv   = vw("uv").reshape(-1, 2).copy()
    iuv[:, 1] = 1.0 - iuv[:, 1]
    iidx  = vw("indices").astype(np.uint16)
    refs  = vw("refs").reshape(-1, 3)
    rw    = vw("weights").reshape(-1, 3)
    roff  = vw("offsets").reshape(-1, 3) / 10.0

    kb_pos  = body["_pos_f32"]
    kb_norm = body["_norm_f32"]
    kb_j    = body["joints"]
    kb_w    = body["weights"].astype(np.float32) / 255.0

    sc = it_info.get("scale", {})
    s = [abs(vrm_pos_kb[sc[ax][0], k] - vrm_pos_kb[sc[ax][1], k]) / (sc[ax][2] / 10.0) if ax in sc else 1.0 for k, ax in enumerate(["x", "y", "z"])]

    n_src = it_info["vertexCount"]
    src_pos = np.zeros((n_src, 3), dtype=np.float32)
    kb_r0 = src_to_kb[refs[:, 0]]
    kb_r1 = src_to_kb[refs[:, 1]]
    kb_r2 = src_to_kb[refs[:, 2]]
    src_pos = vrm_pos_kb[refs[:, 0]] * rw[:, 0:1] + vrm_pos_kb[refs[:, 1]] * rw[:, 1:2] + vrm_pos_kb[refs[:, 2]] * rw[:, 2:3] + roff * np.array(s, dtype=np.float32)

    # Fast dominant skinning transfer (exact weighted blend for mixed-joint roots; direct copy when same joint)
    src_j = np.zeros((n_src, 4), dtype=np.uint8)
    src_w = np.zeros((n_src, 4), dtype=np.uint8)
    for vi in range(n_src):
        acc = {}
        for k, kb_arr in ((0, kb_r0), (1, kb_r1), (2, kb_r2)):
            wk = float(rw[vi, k])
            if wk <= 0.0: continue
            bvi = int(kb_arr[vi])
            for jslot in range(4):
                bw = float(kb_w[bvi, jslot])
                if bw <= 0.0: continue
                jb = int(kb_j[bvi, jslot])
                acc[jb] = acc.get(jb, 0.0) + wk * bw
        top = sorted([(j, w) for j, w in acc.items() if w > 1e-4], key=lambda x: -x[1])[:4]
        tot = sum(w for _, w in top) or 1.0
        if not top:
            src_w[vi, 0] = 255
        else:
            vals = [int(round(w / tot * 255.0)) for _, w in top]
            vals[0] += 255 - sum(vals)
            for si, (jb, _) in enumerate(top):
                src_j[vi, si] = jb
                src_w[vi, si] = max(0, min(255, vals[si]))

    r_pos  = src_pos[isrc]
    r_j    = src_j[isrc]
    r_w    = src_w[isrc]
    r_norm = compute_vertex_normals(r_pos, iidx)

    # Transfer ALL 73 morphs identically from base_body using barycentric refs
    src_morphs_f32 = {}
    for mk, dense_b in dense_kb_morphs.items():
        md = dense_b[kb_r0] * rw[:, 0:1] + dense_b[kb_r1] * rw[:, 1:2] + dense_b[kb_r2] * rw[:, 2:3]
        src_morphs_f32[mk] = md

    # Fast cKDTree zero-clipping verification & outward skin-normal clearance pass across extreme slider combos
    pushed_cnt, max_push = 0, 0.0
    if min_clear_m > 0.0:
        test_combos = [
            {},
            {"face_jaw_width_incr": 1.0, "face_chin_incr": 1.0, "face_lips_incr": 1.0, "face_cheekbones_incr": 1.0, "face_mouth_width_incr": 1.0},
            {"face_jaw_width_decr": 1.0, "face_chin_decr": 1.0, "face_lips_decr": 1.0, "face_cheekbones_decr": 1.0, "face_mouth_width_decr": 1.0},
            {"face_nose_length_incr": 1.0, "face_nose_width_incr": 1.0, "face_jaw_width_incr": 1.0},
            {"gender_male": 1.0, "muscle_max": 0.8, "weight_max": 0.6},
            {"gender_female": 1.0, "weight_max": 0.6, "muscle_min": 0.5},
        ]
        src_skin_n = kb_norm[kb_r0] * np.maximum(rw[:, 0:1], 0.0) + kb_norm[kb_r1] * np.maximum(rw[:, 1:2], 0.0) + kb_norm[kb_r2] * np.maximum(rw[:, 2:3], 0.0)
        src_skin_n /= np.maximum(np.linalg.norm(src_skin_n, axis=1, keepdims=True), 1e-6)
        push_needed = np.zeros(n_src, dtype=np.float32)
        for combo in test_combos:
            b_cur = kb_pos.copy()
            s_cur = src_pos.copy()
            for mk, wv in combo.items():
                if mk in dense_kb_morphs: b_cur += dense_kb_morphs[mk] * wv
                if mk in src_morphs_f32:  s_cur += src_morphs_f32[mk] * wv
            euclid_d, nn = cKDTree(b_cur).query(s_cur)
            signed_d = ((s_cur - b_cur[nn]) * kb_norm[nn]).sum(axis=1)
            align = (src_skin_n * kb_norm[nn]).sum(axis=1)
            need = np.where((euclid_d < 0.008) & (align > 0.35) & (signed_d < min_clear_m), np.minimum(min_clear_m - signed_d, 0.0055), 0.0)
            push_needed = np.maximum(push_needed, need)
        pushed = push_needed > 1e-5
        if np.any(pushed):
            pushed_cnt = int(np.sum(pushed))
            max_push = float(np.max(push_needed)) * 1000.0
            src_pos += src_skin_n * push_needed[:, None]
            r_pos = src_pos[isrc]
            r_norm = compute_vertex_normals(r_pos, iidx)
        print(f"  [clearance] {name:16s}: pushed {pushed_cnt:4d}/{n_src:4d} verts (max +{max_push:.2f}mm)")

    # Quantize morph deltas for render verts
    morphs = {}
    for mk, md_src in src_morphs_f32.items():
        md_r = md_src[isrc]
        qd = np.clip(np.round(md_r * pos_scale), -32767, 32767).astype(np.int16)
        nz = np.where(np.any(qd != 0, axis=1))[0].astype(np.uint16)
        if len(nz) > 0:
            morphs[mk] = (nz, qd[nz])

    out = {
        "name": name,
        "vcount": int(len(r_pos)),
        "icount": int(len(iidx)),
        "pos": quantize_pos(r_pos, pos_scale),
        "norm_oct": encode_octahedral_normals(r_norm),
        "uv": quantize_uv(iuv),
        "joints": r_j,
        "weights": r_w,
        "indices": iidx,
        "morphs": morphs,
        "_pos_f32": r_pos,
        "_norm_f32": r_norm,
    }
    if is_hair:
        hc = np.array([0.0, 1.548, 0.020], dtype=np.float32)
        rel = r_pos - hc
        tuck_delta = np.zeros_like(r_pos)
        crown_mask = np.zeros(len(r_pos), dtype=np.uint8)
        for vi in range(len(r_pos)):
            y, z = r_pos[vi, 1], r_pos[vi, 2]
            rx, ry, rz = rel[vi, 0], rel[vi, 1], rel[vi, 2]
            r = math.sqrt(rx*rx + ry*ry*0.92 + rz*rz*0.86) + 1e-6
            if y > 1.595 or (y > 1.495 and z < 0.025):
                crown_mask[vi] = 255
                tuck_delta[vi] = -np.array([rx/r, ry/r, rz/r]) * 0.024
            else:
                crown_mask[vi] = 0
                tuck_delta[vi] = -np.array([rx/r, 0.0, rz/r]) * 0.005
        out["hair_tuck_delta"] = quantize_pos(tuck_delta, pos_scale)
        out["hair_crown_mask"] = crown_mask
    return out

def synthesize_expression_morphs(pos, pos_scale=10000.0):
    morphs = {}
    smirk = np.zeros_like(pos)
    c_l = np.array([0.026, 1.474, 0.136], dtype=np.float32)
    d_l = np.linalg.norm(pos - c_l, axis=1)
    w_l = np.exp(-(d_l / 0.022) ** 2) * (pos[:, 1] > 1.43) * (pos[:, 2] > 0.10)
    smirk[:, 0] += w_l * 0.0045
    smirk[:, 1] += w_l * 0.0065
    smirk[:, 2] -= w_l * 0.0025
    ck_l = np.array([0.036, 1.495, 0.128], dtype=np.float32)
    w_ck = np.exp(-(np.linalg.norm(pos - ck_l, axis=1) / 0.024) ** 2) * (pos[:, 2] > 0.10)
    smirk[:, 1] += w_ck * 0.0032
    smirk[:, 2] += w_ck * 0.0020
    qd = np.clip(np.round(smirk * pos_scale), -32767, 32767).astype(np.int16)
    nz = np.where(np.any(qd != 0, axis=1))[0].astype(np.uint16)
    morphs["expr_smirk"] = (nz, qd[nz])

    jaw = np.zeros_like(pos)
    piv = np.array([0.0, 1.495, 0.045], dtype=np.float32)
    lower_lip_mask = np.clip((1.474 - pos[:, 1]) / 0.018, 0.0, 1.0) * np.clip((pos[:, 1] - 1.375) / 0.035, 0.0, 1.0) * np.clip((pos[:, 2] - 0.04) / 0.04, 0.0, 1.0)
    theta = -0.22 * lower_lip_mask
    ry = pos[:, 1] - piv[1]; rz = pos[:, 2] - piv[2]
    jaw[:, 1] = (piv[1] + ry * np.cos(theta) - rz * np.sin(theta)) - pos[:, 1]
    jaw[:, 2] = (piv[2] + ry * np.sin(theta) + rz * np.cos(theta)) - pos[:, 2]
    qd2 = np.clip(np.round(jaw * pos_scale), -32767, 32767).astype(np.int16)
    nz2 = np.where(np.any(qd2 != 0, axis=1))[0].astype(np.uint16)
    morphs["expr_jaw_open"] = (nz2, qd2[nz2])

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
    tris = indices.reshape(-1, 3)
    dom_j = joints[np.arange(len(joints)), np.argmax(weights, axis=1)]
    region = np.zeros(len(pos), dtype=np.int32)
    region[(dom_j == 43) | (dom_j == 44)] = 1
    region[(dom_j >= 5) & (dom_j <= 23)] = 2
    region[(dom_j >= 24) & (dom_j <= 42)] = 3
    region[(dom_j >= 45) & (dom_j <= 48)] = 4
    region[(dom_j >= 49) & (dom_j <= 52)] = 5

    head_mask = (region == 1) | (pos[:, 1] > 1.38)
    grid_pts = pos / target_cell_size
    grid_pts[head_mask] = (pos[head_mask] - np.array([0, 1.38, 0])) / (target_cell_size * 0.72) + np.array([0, 1.38 / target_cell_size, 0])
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
            gi = len(groups); cell_map[k] = gi; groups.append([vi])
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
        new_norm[gi] = nsum / max(np.linalg.norm(nsum), 1e-6)
        new_uv[gi] = uv[arr[0]]
        new_joints[gi] = joints[arr[0]]
        new_weights[gi] = weights[arr[0]]

    new_tris, seen = [], set()
    for a, b, c in tris:
        na, nb, nc = int(v_to_new[a]), int(v_to_new[b]), int(v_to_new[c])
        if na == nb or nb == nc or na == nc: continue
        key = tuple(sorted((na, nb, nc)))
        if key in seen: continue
        orig_n = np.cross(pos[b] - pos[a], pos[c] - pos[a])
        new_n = np.cross(new_pos[nb] - new_pos[na], new_pos[nc] - new_pos[na])
        if np.linalg.norm(new_n) < 1e-10: continue
        new_tris.append((na, nc, nb) if np.dot(orig_n, new_n) < 0 else (na, nb, nc))
        seen.add(key)

    new_idx = np.array(new_tris, dtype=np.uint16).reshape(-1)
    return {
        "vcount": n_verts, "icount": len(new_idx),
        "pos": quantize_pos(new_pos), "norm_oct": encode_octahedral_normals(new_norm),
        "uv": quantize_uv(new_uv), "joints": new_joints, "weights": new_weights, "indices": new_idx
    }

def build_custom_hard_surface_meshes(body_pos, body_norm, body_joints, body_weights, dense_kb_morphs=None, pos_scale=10000.0):
    """Build articulated tactical armor, contoured kneepads, helmet, carbine, watch/gauntlet,
    morph-tracked skeletons, true 3D multi-part cybernetic prosthetics, & facial piercings."""
    meshes = {}
    body_tree = cKDTree(body_pos)

    def nearest_skin(pts):
        _, nn = body_tree.query(pts)
        return body_joints[nn], body_weights[nn]

    def copy_nearest_morphs(verts, target_keys=None):
        if not dense_kb_morphs:
            return {}
        _, nn = body_tree.query(verts)
        out_m = {}
        keys = target_keys or list(dense_kb_morphs.keys())
        for mk in keys:
            arr = dense_kb_morphs.get(mk)
            if arr is None:
                continue
            md = arr[nn]
            qd = np.clip(np.round(md * pos_scale), -32767, 32767).astype(np.int16)
            nz = np.where(np.any(qd != 0, axis=1))[0].astype(np.uint16)
            if len(nz) > 0:
                out_m[mk] = (nz, qd[nz])
        return out_m

    def make_loft_shell(ring_list, closed_caps=True, uv_scale=(1.0, 1.0)):
        verts, uvs = [], []
        n_rings = len(ring_list)
        n_seg = len(ring_list[0])
        for ri, ring in enumerate(ring_list):
            v_coord = (ri / max(n_rings - 1, 1)) * uv_scale[1]
            for si, p in enumerate(ring):
                verts.append(p)
                uvs.append([(si / max(n_seg, 1)) * uv_scale[0], v_coord])
        tris = []
        for ri in range(n_rings - 1):
            for si in range(n_seg):
                ns = (si + 1) % n_seg
                a = ri * n_seg + si; b = ri * n_seg + ns
                c = (ri + 1) * n_seg + ns; d = (ri + 1) * n_seg + si
                tris.extend([a, b, c, a, c, d])
        if closed_caps:
            b_ctr = len(verts); verts.append(np.mean(ring_list[0], axis=0)); uvs.append([0.5, 0.0])
            for si in range(n_seg):
                ns = (si + 1) % n_seg; tris.extend([b_ctr, ns, si])
            t_ctr = len(verts); verts.append(np.mean(ring_list[-1], axis=0)); uvs.append([0.5, 1.0])
            tb = (n_rings - 1) * n_seg
            for si in range(n_seg):
                ns = (si + 1) % n_seg; tris.extend([t_ctr, tb + si, tb + ns])
        verts_arr = np.array(verts, dtype=np.float32)
        tris_arr = np.array(tris, dtype=np.uint16)
        if closed_caps and len(tris_arr) >= 3:
            t3 = tris_arr.reshape(-1, 3)
            v0, v1, v2 = verts_arr[t3[:, 0]], verts_arr[t3[:, 1]], verts_arr[t3[:, 2]]
            vol6 = float(np.sum(v0[:,0]*(v1[:,1]*v2[:,2]-v1[:,2]*v2[:,1]) - v0[:,1]*(v1[:,0]*v2[:,2]-v1[:,2]*v2[:,0]) + v0[:,2]*(v1[:,0]*v2[:,1]-v1[:,1]*v2[:,0])))
            if vol6 < 0.0:
                t3 = t3[:, [0, 2, 1]]
                tris_arr = t3.reshape(-1)
        norms_arr = compute_vertex_normals(verts_arr, tris_arr)
        return verts_arr, norms_arr, np.array(uvs, dtype=np.float32), tris_arr

    def make_beveled_box(cx, cy, cz, hx, hy, hz, bevel=0.004, bone_idx=None):
        pts_base = [
            (-hx + bevel, -hz), (hx - bevel, -hz), (hx, -hz + bevel), (hx, hz - bevel),
            (hx - bevel, hz), (-hx + bevel, hz), (-hx, hz - bevel), (-hx, -hz - bevel)
        ]
        # Clean symmetric octagon profile
        pts_base = [
            (-hx + bevel, -hz), (hx - bevel, -hz), (hx, -hz + bevel), (hx, hz - bevel),
            (hx - bevel, hz), (-hx + bevel, hz), (-hx, hz - bevel), (-hx, -hz + bevel)
        ]
        rings = []
        for dy, shrink in [(-hy, 1.0 - bevel / max(hx, hz, 0.01)), (-hy + bevel, 1.0), (hy - bevel, 1.0), (hy, 1.0 - bevel / max(hx, hz, 0.01))]:
            rings.append([np.array([cx + x * shrink, cy + dy, cz + z * shrink], dtype=np.float32) for x, z in pts_base])
        v, n, u, idx = make_loft_shell(rings, closed_caps=True)
        if bone_idx is not None:
            j = np.zeros((len(v), 4), dtype=np.uint8); j[:, 0] = bone_idx
            w = np.zeros((len(v), 4), dtype=np.uint8); w[:, 0] = 255
        else:
            j, w = nearest_skin(v)
        return v, n, u, idx, j, w

    def combine_parts(parts_list, morphs_from_skin=False):
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
        res = {
            "vcount": len(v), "icount": len(idx),
            "pos": quantize_pos(v), "norm_oct": encode_octahedral_normals(n),
            "uv": quantize_uv(u), "joints": j, "weights": w, "indices": idx
        }
        if morphs_from_skin:
            res["morphs"] = copy_nearest_morphs(v)
        return res

    def make_limb_tube(p0, p1, r0, r1, bone_idx, n_seg=10, waist_scale=0.68):
        p0 = np.array(p0, dtype=np.float32); p1 = np.array(p1, dtype=np.float32)
        d = p1 - p0; dl = float(np.linalg.norm(d))
        ax = d / max(dl, 1e-5)
        ref = np.array([0.0, 1.0, 0.0], dtype=np.float32) if abs(ax[1]) < 0.92 else np.array([1.0, 0.0, 0.0], dtype=np.float32)
        u = np.cross(ref, ax); u /= max(float(np.linalg.norm(u)), 1e-5)
        v = np.cross(ax, u)
        rings = []
        for t, r in [(0.0, r0*0.92), (0.16, r0), (0.50, (r0+r1)*0.5*waist_scale), (0.84, r1), (1.0, r1*0.92)]:
            c = p0 * (1.0 - t) + p1 * t
            ring = [c + (math.cos(2.0*math.pi*si/n_seg) * u + math.sin(2.0*math.pi*si/n_seg) * v) * r for si in range(n_seg)]
            rings.append(ring)
        va, na, ua, ia = make_loft_shell(rings, closed_caps=True)
        if bone_idx is not None:
            ja = np.zeros((len(va), 4), dtype=np.uint8); ja[:, 0] = bone_idx
            wa = np.zeros((len(va), 4), dtype=np.uint8); wa[:, 0] = 255
        else:
            ja, wa = nearest_skin(va)
        return va, na, ua, ia, ja, wa

    def make_joint_sphere(c, rx, ry, rz, bone_idx, seg=10):
        c = np.array(c, dtype=np.float32)
        rings = []
        for ri in range(6):
            phi = -math.pi * 0.44 + (math.pi * 0.88) * (ri / 5.0)
            cp, sp = math.cos(phi), math.sin(phi)
            ring = [c + np.array([math.cos(2.0*math.pi*si/seg)*cp*rx, sp*ry, math.sin(2.0*math.pi*si/seg)*cp*rz], dtype=np.float32) for si in range(seg)]
            rings.append(ring)
        va, na, ua, ia = make_loft_shell(rings, closed_caps=True)
        if bone_idx is not None:
            ja = np.zeros((len(va), 4), dtype=np.uint8); ja[:, 0] = bone_idx
            wa = np.zeros((len(va), 4), dtype=np.uint8); wa[:, 0] = 255
        else:
            ja, wa = nearest_skin(va)
        return va, na, ua, ia, ja, wa

    def make_curved_armor_shield(p0, p1, rx, rz, arc_start, arc_end, thick=0.011, bone_idx=None, n_seg=10):
        """Build a curved, contoured anatomical armor plate wrapping cleanly around a limb axis."""
        p0 = np.array(p0, dtype=np.float32); p1 = np.array(p1, dtype=np.float32)
        d = p1 - p0; dl = float(np.linalg.norm(d))
        ax = d / max(dl, 1e-5)
        ref = np.array([0.0, 1.0, 0.0], dtype=np.float32) if abs(ax[1]) < 0.90 else np.array([0.0, 0.0, 1.0], dtype=np.float32)
        u = np.cross(ref, ax); u /= max(float(np.linalg.norm(u)), 1e-5)
        v = np.cross(ax, u)
        rings = []
        for t, s_r in [(0.0, 0.86), (0.20, 1.00), (0.55, 1.03), (0.85, 0.98), (1.0, 0.84)]:
            c = p0 * (1.0 - t) + p1 * t
            ring = []
            for si in range(n_seg):
                a = arc_start + (arc_end - arc_start) * (si / (n_seg - 1))
                ring.append(c + (math.cos(a) * u * rx * s_r) + (math.sin(a) * v * rz * s_r))
            for si in range(n_seg - 1, -1, -1):
                a = arc_start + (arc_end - arc_start) * (si / (n_seg - 1))
                ring.append(c + (math.cos(a) * u * max(0.005, rx * s_r - thick)) + (math.sin(a) * v * max(0.005, rz * s_r - thick)))
            rings.append(ring)
        va, na, ua, ia = make_loft_shell(rings, closed_caps=True)
        if bone_idx is not None:
            ja = np.zeros((len(va), 4), dtype=np.uint8); ja[:, 0] = bone_idx
            wa = np.zeros((len(va), 4), dtype=np.uint8); wa[:, 0] = 255
        else:
            ja, wa = nearest_skin(va)
        return va, na, ua, ia, ja, wa

    # 1. TACTICAL CHEST PLATE CARRIER + MOLLE RIG + PAULDRONS + CONTOURED KNEE CUPS
    cuirass_parts = []
    chest_rings = []
    for y, rx, rz_f, rz_b in [
        (1.035, 0.184, 0.158, 0.135),
        (1.130, 0.194, 0.176, 0.144),
        (1.240, 0.206, 0.190, 0.154),
        (1.320, 0.190, 0.165, 0.140),
        (1.368, 0.128, 0.108, 0.106),
    ]:
        ring = []
        for si in range(24):
            a = 2.0 * math.pi * si / 24.0
            ca, sa = math.sin(a), math.cos(a)
            rz = rz_f if sa >= 0 else rz_b
            crest = 0.016 * max(0.0, 1.0 - abs(ca) * 2.4) if sa > 0.3 else 0.0
            ring.append(np.array([ca * rx, y, sa * (rz + crest) + 0.012], dtype=np.float32))
        chest_rings.append(ring)
    v_c, n_c, u_c, i_c = make_loft_shell(chest_rings, closed_caps=False)
    j_c, w_c = nearest_skin(v_c)
    cuirass_parts.append((v_c, n_c, u_c, i_c, j_c, w_c))
    # Front plate insert + 3 triple-mag MOLLE pouches + shoulder harness + rear comms pack
    cuirass_parts.append(make_beveled_box(0.0, 1.245, 0.212, 0.086, 0.068, 0.014, 0.006, bone_idx=4))
    for px in (-0.050, 0.0, 0.050):
        cuirass_parts.append(make_beveled_box(px, 1.115, 0.196, 0.022, 0.044, 0.016, 0.004, bone_idx=3))
    cuirass_parts.append(make_beveled_box(-0.092, 1.352, 0.032, 0.028, 0.024, 0.082, 0.005, bone_idx=24))
    cuirass_parts.append(make_beveled_box( 0.092, 1.352, 0.032, 0.028, 0.024, 0.082, 0.005, bone_idx=5))
    cuirass_parts.append(make_beveled_box(0.0, 1.225, -0.156, 0.094, 0.112, 0.032, 0.007, bone_idx=4))
    meshes["armor_cuirass"] = combine_parts(cuirass_parts, morphs_from_skin=True)

    paul_parts = []
    for side, bx, bone_i in [(-1, -0.224, 25), (1, 0.224, 6)]:
        prings = []
        for dy, rad in [(-0.075, 0.074), (-0.022, 0.084), (0.032, 0.074), (0.068, 0.048)]:
            ring = []
            for si in range(12):
                a = math.pi * (si / 11.0 - 0.5) * 1.48
                ring.append(np.array([bx + side * math.cos(a) * rad * 0.72, 1.318 + dy, 0.018 + math.sin(a) * rad * 1.05], dtype=np.float32))
            for si in range(11, -1, -1):
                a = math.pi * (si / 11.0 - 0.5) * 1.48
                ring.append(np.array([bx + side * (math.cos(a) * rad * 0.72 - 0.012), 1.318 + dy, 0.018 + math.sin(a) * (rad * 1.05 - 0.010)], dtype=np.float32))
            prings.append(ring)
        vp, np_, up, ip = make_loft_shell(prings, closed_caps=True)
        jp = np.zeros((len(vp), 4), dtype=np.uint8); jp[:, 0] = bone_i
        wp = np.zeros((len(vp), 4), dtype=np.uint8); wp[:, 0] = 255
        paul_parts.append((vp, np_, up, ip, jp, wp))
    meshes["armor_pauldrons"] = combine_parts(paul_parts, morphs_from_skin=True)

    belt_parts = []
    belt_rings = []
    for dy, scale in [(-0.024, 0.99), (-0.011, 1.02), (0.011, 1.02), (0.024, 0.99)]:
        belt_rings.append([np.array([math.sin(2.0*math.pi*si/20.0)*0.178*scale, 0.935+dy, math.cos(2.0*math.pi*si/20.0)*0.128*scale + 0.022], dtype=np.float32) for si in range(20)])
    vb, nb, ub, ib = make_loft_shell(belt_rings, closed_caps=False)
    jb, wb = nearest_skin(vb)
    belt_parts.append((vb, nb, ub, ib, jb, wb))
    belt_parts.append(make_beveled_box(0.0, 0.935, 0.152, 0.032, 0.024, 0.012, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box(-0.184, 0.930, 0.022, 0.020, 0.032, 0.028, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box( 0.184, 0.930, 0.022, 0.020, 0.032, 0.028, 0.004, bone_idx=1))
    belt_parts.append(make_beveled_box(-0.184, 0.916,-0.045, 0.022, 0.034, 0.030, 0.004, bone_idx=1))
    # Contoured cylindrical tactical knee-caps + retention straps (hug curved knees naturally!)
    for sgn in (1.0, -1.0):
        kx = sgn * 0.144
        kz = 0.038
        belt_parts.append(make_curved_armor_shield((kx, 0.428, kz), (kx, 0.514, kz), 0.068, 0.072, -math.pi*0.36, math.pi*0.36, thick=0.010, bone_idx=None, n_seg=10))
        belt_parts.append(make_limb_tube((kx, 0.448, kz+0.004), (kx, 0.458, kz+0.004), 0.064, 0.064, None, 14, 1.0))
        belt_parts.append(make_limb_tube((kx, 0.492, kz+0.004), (kx, 0.502, kz+0.004), 0.064, 0.064, None, 14, 1.0))
    meshes["armor_belt_knees"] = combine_parts(belt_parts, morphs_from_skin=True)

    # 2. WRIST WATCH & GAUNTLET (snug around forearm t=0.78 [0.423, 1.047, 0.140], morph-tracked!)
    p_lo = np.array([0.331, 1.140, 0.020], dtype=np.float32)
    p_ha = np.array([0.453, 1.016, 0.183], dtype=np.float32)
    ax_arm = p_ha - p_lo; ax_arm /= max(float(np.linalg.norm(ax_arm)), 1e-5)
    u_arm = np.cross(np.array([0.0, 1.0, 0.0], dtype=np.float32), ax_arm); u_arm /= max(float(np.linalg.norm(u_arm)), 1e-5)
    v_arm = np.cross(ax_arm, u_arm)
    wrist_c = np.array([0.423, 1.047, 0.140], dtype=np.float32)

    w_band = []
    for dt in (-0.012, 0.0, 0.012):
        c = wrist_c + ax_arm * dt
        w_band.append([c + (math.cos(2.0*math.pi*si/14.0) * u_arm * 0.030) + (math.sin(2.0*math.pi*si/14.0) * v_arm * 0.027) for si in range(14)])
    vwb, nwb, uwb, iwb = make_loft_shell(w_band, closed_caps=False)
    jwb = np.zeros((len(vwb), 4), dtype=np.uint8); jwb[:, 0] = 7
    wwb = np.zeros((len(vwb), 4), dtype=np.uint8); wwb[:, 0] = 255
    dial_c = wrist_c + v_arm * 0.026
    meshes["wrist_watch"] = combine_parts([
        (vwb, nwb, uwb, iwb, jwb, wwb),
        make_beveled_box(dial_c[0], dial_c[1], dial_c[2], 0.013, 0.005, 0.014, 0.002, bone_idx=7)
    ], morphs_from_skin=True)

    grings = []
    for t, ru, rv in [(0.18, 0.044, 0.040), (0.48, 0.039, 0.035), (0.76, 0.034, 0.030), (0.90, 0.032, 0.028)]:
        c = p_lo * (1.0 - t) + p_ha * t
        grings.append([c + (math.cos(2.0*math.pi*si/14.0) * u_arm * ru) + (math.sin(2.0*math.pi*si/14.0) * v_arm * rv) for si in range(14)])
    vg, ng, ug, ig = make_loft_shell(grings, closed_caps=False)
    jg = np.zeros((len(vg), 4), dtype=np.uint8); jg[:, 0] = 7
    wg = np.zeros((len(vg), 4), dtype=np.uint8); wg[:, 0] = 255
    g_box_c = wrist_c + v_arm * 0.028 - ax_arm * 0.020
    meshes["wrist_gauntlet"] = combine_parts([
        (vg, ng, ug, ig, jg, wg),
        make_beveled_box(g_box_c[0], g_box_c[1], g_box_c[2], 0.022, 0.010, 0.028, 0.004, bone_idx=7)
    ], morphs_from_skin=True)

    # 3. 3-MODE COMBAT HELMET + VISORS + CARBINE
    h_parts = []
    n_s, n_r = 32, 9
    outer_rings, inner_rings = [], []
    hc = np.array([0.0, 1.580, 0.038], dtype=np.float32)
    def _helm_rim_y(ang):
        ca = math.cos(ang)
        if ca >= 0.45: return 1.602 + 0.006 * (1.0 - (ca - 0.45) / 0.55)
        elif ca >= -0.35:
            t = (0.45 - ca) / 0.80
            return 1.608 - 0.078 * (t * t * (3.0 - 2.0 * t))
        else:
            t = (-0.35 - ca) / 0.65
            return 1.530 - 0.052 * (t * t * (3.0 - 2.0 * t))
    for ri in range(n_r):
        v_t = ri / (n_r - 1)
        if v_t < 0.35:
            st = v_t / 0.35
            rx = 0.122 + 0.002 * math.sin(st * math.pi)
            rz = 0.148 + 0.002 * math.sin(st * math.pi)
            zoff = 0.026 + 0.012 * st
        else:
            dt = (v_t - 0.35) / 0.65; arch = math.cos(dt * math.pi * 0.44)
            rx = 0.032 + 0.090 * arch; rz = 0.042 + 0.106 * arch
            zoff = 0.038 + 0.004 * math.sin(dt * math.pi) - 0.004 * dt
        o_ring, i_ring = [], []
        for si in range(n_s):
            ang = 2.0 * math.pi * (si / n_s)
            y_bot = _helm_rim_y(ang)
            y = y_bot + (1.728 - y_bot) * (v_t ** 0.86)
            p_out = np.array([math.sin(ang) * rx, y, math.cos(ang) * rz + zoff], dtype=np.float32)
            o_ring.append(p_out)
            din = hc - p_out
            i_ring.append(p_out + (din / (np.linalg.norm(din) + 1e-6)) * 0.007)
        outer_rings.append(o_ring); inner_rings.append(i_ring)
    verts_h, tris_h, uvs_h = [], [], []
    for ri in range(n_r):
        for si in range(n_s):
            verts_h.append(outer_rings[ri][si]); uvs_h.append([si / n_s, ri / (n_r - 1)])
    in_off = len(verts_h)
    for ri in range(n_r):
        for si in range(n_s):
            verts_h.append(inner_rings[ri][si]); uvs_h.append([si / n_s, ri / (n_r - 1)])
    for ri in range(n_r - 1):
        for si in range(n_s):
            ns = (si + 1) % n_s
            a, b, c, d = ri*n_s+si, ri*n_s+ns, (ri+1)*n_s+ns, (ri+1)*n_s+si
            tris_h.extend([a, b, c, a, c, d, in_off+a, in_off+c, in_off+b, in_off+a, in_off+d, in_off+c])
    for si in range(n_s):
        ns = (si + 1) % n_s
        tris_h.extend([si, in_off+si, in_off+ns, si, in_off+ns, ns])
    tc_out = len(verts_h); verts_h.append(np.array([0.0, 1.734, 0.034], dtype=np.float32)); uvs_h.append([0.5, 1.0])
    tc_in  = len(verts_h); verts_h.append(np.array([0.0, 1.727, 0.034], dtype=np.float32)); uvs_h.append([0.5, 1.0])
    top_base = (n_r - 1) * n_s
    for si in range(n_s):
        ns = (si + 1) % n_s
        tris_h.extend([tc_out, top_base + si, top_base + ns, tc_in, in_off + top_base + ns, in_off + top_base + si])
    vh = np.array(verts_h, dtype=np.float32); ih = np.array(tris_h, dtype=np.uint16)
    jh = np.zeros((len(vh), 4), dtype=np.uint8); jh[:, 0] = 44
    wh = np.zeros((len(vh), 4), dtype=np.uint8); wh[:, 0] = 255
    h_parts.append((vh, compute_vertex_normals(vh, ih), np.array(uvs_h, dtype=np.float32), ih, jh, wh))
    h_parts.append(make_beveled_box(0.0, 1.622, 0.172, 0.018, 0.014, 0.009, 0.003, bone_idx=44))  # NVG shroud
    h_parts.append(make_beveled_box(-0.125, 1.568, 0.022, 0.009, 0.018, 0.032, 0.004, bone_idx=44))
    h_parts.append(make_beveled_box( 0.125, 1.568, 0.022, 0.009, 0.018, 0.032, 0.004, bone_idx=44))
    h_parts.append(make_beveled_box( 0.130, 1.606, 0.014, 0.004, 0.034, 0.006, 0.002, bone_idx=44))
    meshes["helmet_shell"] = combine_parts(h_parts)

    hv_rings = []
    for y, rz, rx in [(1.556, 0.144, 0.092), (1.576, 0.152, 0.098), (1.598, 0.150, 0.098), (1.612, 0.140, 0.092)]:
        ring = []
        for si in range(13):
            a = -0.76 + 1.52 * (si / 12.0)
            na = 0.012 * math.exp(-(a / 0.24)**2) if y < 1.570 else 0.0
            ring.append(np.array([math.sin(a)*rx, y + na, math.cos(a)*rz + 0.020], dtype=np.float32))
        for si in range(12, -1, -1):
            a = -0.76 + 1.52 * (si / 12.0)
            na = 0.012 * math.exp(-(a / 0.24)**2) if y < 1.570 else 0.0
            ring.append(np.array([math.sin(a)*(rx-0.004), y + na, math.cos(a)*(rz-0.004) + 0.020], dtype=np.float32))
        hv_rings.append(ring)
    vhv, nhv, uhv, ihv = make_loft_shell(hv_rings, closed_caps=True)
    jhv = np.zeros((len(vhv), 4), dtype=np.uint8); jhv[:, 0] = 44; whv = np.zeros((len(vhv), 4), dtype=np.uint8); whv[:, 0] = 255
    meshes["helmet_half_visor"] = combine_parts([(vhv, nhv, uhv, ihv, jhv, whv)])

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
    jsv = np.zeros((len(vsv), 4), dtype=np.uint8); jsv[:, 0] = 44; wsv = np.zeros((len(vsv), 4), dtype=np.uint8); wsv[:, 0] = 255
    meshes["helmet_sealed_visor"] = combine_parts([(vsv, nsv, usv, isv, jsv, wsv)])

    # Sleek Tactical Carbine (cylindrical barrel + M-LOK shroud + curved mag + red dot optic + stock)
    rifle_parts = [
        make_beveled_box(0.0, 0.044, 0.036, 0.019, 0.032, 0.152, 0.005, bone_idx=0),
        make_limb_tube((0.0, 0.050, 0.180), (0.0, 0.050, 0.395), 0.022, 0.021, 0, 8, 1.0),
        make_limb_tube((0.0, 0.052, 0.390), (0.0, 0.052, 0.545), 0.009, 0.009, 0, 8, 1.0),
        make_limb_tube((0.0, 0.052, 0.515), (0.0, 0.052, 0.560), 0.013, 0.012, 0, 8, 1.0),  # flash suppressor
        make_beveled_box(0.0, 0.090, 0.058, 0.016, 0.020, 0.045, 0.004, bone_idx=0),
        make_beveled_box(0.0,-0.015, 0.000, 0.015, 0.050, 0.021, 0.004, bone_idx=0),
        make_beveled_box(0.0,-0.045, 0.102, 0.014, 0.068, 0.026, 0.004, bone_idx=0),
        make_beveled_box(0.0, 0.014, 0.250, 0.013, 0.028, 0.018, 0.004, bone_idx=0),
        make_beveled_box(0.0, 0.032,-0.205, 0.016, 0.048, 0.105, 0.005, bone_idx=0),
    ]
    meshes["carbine_rifle"] = combine_parts(rifle_parts)

    # 4. MODULAR ANATOMICAL SKELETON / ANDROID CHASSIS (6 modules, morph-tracked so shoulders/hips stay flush!)
    sk_head = []
    cran_rings = []
    for y, rx, rz, zc in [(1.505,0.056,0.072,0.015),(1.545,0.072,0.088,0.032),(1.592,0.078,0.095,0.036),(1.640,0.074,0.090,0.030),(1.680,0.054,0.068,0.022),(1.702,0.025,0.034,0.016)]:
        ring = []
        for si in range(14):
            a = 2.0 * math.pi * si / 14.0; ca, sa = math.sin(a), math.cos(a)
            od = 0.016 * math.exp(-((abs(ca) - 0.34) / 0.18)**2) if (1.55 < y < 1.605 and sa > 0.35) else 0.0
            ring.append(np.array([ca * rx, y, sa * (rz - od) + zc], dtype=np.float32))
        cran_rings.append(ring)
    vc, nc, uc, ic = make_loft_shell(cran_rings, closed_caps=True)
    jc = np.zeros((len(vc), 4), dtype=np.uint8); jc[:, 0] = 44; wc = np.zeros((len(vc), 4), dtype=np.uint8); wc[:, 0] = 255
    sk_head.append((vc, nc, uc, ic, jc, wc))
    sk_head.append(make_beveled_box(0.0, 1.505, 0.092, 0.026, 0.018, 0.024, 0.005, bone_idx=44))
    sk_head.append(make_beveled_box(0.0, 1.442, 0.088, 0.034, 0.016, 0.026, 0.005, bone_idx=44))
    sk_head.append(make_limb_tube((-0.056, 1.495, 0.048), (-0.034, 1.444, 0.086), 0.011, 0.009, 44, 6))
    sk_head.append(make_limb_tube(( 0.056, 1.495, 0.048), ( 0.034, 1.444, 0.086), 0.011, 0.009, 44, 6))
    sk_head.append(make_joint_sphere((-0.031, 1.584, 0.098), 0.014, 0.012, 0.012, 44))
    sk_head.append(make_joint_sphere(( 0.031, 1.584, 0.098), 0.014, 0.012, 0.012, 44))
    for vy in (1.425, 1.455, 1.485):
        sk_head.append(make_joint_sphere((0.0, vy, 0.012), 0.026, 0.012, 0.024, 43))
    sk_head.append(make_limb_tube((0.0, 1.385, 0.014), (0.0, 1.422, 0.014), 0.052, 0.042, 43, 12))
    meshes["skel_head"] = combine_parts(sk_head, morphs_from_skin=True)

    sk_torso = []
    for vy, bi in [(0.91,1),(0.955,2),(1.00,2),(1.045,3),(1.095,3),(1.155,4),(1.220,4),(1.285,4),(1.350,4)]:
        sk_torso.append(make_joint_sphere((0.0, vy, -0.015), 0.028, 0.018, 0.026, bi))
    sk_torso.append(make_beveled_box(0.0, 1.245, 0.096, 0.030, 0.092, 0.018, 0.006, bone_idx=4))
    sk_torso.append(make_beveled_box(0.0, 1.240,-0.045, 0.026, 0.115, 0.018, 0.005, bone_idx=4))
    for ry, rw, rd, bi in [(1.33,0.120,0.088,4),(1.29,0.136,0.100,4),(1.24,0.144,0.106,4),(1.19,0.140,0.102,4),(1.14,0.128,0.094,3),(1.09,0.110,0.082,3)]:
        for sgn in (-1.0, 1.0):
            sk_torso.append(make_limb_tube((sgn*0.024, ry+0.014, -0.020), (sgn*rw, ry, 0.026), 0.010, 0.011, bi, 6))
            sk_torso.append(make_limb_tube((sgn*rw, ry, 0.026), (sgn*0.028, ry-0.014, rd), 0.011, 0.009, bi, 6))
    sk_torso.append(make_limb_tube((0.022, 1.345, 0.032), (0.168, 1.322, 0.020), 0.014, 0.015, 5, 6))
    sk_torso.append(make_limb_tube((-0.022, 1.345, 0.032), (-0.168, 1.322, 0.020), 0.014, 0.015, 24, 6))
    sk_torso.append(make_beveled_box(0.0, 0.875, 0.012, 0.102, 0.042, 0.054, 0.012, bone_idx=1))
    sk_torso.append(make_limb_tube((-0.085, 0.905, 0.018), (-0.102, 0.866, 0.006), 0.026, 0.022, 1, 8))
    sk_torso.append(make_limb_tube(( 0.085, 0.905, 0.018), ( 0.102, 0.866, 0.006), 0.026, 0.022, 1, 8))
    meshes["skel_torso"] = combine_parts(sk_torso, morphs_from_skin=True)

    for side, sgn, b_cl, b_up, b_lo, b_ha, f_base in [("l", 1.0, 5, 6, 7, 8, 9), ("r", -1.0, 24, 25, 26, 27, 28)]:
        p_in = (sgn * 0.098, 1.312, 0.008)  # Deep medial clavicle anchor so never floats on slim builds!
        p_sh = (sgn * 0.168, 1.314, 0.019)
        p_el = (sgn * 0.331, 1.140, 0.020)
        p_wr = (sgn * 0.453, 1.016, 0.183)
        p_kn = (sgn * 0.486, 0.968, 0.252)
        arm_parts = [
            make_limb_tube(p_in, p_sh, 0.046, 0.044, b_cl, 12, 0.96),
            make_joint_sphere(p_sh, 0.046, 0.046, 0.046, b_up, 12),
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
        meshes[f"skel_arm_{side}"] = combine_parts(arm_parts, morphs_from_skin=True)

    for side, sgn, b_th, b_ca, b_ft, b_bl in [("l", 1.0, 45, 46, 47, 48), ("r", -1.0, 49, 50, 51, 52)]:
        p_pel= (sgn * 0.068, 0.908, 0.008)
        p_hp = (sgn * 0.102, 0.866, 0.005)
        p_kn = (sgn * 0.143, 0.474, 0.037)
        p_ak = (sgn * 0.181, 0.069, 0.022)
        p_bl = (sgn * 0.186, 0.022, 0.145)
        leg_parts = [
            make_limb_tube(p_pel, p_hp, 0.062, 0.048, 1, 10, 0.95),
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
        meshes[f"skel_leg_{side}"] = combine_parts(leg_parts, morphs_from_skin=True)

    # 5. TRUE SCULPTED 3D CYBERNETIC PROSTHETIC ASSEMBLIES (6 modules — NO dots on flesh!)
    # Multi-layered mechanical prosthetics: carbon inner core + segmented curved titanium armor shells + servo gimbal joints + twin actuators + flush surgical socket rings!
    # 5A. cyber_arm_l & cyber_arm_r
    for side, sgn, b_cl, b_up, b_lo, b_ha, f_base in [("l", 1.0, 5, 6, 7, 8, 9), ("r", -1.0, 24, 25, 26, 27, 28)]:
        p_in = (sgn * 0.105, 1.312, 0.010)
        p_sh = (sgn * 0.168, 1.316, 0.019)
        p_el = (sgn * 0.331, 1.140, 0.020)
        p_wr = (sgn * 0.453, 1.016, 0.183)
        p_kn = (sgn * 0.486, 0.968, 0.252)
        c_arm = [
            # Biocompatible flush socket collar seated into biological deltoid
            make_limb_tube(p_in, p_sh, 0.056, 0.054, b_cl, 14, 0.96),
            make_joint_sphere(p_sh, 0.052, 0.052, 0.052, b_up, 12),
            # Curved deltoid & bicep segmented outer titanium armor shells
            make_curved_armor_shield((p_sh[0], p_sh[1]+0.01, p_sh[2]), (p_sh[0]+sgn*0.06, p_sh[1]-0.075, p_sh[2]), 0.054, 0.052, -math.pi*0.48, math.pi*0.48, 0.010, b_up, 10),
            # Recessed carbon humerus shaft + twin parallel hydraulic pistons
            make_limb_tube(p_sh, p_el, 0.038, 0.032, b_up, 12, 0.85),
            make_limb_tube((p_sh[0]-sgn*0.020, p_sh[1]-0.02, p_sh[2]+0.026), (p_el[0]-sgn*0.014, p_el[1]+0.02, p_el[2]+0.022), 0.009, 0.008, b_up, 8, 0.92),
            make_limb_tube((p_sh[0]+sgn*0.020, p_sh[1]-0.02, p_sh[2]-0.026), (p_el[0]+sgn*0.014, p_el[1]+0.02, p_el[2]-0.022), 0.009, 0.008, b_up, 8, 0.92),
            # Machined elbow gimbal housing
            make_joint_sphere(p_el, 0.036, 0.036, 0.036, b_lo, 12),
            # Forearm carbon core + sculpted outer tactical forearm gauntlet cowl
            make_limb_tube(p_el, p_wr, 0.032, 0.025, b_lo, 12, 0.86),
            make_curved_armor_shield(
                (p_el[0]*0.82 + p_wr[0]*0.18, p_el[1]*0.82 + p_wr[1]*0.18, p_el[2]*0.82 + p_wr[2]*0.18),
                (p_el[0]*0.12 + p_wr[0]*0.88, p_el[1]*0.12 + p_wr[1]*0.88, p_el[2]*0.12 + p_wr[2]*0.88),
                0.038, 0.035, -math.pi*0.42, math.pi*0.42, 0.009, b_lo, 10
            ),
            # Articulated cybernetic wrist & armored metacarpal chassis + segmented robotic fingers
            make_joint_sphere(p_wr, 0.025, 0.023, 0.025, b_ha, 10),
            make_limb_tube(p_wr, p_kn, 0.029, 0.032, b_ha, 10, 0.95),
        ]
        for fi, dz, b_off in [(0, 0.018, 3), (1, 0.0, 6), (2, -0.018, 9), (3, -0.032, 12)]:
            fp0 = (p_kn[0] + sgn*0.004, p_kn[1] - 0.006, p_kn[2] + dz)
            fp1 = (fp0[0] + sgn*0.010, fp0[1] - 0.048, fp0[2] + 0.014)
            c_arm.append(make_limb_tube(fp0, fp1, 0.007, 0.006, f_base + b_off, 6, 0.90))
        meshes[f"cyber_arm_{side}"] = combine_parts(c_arm, morphs_from_skin=True)

    # 5B. cyber_leg_l & cyber_leg_r (Flush Hip Socket -> Thigh Armor Plates + Actuator -> Knee Gimbal -> Calf Armor + Ankle)
    for side, sgn, b_th, b_ca, b_ft, b_bl in [("l", 1.0, 45, 46, 47, 48), ("r", -1.0, 49, 50, 51, 52)]:
        p_pel= (sgn * 0.066, 0.906, 0.008)
        p_hp = (sgn * 0.104, 0.862, 0.005)
        p_kn = (sgn * 0.143, 0.474, 0.037)
        p_ak = (sgn * 0.181, 0.069, 0.022)
        p_bl = (sgn * 0.186, 0.022, 0.145)
        c_leg = [
            make_limb_tube(p_pel, p_hp, 0.076, 0.072, 1, 14, 0.96),
            make_joint_sphere(p_hp, 0.068, 0.068, 0.068, b_th, 12),
            # Carbon femur core + front/side armored thigh plates + lateral hydraulic piston
            make_limb_tube(p_hp, p_kn, 0.056, 0.042, b_th, 14, 0.84),
            make_curved_armor_shield(
                (p_hp[0]*0.86 + p_kn[0]*0.14, p_hp[1]*0.86 + p_kn[1]*0.14, p_hp[2]*0.86 + p_kn[2]*0.14),
                (p_hp[0]*0.16 + p_kn[0]*0.84, p_hp[1]*0.16 + p_kn[1]*0.84, p_hp[2]*0.16 + p_kn[2]*0.84),
                0.064, 0.068, -math.pi*0.42, math.pi*0.42, 0.011, b_th, 10
            ),
            make_limb_tube((p_hp[0]+sgn*0.048, p_hp[1]-0.04, p_hp[2]+0.015), (p_kn[0]+sgn*0.038, p_kn[1]+0.04, p_kn[2]+0.016), 0.012, 0.010, b_th, 8, 0.92),
            # Articulated knee servo gimbal & patella armor shield
            make_joint_sphere(p_kn, 0.048, 0.048, 0.052, b_ca, 12),
            make_curved_armor_shield((p_kn[0], p_kn[1]-0.04, p_kn[2]), (p_kn[0], p_kn[1]+0.04, p_kn[2]), 0.054, 0.058, -math.pi*0.35, math.pi*0.35, 0.010, b_ca, 8),
            # Sculpted dual-strut shin core + front/rear tibial armor plates
            make_limb_tube(p_kn, p_ak, 0.044, 0.030, b_ca, 12, 0.82),
            make_curved_armor_shield(
                (p_kn[0]*0.86 + p_ak[0]*0.14, p_kn[1]*0.86 + p_ak[1]*0.14, p_kn[2]*0.86 + p_ak[2]*0.14),
                (p_kn[0]*0.18 + p_ak[0]*0.82, p_kn[1]*0.18 + p_ak[1]*0.82, p_kn[2]*0.18 + p_ak[2]*0.82),
                0.048, 0.052, -math.pi*0.38, math.pi*0.38, 0.010, b_ca, 10
            ),
            make_limb_tube((p_kn[0], p_kn[1]-0.03, p_kn[2]-0.044), (p_ak[0], p_ak[1]+0.03, p_ak[2]-0.028), 0.013, 0.010, b_ca, 8, 0.88),
            # Cybernetic ankle hydraulic + armored foot chassis
            make_joint_sphere(p_ak, 0.034, 0.034, 0.036, b_ft, 10),
            make_limb_tube((p_ak[0], p_ak[1]-0.034, p_ak[2]-0.036), p_bl, 0.034, 0.038, b_ft, 10, 0.94),
            make_beveled_box(p_bl[0], 0.018, p_bl[2] + 0.038, 0.040, 0.015, 0.048, 0.005, bone_idx=b_bl),
        ]
        meshes[f"cyber_leg_{side}"] = combine_parts(c_leg, morphs_from_skin=True)

    # 5C. cyber_torso (Armored pectoral chassis + segmented abdominal core + shoulder/neck collars)
    c_torso = []
    t_rings = []
    for y, rx, rz_f, rz_b in [(0.89,0.142,0.106,0.100),(0.97,0.132,0.102,0.095),(1.08,0.148,0.118,0.104),(1.21,0.178,0.148,0.125),(1.31,0.172,0.136,0.118),(1.36,0.072,0.068,0.068)]:
        ring = []
        for si in range(20):
            a = 2.0 * math.pi * si / 20.0; ca, sa = math.sin(a), math.cos(a)
            rz = rz_f if sa >= 0 else rz_b
            ring.append(np.array([ca * rx, y, sa * rz + 0.010], dtype=np.float32))
        t_rings.append(ring)
    vt, nt, ut, it = make_loft_shell(t_rings, closed_caps=True)
    jt, wt = nearest_skin(vt)
    c_torso.append((vt, nt, ut, it, jt, wt))
    c_torso.append(make_beveled_box(0.0, 1.245, 0.145, 0.092, 0.078, 0.022, 0.008, bone_idx=4))
    c_torso.append(make_beveled_box(0.0, 1.095, 0.116, 0.062, 0.065, 0.016, 0.006, bone_idx=3))
    c_torso.append(make_beveled_box(0.0, 1.225,-0.112, 0.068, 0.105, 0.024, 0.007, bone_idx=4))
    meshes["cyber_torso"] = combine_parts(c_torso, morphs_from_skin=True)

    # 5D. cyber_head (Anatomical synthetic cranial chassis + brow visor armor + articulated cyber jaw)
    c_head = []
    ch_rings = []
    for y, rx, rz, zc in [(1.46,0.064,0.078,0.020),(1.52,0.078,0.098,0.034),(1.58,0.084,0.108,0.038),(1.65,0.078,0.098,0.030),(1.70,0.036,0.048,0.020)]:
        ring = [np.array([math.sin(2.0*math.pi*si/16.0)*rx, y, math.cos(2.0*math.pi*si/16.0)*rz + zc], dtype=np.float32) for si in range(16)]
        ch_rings.append(ring)
    vch, nch, uch, ich = make_loft_shell(ch_rings, closed_caps=True)
    jch = np.zeros((len(vch), 4), dtype=np.uint8); jch[:, 0] = 44; wch = np.zeros((len(vch), 4), dtype=np.uint8); wch[:, 0] = 255
    c_head.append((vch, nch, uch, ich, jch, wch))
    c_head.append(make_beveled_box(0.0, 1.578, 0.125, 0.056, 0.018, 0.020, 0.005, bone_idx=44))  # Armored optic visor brow
    c_head.append(make_beveled_box(0.0, 1.448, 0.095, 0.044, 0.022, 0.034, 0.006, bone_idx=44))  # Articulated cyber mandible
    c_head.append(make_limb_tube((0.0, 1.385, 0.014), (0.0, 1.460, 0.018), 0.056, 0.052, 43, 14, 0.94))
    meshes["cyber_head"] = combine_parts(c_head, morphs_from_skin=True)

    # 6. MORPH-TRACKED 3D FACIAL PIERCINGS
    def make_piercing_mesh(centers_radii):
        res = combine_parts([make_joint_sphere(c, rad, rad, rad, 44, 8) for c, rad in centers_radii], morphs_from_skin=True)
        return res

    meshes["piercing_brow"] = make_piercing_mesh([([0.047, 1.568, 0.129], 0.0024), ([0.049, 1.559, 0.130], 0.0022)])
    meshes["piercing_nostril"] = make_piercing_mesh([([0.017, 1.518, 0.143], 0.0022)])
    meshes["piercing_lip"] = make_piercing_mesh([([0.000, 1.462, 0.1425], 0.0024)])
    meshes["piercing_ears"] = make_piercing_mesh([
        ([0.072, 1.506, 0.049], 0.0032), ([-0.072, 1.506, 0.049], 0.0032),
        ([0.081, 1.537, 0.030], 0.0025), ([-0.081, 1.537, 0.030], 0.0025),
    ])
    return meshes

def serialize_mesh_pack(m):
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
    while len(buf) % 4 != 0:
        buf.append(0)
    return bytes(buf)

def _pil_to_webp(im, max_size=512, quality=84, keep_alpha=False):
    if max(im.size) > max_size:
        im = im.resize((max_size, max_size), Image.Resampling.LANCZOS)
    if not keep_alpha and im.mode != "RGB":
        im = im.convert("RGB")
    elif keep_alpha and im.mode != "RGBA":
        im = im.convert("RGBA")
    buf = io.BytesIO()
    im.save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()

def encode_webp_b64(img_bytes, max_size=512, quality=84, keep_alpha=False):
    return _pil_to_webp(Image.open(io.BytesIO(img_bytes)), max_size, quality, keep_alpha)

def _height_to_normal_rgb(height_f32, strength=2.2):
    """Sobel heightmap -> crisp tangent-space RGB normal map."""
    h = height_f32.astype(np.float32)
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    nz = np.ones_like(h)
    nx = -dx; ny = -dy
    ln = np.sqrt(nx*nx + ny*ny + nz*nz)
    rgb = np.stack([(nx/ln)*0.5+0.5, (ny/ln)*0.5+0.5, (nz/ln)*0.5+0.5], axis=-1)
    return np.clip(rgb * 255.0, 0, 255).astype(np.uint8)

def synthesize_tactile_textures(gltf_b, bin_b, garments_glbs):
    """Build rich, real-looking CC0 skin, fabric weave, denim twill, leather grain, armor & cyber normal/albedo maps."""
    tex_blobs = {}

    def _raw_by_name(gltf_x, bin_x, name):
        for img in gltf_x.get("images", []):
            if img.get("name") == name:
                bv = gltf_x["bufferViews"][img["bufferView"]]
                return bin_x[bv["byteOffset"]:bv["byteOffset"]+bv["byteLength"]]
        return None

    # 1. Real CC0 Light & Dark Skins + High-Detail Pore Normal Map (768px)
    skin_light_im = Image.open(f"{VRM_DIR}/textures/skin_young_caucasian_male.jpg").convert("RGB").resize((768, 768), Image.Resampling.LANCZOS)
    skin_dark_im  = Image.open(f"{VRM_DIR}/textures/skin_young_african_male.jpg").convert("RGB").resize((768, 768), Image.Resampling.LANCZOS)
    tex_blobs["body_skin_light"]  = _pil_to_webp(skin_light_im, 768, 86, False)
    tex_blobs["body_skin_dark"]   = _pil_to_webp(skin_dark_im, 768, 86, False)
    tex_blobs["body_skin_albedo"] = tex_blobs["body_skin_light"]

    # Combine kblood's baked skin_normal with fine micro-pore Sobel derivatives from skin_young_caucasian_male!
    base_sn_raw = _raw_by_name(gltf_b, bin_b, "skin_normal")
    sn_base = np.array(Image.open(io.BytesIO(base_sn_raw)).convert("RGB").resize((768, 768), Image.Resampling.LANCZOS), dtype=np.float32) / 127.5 - 1.0
    lum_skin = np.array(skin_light_im.convert("L"), dtype=np.float32) / 255.0
    # High-pass pore detail (removes large gradient shadows, preserves fine pores/wrinkles/lip creases)
    blur_s = np.array(Image.fromarray((lum_skin * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2.2)), dtype=np.float32) / 255.0
    pores_h = lum_skin - blur_s
    sn_pore = np.stack([
        -(np.roll(pores_h, -1, axis=1) - np.roll(pores_h, 1, axis=1)) * 3.8,
        -(np.roll(pores_h, -1, axis=0) - np.roll(pores_h, 1, axis=0)) * 3.8,
        np.ones_like(pores_h)
    ], axis=-1)
    sn_mix = sn_base * 1.15 + sn_pore * 0.65
    sn_mix /= np.maximum(np.linalg.norm(sn_mix, axis=-1, keepdims=True), 1e-6)
    sn_u8 = np.clip((sn_mix * 0.5 + 0.5) * 255.0, 0, 255).astype(np.uint8)
    tex_blobs["body_skin_normal"] = _pil_to_webp(Image.fromarray(sn_u8), 768, 90, False)

    # 2. Lifelike Eye Texture (neutralize iris chroma from eye_brown.jpg so sclera vessels look real & iris tints cleanly!)
    eye_im = Image.open(f"{VRM_DIR}/textures/eye_brown.jpg").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    ea = np.array(eye_im, dtype=np.float32) / 255.0
    # Detect colored iris fibers (warmer/darker than neutral grey sclera) and neutralize their hue while preserving contrast
    sat = ea.max(axis=-1) - ea.min(axis=-1)
    lum = ea.mean(axis=-1, keepdims=True)
    # Keep red sclera capillaries slightly warm; lift iris fiber contrast to crisp neutral silver for vibrant tinting
    iris_zone = (lum[:, :, 0] < 0.42) & (sat > 0.04)
    ea[iris_zone] = np.clip(lum[iris_zone] * 2.25, 0.04, 0.92)
    tex_blobs["body_eye"] = _pil_to_webp(Image.fromarray(np.clip(ea*255, 0, 255).astype(np.uint8)), 512, 88, False)

    # Eyebrow, Eyelash, ccRegions, Beard Mask
    for nm, sz, q, al in [("eyebrow", 512, 88, True), ("eyelash", 512, 88, True), ("ccRegions", 256, 84, False)]:
        raw = _raw_by_name(gltf_b, bin_b, nm)
        if raw:
            tex_blobs[f"body_{nm}"] = encode_webp_b64(raw, sz, q, al)
    def _luma_mask_rgba(path, max_sz=512):
        g = np.asarray(Image.open(path).convert("L").resize((max_sz, max_sz), Image.Resampling.LANCZOS), dtype=np.uint8)
        rgba = np.zeros((max_sz, max_sz, 4), dtype=np.uint8)
        rgba[:, :, 0:3] = 255
        rgba[:, :, 3] = g
        return _pil_to_webp(Image.fromarray(rgba), max_sz, 88, True)
    tex_blobs["body_beard_mask"] = _luma_mask_rgba(f"{VRM_DIR}/masks/mask_beard.png", 512)
    tex_blobs["body_lip_mask"]   = _luma_mask_rgba(f"{VRM_DIR}/masks/mask_lips.png", 512)

    # 3. Tactile Fabric Weave, Denim Twill, Fleece, and Oiled Leather Albedo + Normal Maps (512px)
    yy, xx = np.mgrid[0:512, 0:512].astype(np.float32)

    def _degrid_fabric(arr, keep_sigma=1.8):
        """Remove periodic 8px/16px synthetic checkerboard artifacts from MakeHuman cloth textures via 2D FFT notch filtering."""
        out = arr.copy()
        H, W = arr.shape[:2]
        cy, cx = H // 2, W // 2
        fy, fx = np.mgrid[0:H, 0:W]
        r_dist = np.hypot(fx - cx, fy - cy)
        for ch in range(arr.shape[2] if arr.ndim == 3 else 1):
            sl = arr[:, :, ch] if arr.ndim == 3 else arr
            F = np.fft.fftshift(np.fft.fft2(sl))
            mag = np.abs(F)
            # Suppress sharp periodic lattice harmonics away from DC (r > 24 px)
            from scipy.ndimage import uniform_filter
            loc_med = uniform_filter(mag, size=9) + 1e-4
            notch = (r_dist > 24.0) & (mag > loc_med * 3.2)
            # Also gently roll off crisp synthetic checkerboard Nyquist spikes > 90 px
            roll = 1.0 / (1.0 + (r_dist / 96.0) ** 4)
            F_clean = F * np.where(notch, 0.08, 1.0) * (0.28 + 0.72 * roll)
            rec = np.real(np.fft.ifft2(np.fft.ifftshift(F_clean)))
            if arr.ndim == 3:
                out[:, :, ch] = rec
            else:
                out = rec
        return np.clip(out, 0.02, 0.98).astype(np.float32)

    # 3A. Jacket: clean woven tactical canvas (checkerboard-free + real lapels/seams + subtle micro-twill)
    rng = np.random.default_rng(42)
    fine_twill = 0.35 * np.sin((xx + yy) * 2.2) * np.cos((xx - yy) * 2.2) + rng.normal(0.0, 0.14, (512, 512)).astype(np.float32)
    jg, jb = garments_glbs["jacket"]
    j_raw = np.array(Image.open(io.BytesIO(_raw_by_name(jg, jb, "cloth_jacket_albedo"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    j_alb = _degrid_fabric(j_raw)
    j_alb = np.clip(j_alb * (0.94 + 0.05 * fine_twill[:, :, None]), 0.04, 0.96)
    tex_blobs["jacket_cloth_jacket_albedo"] = _pil_to_webp(Image.fromarray((j_alb*255).astype(np.uint8)), 512, 86, False)
    j_nrm_base = np.array(Image.open(io.BytesIO(_raw_by_name(jg, jb, "cloth_jacket_normal"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 127.5 - 1.0
    j_nrm_weave = (_height_to_normal_rgb(fine_twill, 0.55).astype(np.float32) / 127.5 - 1.0)
    j_nrm = j_nrm_base * 0.95 + j_nrm_weave * 0.45
    j_nrm /= np.maximum(np.linalg.norm(j_nrm, axis=-1, keepdims=True), 1e-6)
    tex_blobs["jacket_cloth_jacket_normal"] = _pil_to_webp(Image.fromarray(np.clip((j_nrm*0.5+0.5)*255,0,255).astype(np.uint8)), 512, 88, False)

    # 3B. Jeans: true indigo/charcoal denim diagonal twill weave + creases
    twill_h = 0.65 * np.sin((xx + yy) * 1.35) + 0.25 * np.sin(xx * 0.72)
    jng, jnb = garments_glbs["jeans"]
    jn_alb = np.array(Image.open(io.BytesIO(_raw_by_name(jng, jnb, "cloth_jeans_albedo"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    # Tint normalized grey jeans into true natural blue-slate denim wash (so it never looks chalky grey!)
    jn_alb = np.clip(jn_alb * np.array([0.52, 0.66, 0.88])[None, None, :] * (0.84 + 0.16 * twill_h[:, :, None]), 0.04, 0.96)
    tex_blobs["jeans_cloth_jeans_albedo"] = _pil_to_webp(Image.fromarray((jn_alb*255).astype(np.uint8)), 512, 86, False)
    jn_nrm_base = np.array(Image.open(io.BytesIO(_raw_by_name(jng, jnb, "cloth_jeans_normal"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 127.5 - 1.0
    jn_nrm_w = (_height_to_normal_rgb(twill_h, 0.95).astype(np.float32) / 127.5 - 1.0)
    jn_nrm = jn_nrm_base * 1.15 + jn_nrm_w * 0.65
    jn_nrm /= np.maximum(np.linalg.norm(jn_nrm, axis=-1, keepdims=True), 1e-6)
    tex_blobs["jeans_cloth_jeans_normal"] = _pil_to_webp(Image.fromarray(np.clip((jn_nrm*0.5+0.5)*255,0,255).astype(np.uint8)), 512, 88, False)

    # 3C. T-shirt & Hoodie: smooth cotton jersey (checkerboard-free, no stick-figure logo!) & French terry fleece
    knit_h = 0.40 * np.sin(xx * 2.1) + 0.25 * np.sin(yy * 1.35) + rng.normal(0.0, 0.14, (512, 512)).astype(np.float32)
    tsg, tsb = garments_glbs["tshirt"]
    ts_raw = np.array(Image.open(io.BytesIO(_raw_by_name(tsg, tsb, "cloth_tshirt_albedo"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    ts_alb = _degrid_fabric(ts_raw)
    # Paint out the baked Vitruvian stick-figure oval emblem on the front chest (keep neck collar & seams)
    chest_patch = np.median(ts_alb[140:320, 215:245], axis=(0, 1))
    ts_alb[130:290, 252:332] = ts_alb[130:290, 252:332] * 0.08 + chest_patch[None, None, :] * 0.92
    ts_alb = np.clip(ts_alb * (0.94 + 0.05 * knit_h[:, :, None]), 0.04, 0.96)
    tex_blobs["tshirt_cloth_tshirt_albedo"] = _pil_to_webp(Image.fromarray((ts_alb*255).astype(np.uint8)), 512, 84, False)
    tex_blobs["tshirt_cloth_tshirt_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(knit_h, 0.45)), 512, 88, False)

    fleece_h = 0.45 * np.sin(xx * 1.2) * np.cos(yy * 1.2) + rng.normal(0.0, 0.24, (512, 512)).astype(np.float32)
    hdg, hdb = garments_glbs["hoodie"]
    hd_alb = np.array(Image.open(io.BytesIO(_raw_by_name(hdg, hdb, "cloth_hoodie_albedo"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    hd_alb = np.clip(hd_alb * (0.92 + 0.07 * fleece_h[:, :, None]), 0.04, 0.96)
    tex_blobs["hoodie_cloth_hoodie_albedo"] = _pil_to_webp(Image.fromarray((hd_alb*255).astype(np.uint8)), 512, 84, False)
    tex_blobs["hoodie_cloth_hoodie_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(fleece_h, 0.50)), 512, 88, False)

    # 3D. Boots: rich worn dark-umber leather + pebbled leather grain normal map
    btg, btb = garments_glbs["boots"]
    bt_raw = np.array(Image.open(io.BytesIO(_raw_by_name(btg, btb, "cloth_boots_albedo"))).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    pebble = (0.5 * np.sin(xx * 0.9 + np.sin(yy * 0.6)) * np.cos(yy * 0.9) + rng.normal(0.0, 0.22, (512, 512))).astype(np.float32)
    bt_alb = np.clip(bt_raw * np.array([0.46, 0.36, 0.28])[None, None, :] * (0.90 + 0.12 * pebble[:, :, None]), 0.04, 0.96)
    tex_blobs["boots_cloth_boots_albedo"] = _pil_to_webp(Image.fromarray((bt_alb*255).astype(np.uint8)), 512, 86, False)
    bt_lum = bt_raw.mean(axis=-1)
    bt_blur = np.array(Image.fromarray((bt_lum*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=1.8)), dtype=np.float32) / 255.0
    tex_blobs["boots_cloth_boots_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb((bt_lum - bt_blur) * 2.2 + pebble * 0.45, 1.4)), 512, 88, False)

    # 3E. Underwear subtle cotton weave
    for uk in ("briefs", "bra", "panties"):
        ug, ub = garments_glbs[uk]
        raw = _raw_by_name(ug, ub, f"cloth_{uk}_albedo")
        if raw: tex_blobs[f"{uk}_cloth_{uk}_albedo"] = encode_webp_b64(raw, 256, 82, False)

    # 3F. VRM CC0 Tactical Wool Trousers & Cyborg Suit + Armor & Cyber Normal Maps
    tr_im = Image.open(f"{VRM_DIR}/textures/toigo_wool_pants.jpg").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    tex_blobs["trousers_albedo"] = _pil_to_webp(tr_im, 512, 86, False)
    tr_lum = np.array(tr_im.convert("L"), dtype=np.float32) / 255.0
    tex_blobs["trousers_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(tr_lum + 0.14 * twill_h, 1.5)), 512, 88, False)

    cy_im = Image.open(f"{VRM_DIR}/textures/ours_space_suit.jpg").convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    tex_blobs["cyborg_suit_albedo"] = _pil_to_webp(cy_im, 512, 86, False)
    cy_lum = np.array(cy_im.convert("L"), dtype=np.float32) / 255.0
    tex_blobs["cyborg_suit_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(cy_lum, 1.4)), 512, 88, False)

    # 256px tileable Armor smooth ballistic composite & Cyber micro-carbon normal maps
    ya, xa = np.mgrid[0:256, 0:256].astype(np.float32)
    cordura_h = 0.25 * np.sin(xa * 2.1) * np.sin(ya * 2.1) + rng.normal(0.0, 0.16, (256, 256)).astype(np.float32)
    tex_blobs["armor_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(cordura_h, 0.36)), 256, 88, False)
    carbon_h = 0.42 * np.sin((xa + ya) * 1.45) * np.cos((xa - ya) * 1.45) + 0.18 * ((np.mod(xa, 64) < 1.5) | (np.mod(ya, 64) < 1.5)).astype(np.float32)
    tex_blobs["cyber_normal"] = _pil_to_webp(Image.fromarray(_height_to_normal_rgb(carbon_h, 0.65)), 256, 88, False)

    # 3G. CC0 Hair + 3D Beard + Moustache Alpha Textures (512px RGBA)
    for hk, fn in [
        ("hair_short01", "short01.webp"),
        ("hair_messy",   "cortu_short_messy_hair.webp"),
        ("hair_shaggy",  "cortu_shaggy_green_hair.webp"),
        ("hair_bob02",   "bob02.webp"),
        ("hair_long01",  "long01.webp"),
        ("hair_ponytail01", "ponytail01.webp"),
        ("hair_afro01",  "afro01.webp"),
        ("beard_goatee", "beard_goatee.webp"),
        ("beard_short",  "beard_short.webp"),
        ("beard_long",   "rehmanpolanski_beard_viking.webp"),
        ("beard_moustache", "rehmanpolanski_moustache_viking.webp"),
    ]:
        im = Image.open(f"{VRM_DIR}/textures/{fn}").convert("RGBA")
        if hk == "hair_afro01":
            # Ensure MakeHuman's curly afro cap & strands are lush and never reveal bare scalp through curl gaps
            aa = np.array(im, dtype=np.float32)
            from scipy.ndimage import maximum_filter
            # Top half (cap UV islands): seal interior cap holes solidly; bottom strip: gently thicken curl strands
            h_split = int(aa.shape[0] * 0.62)
            top_a = aa[:h_split, :, 3]
            aa[:h_split, :, 3] = np.where(top_a > 14, 255.0, top_a)
            aa[:h_split, :, :3] = np.maximum(aa[:h_split, :, :3], 36.0)
            bot_a = aa[h_split:, :, 3]
            thick_a = maximum_filter(bot_a, size=3)
            aa[h_split:, :, 3] = np.clip(np.maximum(bot_a * 1.35, thick_a * 0.72), 0.0, 255.0)
            aa[h_split:, :, :3] = np.maximum(aa[h_split:, :, :3], np.where(aa[h_split:, :, 3:4] > 20, 42.0, 0.0))
            im = Image.fromarray(np.clip(aa, 0, 255).astype(np.uint8))
        tex_blobs[f"tex_{hk}"] = _pil_to_webp(im, 512, 86, True)
    # Keep short02, short04, braid01 from kblood GLBs (with RGBA hair alpha)
    for hk in ("hair_short02", "hair_short04", "hair_braid01"):
        hg, hb = garments_glbs[hk]
        raw = _raw_by_name(hg, hb, hk)
        if raw:
            tex_blobs[f"tex_{hk}"] = encode_webp_b64(raw, 512, 86, True)

    return tex_blobs

def main():
    os.makedirs(os.path.dirname(OUT_BIN), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    ensure_cc0_sources()

    gltf_b, bin_b = load_glb(f"{SRC_DIR}/base_body.glb")
    body = pack_prim_mesh(gltf_b, bin_b, 0, 0, KEEP_TARGETS, "base_body")
    body["morphs"].update(synthesize_expression_morphs(body["_pos_f32"]))

    eye_sclera = pack_prim_mesh(gltf_b, bin_b, 3, 0, KEEP_TARGETS, "eye_sclera")
    eye_iris   = pack_prim_mesh(gltf_b, bin_b, 3, 1, KEEP_TARGETS, "eye_iris")
    eye_cornea = pack_prim_mesh(gltf_b, bin_b, 3, 2, KEEP_TARGETS, "eye_cornea")
    eyebrows   = pack_prim_mesh(gltf_b, bin_b, 1, 0, KEEP_TARGETS, "eyebrows", normal_push_m=0.0012)
    eyelashes  = pack_prim_mesh(gltf_b, bin_b, 2, 0, KEEP_TARGETS, "eyelashes")

    skin = gltf_b["skins"][0]
    joint_nodes = skin["joints"]
    node_to_joint = {ni: ji for ji, ni in enumerate(joint_nodes)}
    parents = [-1] * len(joint_nodes)
    rest_t, rest_r, joint_names = [], [], []
    for ji, ni in enumerate(joint_nodes):
        node = gltf_b["nodes"][ni]
        joint_names.append(node.get("name", f"j{ji}"))
        rest_t.append(node.get("translation", [0.0, 0.0, 0.0]))
        rest_r.append(node.get("rotation", [0.0, 0.0, 0.0, 1.0]))
        for ch in node.get("children", []):
            if ch in node_to_joint:
                parents[node_to_joint[ch]] = ji
    ibm = read_acc(gltf_b, bin_b, skin["inverseBindMatrices"]).astype(np.float32)

    bp = body["_pos_f32"]; buv = body["uv"].astype(np.float32) / 65535.0; bjnt = body["joints"][:, 0]
    face_uv_island = buv[:, 0] > 0.72
    def uv_center(x0, x1, y0, y1, zmin=0.05):
        m = face_uv_island & (bp[:,0]>=x0)&(bp[:,0]<=x1)&(bp[:,1]>=y0)&(bp[:,1]<=y1)&(bp[:,2]>=zmin)
        if not np.any(m): return [0.87, 0.52]
        return [float(buv[m,0].mean()), float(buv[m,1].mean())]
    face_uv_anchors = {
        "nose": uv_center(-0.012,0.012,1.495,1.530,0.12), "ulip": uv_center(-0.018,0.018,1.472,1.490,0.12),
        "llip": uv_center(-0.018,0.018,1.452,1.472,0.11), "chin": uv_center(-0.025,0.025,1.415,1.450,0.09),
        "lcheek": uv_center(0.025,0.058,1.475,1.520,0.09), "rcheek": uv_center(-0.058,-0.025,1.475,1.520,0.09),
        "forehead": uv_center(-0.030,0.030,1.565,1.610,0.11),
        "lbrow": uv_center(0.018,0.048,1.535,1.555,0.11), "rbrow": uv_center(-0.048,-0.018,1.535,1.555,0.11),
        "ljaw": uv_center(0.030,0.068,1.425,1.470,0.04), "rjaw": uv_center(-0.068,-0.030,1.425,1.470,0.04),
    }
    nail_uvs = []
    for fji in [11, 14, 17, 20, 23, 30, 33, 36, 39, 42]:
        fm = (bjnt == fji)
        if np.any(fm):
            fp = bp[fm]; fu = buv[fm]; tip = int(np.argmin(fp[:, 1]))
            nail_uvs.append([round(float(fu[tip, 0]), 4), round(float(fu[tip, 1]), 4)])
    tattoo_uv = {"chest": [0.381,0.297], "neck": [0.455,0.087], "arm_l": [0.606,0.171], "arm_r": [0.155,0.171], "forearm_l": [0.708,0.178], "face": [0.855,0.415]}

    # Garments from kblood GLBs (Push underwear outward +3.5mm to completely cure chest/hip Z-fighting!)
    garments = {}
    garments_glbs = {}
    for key, fn, is_hair, push_m in [
        ("briefs",   "clothing_briefs.glb",  False, 0.0032),
        ("bra",      "clothing_bra.glb",     False, 0.0038),
        ("panties",  "clothing_panties.glb", False, 0.0035),
        ("tshirt",   "clothing_tshirt.glb",  False, 0.0010),
        ("hoodie",   "clothing_hoodie.glb",  False, 0.0010),
        ("jacket",   "clothing_jacket.glb",  False, 0.0010),
        ("jeans",    "clothing_jeans.glb",   False, 0.0010),
        ("boots",    "clothing_boots.glb",   False, 0.0005),
        ("hair_short02", "hair_short02.glb", True,  0.0015),
        ("hair_short04", "hair_short04.glb", True,  0.0015),
        ("hair_braid01", "hair_braid01.glb", True,  0.0015),
    ]:
        gg, gb = load_glb(f"{SRC_DIR}/{fn}")
        garments_glbs[key] = (gg, gb)
        garments[key] = pack_prim_mesh(gg, gb, 0, 0, KEEP_TARGETS, key, hair_helmet_tuck=is_hair, normal_push_m=push_m)

    # Compile CC0 vrm-avatar-maker volumetric hairs, 3D beards, moustache, cargo trousers, & cyborg suit!
    dense_kb_morphs = _precompute_dense_morphs_f32(len(body["_pos_f32"]), body["morphs"])
    # Ensure kblood GLB hairs (short02, short04, braid01) clear the scalp >= +3.0mm across both male & female morphs
    kb_pos_f32 = body["_pos_f32"]
    kb_nrm_f32 = body["_norm_f32"]
    for hkey in ("hair_short02", "hair_short04", "hair_braid01"):
        hm = garments[hkey]
        hp = hm["_pos_f32"].copy()
        hm_dense = _precompute_dense_morphs_f32(len(hp), hm["morphs"])
        push = np.zeros(len(hp), dtype=np.float32)
        push_dir = np.zeros_like(hp)
        for combo in ({}, {"gender_female": 1.0}, {"gender_male": 1.0}, {"gender_female": 0.85, "face_forehead_decr": 0.5}):
            bc = kb_pos_f32.copy(); hc = hp.copy()
            for mk, wv in combo.items():
                if mk in dense_kb_morphs: bc += dense_kb_morphs[mk] * wv
                if mk in hm_dense:       hc += hm_dense[mk] * wv
            ed, nn = cKDTree(bc).query(hc)
            sd = ((hc - bc[nn]) * kb_nrm_f32[nn]).sum(axis=1)
            # Only push hair vertices near the skull/forehead/nape (y > 1.44 and within 10mm of head)
            need = np.where((hc[:, 1] > 1.44) & (ed < 0.012) & (sd < 0.0030), np.minimum(0.0032 - sd, 0.0075), 0.0)
            better = need > push
            push[better] = need[better]
            push_dir[better] = kb_nrm_f32[nn[better]]
        if np.any(push > 1e-5):
            hp += push_dir * push[:, None]
            hm["_pos_f32"] = hp
            hm["pos"] = quantize_pos(hp)
            print(f"  [kblood-hair] {hkey:16s} | pushed {int((push>1e-5).sum()):4d} scalp verts (max +{push.max()*1000:.2f}mm)")

    src_to_kb, vrm_pos_kb = build_vrm_source_to_kb_map(body["_pos_f32"], body["uv"].astype(np.float32) / 65535.0)
    vrm_items_cfg = [
        ("short01",                        "hair_short01",    True,  0.0028),
        ("cortu_short_messy_hair",         "hair_messy",      True,  0.0030),
        ("cortu_shaggy_green_hair",        "hair_shaggy",     True,  0.0030),
        ("bob02",                          "hair_bob02",      True,  0.0028),
        ("long01",                         "hair_long01",     True,  0.0028),
        ("ponytail01",                     "hair_ponytail01", True,  0.0028),
        ("afro01",                         "hair_afro01",     True,  0.0028),
        ("beard_goatee",                   "beard_goatee",    False, 0.0018),
        ("beard_short",                    "beard_short",     False, 0.0018),
        ("rehmanpolanski_beard_viking",    "beard_long",      False, 0.0020),
        ("rehmanpolanski_moustache_viking","beard_moustache", False, 0.0016),
        ("toigo_wool_pants",               "trousers",        False, 0.0020),
        ("ours_space_suit",                "cyborg_suit",     False, 0.0022),
    ]
    for v_id, m_name, is_h, min_clr in vrm_items_cfg:
        garments[m_name] = compile_vrm_item(v_id, m_name, body, src_to_kb, vrm_pos_kb, dense_kb_morphs, is_hair=is_h, min_clear_m=min_clr)

    tex_blobs = synthesize_tactile_textures(gltf_b, bin_b, garments_glbs)
    custom = build_custom_hard_surface_meshes(body["_pos_f32"], body["_norm_f32"], body["joints"], body["weights"], dense_kb_morphs)

    # LOD1 & LOD2 (clothed tactical operator)
    base_tris = body["indices"].reshape(-1, 3)
    exposed_mask = (body["cczone"][base_tris] & (BODY_ZONES["jacket"] | BODY_ZONES["legs"] | BODY_ZONES["boots"] | BODY_ZONES["underwear_m"])) == 0
    exposed_tris = base_tris[np.all(exposed_mask, axis=1)].reshape(-1)
    comb_pos = [body["_pos_f32"], garments["jacket"]["_pos_f32"], garments["jeans"]["_pos_f32"], garments["boots"]["_pos_f32"]]
    comb_nrm = [body["_norm_f32"], garments["jacket"]["_norm_f32"], garments["jeans"]["_norm_f32"], garments["boots"]["_norm_f32"]]
    comb_uv  = [body["uv"].astype(np.float32)/65535.0, garments["jacket"]["uv"].astype(np.float32)/65535.0, garments["jeans"]["uv"].astype(np.float32)/65535.0, garments["boots"]["uv"].astype(np.float32)/65535.0]
    comb_j   = [body["joints"], garments["jacket"]["joints"], garments["jeans"]["joints"], garments["boots"]["joints"]]
    comb_w   = [body["weights"], garments["jacket"]["weights"], garments["jeans"]["weights"], garments["boots"]["weights"]]
    comb_i, vo = [], 0
    for arr_v, arr_i in [
        (body["_pos_f32"], exposed_tris),
        (garments["jacket"]["_pos_f32"], garments["jacket"]["indices"]),
        (garments["jeans"]["_pos_f32"], garments["jeans"]["indices"]),
        (garments["boots"]["_pos_f32"], garments["boots"]["indices"]),
    ]:
        comb_i.append(arr_i.astype(np.uint32) + vo); vo += len(arr_v)
    c_pos = np.vstack(comb_pos); c_nrm = np.vstack(comb_nrm); c_uv = np.vstack(comb_uv)
    c_j = np.vstack(comb_j); c_w = np.vstack(comb_w); c_i = np.concatenate(comb_i)

    def _q_to_m4(q):
        x, y, z, w = q
        return np.array([[1-2*(y*y+z*z),2*(x*y-w*z),2*(x*z+w*y),0],[2*(x*y+w*z),1-2*(x*x+z*z),2*(y*z-w*x),0],[2*(x*z-w*y),2*(y*z+w*x),1-2*(x*x+y*y),0],[0,0,0,1]], dtype=np.float32)
    def _eul_xyz(rx, ry, rz):
        cx, sx = math.cos(rx), math.sin(rx); cy, sy = math.cos(ry), math.sin(ry); cz, sz = math.cos(rz), math.sin(rz)
        return (np.array([[cz,-sz,0,0],[sz,cz,0,0],[0,0,1,0],[0,0,0,1]], dtype=np.float32)
              @ np.array([[cy,0,sy,0],[0,1,0,0],[-sy,0,cy,0],[0,0,0,1]], dtype=np.float32)
              @ np.array([[1,0,0,0],[0,cx,-sx,0],[0,sx,cx,0],[0,0,0,1]], dtype=np.float32))
    lod_ovr = {"spine_02":(0.08,0,0),"upperarm_r":(-0.52,0.18,0.44),"lowerarm_r":(-0.90,0.34,0),"upperarm_l":(-0.48,-0.28,-0.46),"lowerarm_l":(-0.92,-0.58,0),"thigh_l":(-0.14,0.02,0.03),"calf_l":(0.24,0,0),"thigh_r":(-0.10,-0.02,-0.03),"calf_r":(0.18,0,0)}
    lod_worlds, lod_skins = [], np.zeros((len(joint_names), 4, 4), dtype=np.float32)
    for ji, jn in enumerate(joint_names):
        M = _q_to_m4(rest_r[ji]); M[:3, 3] = rest_t[ji]
        pi = parents[ji]
        W = (lod_worlds[pi] @ M) if pi >= 0 else M
        if jn in lod_ovr:
            W = W.copy(); px, py, pz = W[:3, 3].copy(); W[:3, 3] = 0; W = _eul_xyz(*lod_ovr[jn]) @ W; W[:3, 3] = [px, py, pz]
        lod_worlds.append(W); lod_skins[ji] = W @ ibm[ji].reshape(4, 4).T
    c_p4 = np.concatenate([c_pos, np.ones((len(c_pos), 1), dtype=np.float32)], axis=1)
    c_pos_p = np.zeros_like(c_pos); c_nrm_p = np.zeros_like(c_nrm); wf = c_w.astype(np.float32) / 255.0
    for k in range(4):
        S = lod_skins[c_j[:, k]]
        c_pos_p += wf[:, k:k+1] * np.einsum("vij,vj->vi", S, c_p4)[:, :3]
        c_nrm_p += wf[:, k:k+1] * np.einsum("vij,vj->vi", S[:, :3, :3], c_nrm)
    c_pos_p[:, 1] -= float(c_pos_p[:, 1].min())
    c_nrm_p /= np.maximum(np.linalg.norm(c_nrm_p, axis=1, keepdims=True), 1e-6)
    lod1 = decimate_skinned_mesh(c_pos_p, c_nrm_p, c_uv, c_j, c_w, c_i, 0.036)
    lod2 = decimate_skinned_mesh(c_pos_p, c_nrm_p, c_uv, c_j, c_w, c_i, 0.095)

    anims = {}
    jname_to_idx = {jn: ji for ji, jn in enumerate(joint_names)}
    for aname, afn in [("idle","anim_idle.json"),("walk","anim_walk.json"),("run","anim_run.json"),("strafe_left","anim_strafe_left.json"),("strafe_right","anim_strafe_right.json")]:
        with open(f"{SRC_DIR}/{afn}") as f: aj = json.load(f)
        bmap = aj["boneMap"]; step = max(1, aj["frames"] // 20); sel_frames = list(range(0, aj["frames"], step))
        tracks = {}
        for src_bone, dst_bone in bmap.items():
            if dst_bone in jname_to_idx and src_bone in aj["joints"]:
                qs = [aj["joints"][src_bone][fi] for fi in sel_frames]
                qarr = np.clip(np.round(np.array(qs, dtype=np.float32) * 32767.0), -32767, 32767).astype(np.int16)
                tracks[str(jname_to_idx[dst_bone])] = base64.b64encode(qarr.tobytes()).decode("ascii")
        anims[aname] = {"duration": float(aj["duration"]), "frames": len(sel_frames), "tracks": tracks}

    mesh_catalog = {
        "base_body": body, "eye_sclera": eye_sclera, "eye_iris": eye_iris,
        "eye_cornea": eye_cornea, "eyebrows": eyebrows, "eyelashes": eyelashes,
        "lod1": lod1, "lod2": lod2,
    }
    mesh_catalog.update(garments)
    mesh_catalog.update(custom)

    mesh_blobs = bytearray(); mesh_toc = {}
    for k, m in mesh_catalog.items():
        mb = serialize_mesh_pack(m)
        mesh_toc[k] = [len(mesh_blobs), len(mb)]
        mesh_blobs += mb

    morph_joints = {}
    jpath = f"{SRC_DIR}/base_body.joints.json"
    if os.path.exists(jpath):
        with open(jpath) as f: jj = json.load(f)
        jname_map = {jn: ji for ji, jn in enumerate(joint_names)}
        for mk in KEEP_TARGETS:
            jm = jj.get("morphs", {}).get(mk)
            if not jm: continue
            entries = {str(jname_map[bn]): [round(float(dxyz[0]),5), round(float(dxyz[1]),5), round(float(dxyz[2]),5)]
                       for bn, dxyz in jm.items() if bn in jname_map and any(abs(v)>1e-4 for v in dxyz)}
            if entries: morph_joints[mk] = entries

    manifest = {
        "version": "ev-humanoid-kit-1.2",
        "license": "CC0-1.0 (MakeHuman/MPFB2/CharacterCreator/vrm-avatar-maker assets) + MIT (Endless Vigil custom armor/cybernetics/skeleton/props)",
        "bodyZones": BODY_ZONES,
        "faceUV": face_uv_anchors, "nailUVs": nail_uvs, "tattooUV": tattoo_uv,
        "skeleton": {
            "names": joint_names, "parents": parents,
            "restT": [[round(float(x),6) for x in t] for t in rest_t],
            "restR": [[round(float(x),6) for x in r] for r in rest_r],
            "ibmB64": base64.b64encode(ibm.astype("<f4").tobytes()).decode("ascii"),
            "morphJoints": morph_joints,
        },
        "meshToc": mesh_toc, "anims": anims,
        "texB64": {k: base64.b64encode(v).decode("ascii") for k, v in tex_blobs.items()},
    }
    mbytes = json.dumps(manifest, separators=(",", ":")).encode("utf-8")
    while len(mbytes) % 4 != 0:
        mbytes += b" "
    raw_pack = struct.pack("<I", len(mbytes)) + mbytes + bytes(mesh_blobs)
    zpack = zlib.compress(raw_pack, level=9)
    with open(OUT_BIN, "wb") as f: f.write(zpack)

    zb64 = base64.b64encode(zpack).decode("ascii")
    js_content = f"""/* Endless Vigil — CC0 Humanoid & Tactical Kit v1.2 (Auto-generated by build-cc0-humanoid-kit.py) */
(function(root, factory){{
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EV_HUMANOID_KIT_PACK = factory();
}})(typeof self !== 'undefined' ? self : this, function(){{
  return "{zb64}";
}});
"""
    with open(OUT_JS, "w") as f: f.write(js_content)

    print("=== CC0 HUMANOID KIT COMPILED (v1.2) ===")
    print(f"Raw pack: {len(raw_pack)//1024} KB -> Zlib compressed: {len(zpack)//1024} KB -> JS UMD: {len(js_content)//1024} KB")
    print(f"Textures packed ({len(tex_blobs)}): {sum(len(v) for v in tex_blobs.values())//1024} KB")
    for k, m in mesh_catalog.items():
        print(f"  mesh {k:20s}: verts={m['vcount']:5d} tris={m['icount']//3:5d} morphs={len(m.get('morphs', {})):2d}")

if __name__ == "__main__":
    main()
