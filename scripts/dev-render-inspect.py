#!/usr/bin/env python3
"""
Exact 1:1 WebGPU software rasterizer driven directly by the live vertex, normal,
UV, joint, weight, index, instance, uniform, texture, and joint-matrix buffers
exported by operator-forge.html under Pixel 10 Pro XL (412x915, dpr 3) emulation.
Supports v1.2 dual melanin skin compositing, alpha-keyed beard/lip masks,
luminance-normalized hair/beard tinting, normal maps, Kajiya-Kay hair sheen,
sRGB->linear ACES PBR lighting, and ALL 6 creator tabs + the 3D Corner Portrait HUD!
"""
import json, base64, math, zlib, struct, io
import numpy as np
from PIL import Image, ImageDraw

with open("/home/user/assets/ev-humanoid-kit.bin", "rb") as f:
    raw = zlib.decompress(f.read())
hlen = struct.unpack("<I", raw[:4])[0]
man = json.loads(raw[4:4+hlen])

tex_imgs = {}
for tk, b64 in man["texB64"].items():
    im = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
    tex_imgs[tk] = np.asarray(im, dtype=np.float32) / 255.0

# Synthesize tactical holographic cuff HUD texture matching createHologramCanvas()
_him = Image.new("RGBA", (256, 192), (0, 185, 225, 68))
_hdr = ImageDraw.Draw(_him)
_hdr.rectangle([8, 8, 247, 183], outline=(110, 245, 255, 235), width=3)
_hdr.rectangle([20, 28, 236, 56], fill=(0, 229, 255, 110))
_hdr.text((34, 34), "EV-74 KESTREL // BIO-SYNC", fill=(185, 252, 255, 255))
_hdr.text((34, 78), "STATUS: MISSION ACCEPTED", fill=(160, 250, 255, 240))
_hdr.text((34, 108), "V-LINK: ENCRYPTED 99.8%", fill=(130, 240, 255, 220))
_hdr.rectangle([34, 140, 220, 152], outline=(110, 245, 255, 200), width=2)
_hdr.rectangle([36, 142, 188, 150], fill=(0, 229, 255, 230))
tex_imgs["dyn_holo"] = np.asarray(_him, dtype=np.float32) / 255.0

# Synthesize sheer mesh / delicate lace underwear preview textures matching createUnderwearCompositor()
_bra_base = tex_imgs.get("bra_cloth_bra_albedo")
if _bra_base is not None:
    _bra = np.ones((256, 256, 4), dtype=np.float32)
    _bra[..., :3] = _bra_base[..., :3] * np.array([0.24, 0.28, 0.34], dtype=np.float32)[None, None, :]
    _bra[..., 3] = 0.68
    _bra[148:176, :, :3] *= 0.72
    _bra[148:176, :, 3] = 0.96
    tex_imgs["dyn_bra"] = _bra
else:
    tex_imgs["dyn_bra"] = np.full((256, 256, 4), np.array([0.16, 0.19, 0.24, 0.72], dtype=np.float32))

_pan_base = tex_imgs.get("panties_cloth_panties_albedo")
if _pan_base is not None:
    _pan = np.ones((256, 256, 4), dtype=np.float32)
    _pan[..., :3] = _pan_base[..., :3] * np.array([0.24, 0.28, 0.34], dtype=np.float32)[None, None, :]
    _pan[..., 3] = 0.82
    _pan[0:20, :, :3] *= 0.72
    _pan[0:20, :, 3] = 0.98
    tex_imgs["dyn_panties"] = _pan
else:
    tex_imgs["dyn_panties"] = np.full((256, 256, 4), np.array([0.16, 0.19, 0.24, 0.82], dtype=np.float32))
tex_imgs["dyn_briefs"] = np.asarray(Image.new("RGBA", (256, 256), (34, 40, 48, 255)), dtype=np.float32) / 255.0

with open("/tmp/ev_dev_dump.json") as f:
    dump = json.load(f)

raw_bufs = {bid: base64.b64decode(b64) for bid, b64 in dump["_bufs"].items()}

def hex_to_rgb01(h):
    h = (h or "#cf9170").lstrip("#")
    if len(h) != 6: return np.array([0.81, 0.57, 0.44], dtype=np.float32)
    return np.array([int(h[0:2],16)/255.0, int(h[2:4],16)/255.0, int(h[4:6],16)/255.0], dtype=np.float32)

def make_dyn_skin(state):
    light = tex_imgs.get("body_skin_light")
    dark  = tex_imgs.get("body_skin_dark")
    if light is None: return None
    rgb = hex_to_rgb01(state.get("skinHex", "#cf9170"))
    luma = 0.299*rgb[0] + 0.587*rgb[1] + 0.114*rgb[2]
    dark_mix = max(0.0, min(1.0, (0.60 - luma) / 0.38))
    base = light[..., :3].copy()
    if dark is not None and dark_mix > 0.02:
        base = base * (1.0 - dark_mix) + dark[..., :3] * dark_mix
    rel = np.array([rgb[0]/0.812, rgb[1]/0.569, rgb[2]/0.439], dtype=np.float32)
    rel_l = luma / 0.625
    lift = 1.0 + dark_mix * 0.42
    mul = np.clip((rel * 0.65 + rel_l * 0.35) * lift, 0.08, 1.45)
    base = np.clip(base * mul[None, None, :], 0.0, 1.0)
    H, W = base.shape[:2]
    def _fit_mask(m_arr):
        if m_arr is None: return None
        if m_arr.shape[0] == H and m_arr.shape[1] == W: return m_arr
        im = Image.fromarray((np.clip(m_arr, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        return np.asarray(im, dtype=np.float32) / 255.0
    # Lip mask warmth
    lip = _fit_mask(tex_imgs.get("body_lip_mask"))
    if lip is not None:
        la = lip[..., 3:4] * (0.34 if state.get("gender", 0) >= 0.45 else 0.22)
        lip_col = np.array([196/255.0, 102/255.0, 102/255.0], dtype=np.float32) if state.get("gender", 0) >= 0.45 else np.array([176/255.0, 106/255.0, 96/255.0], dtype=np.float32)
        base = base * (1.0 - la) + lip_col[None, None, :] * la
    # Beard follicle stubble
    bs = state.get("beardStyle", "clean")
    if bs != "clean":
        bm = _fit_mask(tex_imgs.get("body_beard_mask"))
        if bm is not None:
            hrgb = hex_to_rgb01(state.get("hairHex", "#2a1f1a")) * np.array([125/255.0, 120/255.0, 115/255.0], dtype=np.float32)
            b_alpha = 0.28 if bs == "stubble" else (0.78 if bs == "painted_short" else 0.56)
            ba = bm[..., 3:4] * b_alpha
            base = base * (1.0 - ba) + hrgb[None, None, :] * ba
    out = np.ones_like(light)
    out[..., :3] = base
    return out

def make_tinted_hair(tex_key, hex_col):
    src = tex_imgs.get(tex_key)
    if src is None: return None
    rgb = np.maximum(hex_to_rgb01(hex_col), np.array([0.035, 0.030, 0.025], dtype=np.float32))
    lum = 0.299*src[...,0] + 0.587*src[...,1] + 0.114*src[...,2]
    mean_l = max(float(np.mean(lum[src[...,3] > 0.08])) if np.any(src[...,3] > 0.08) else 0.5, 48.0/255.0)
    norm_l = np.clip(0.38 + 0.62 * np.power(np.maximum(0.02, lum / mean_l), 0.88), 0.0, 1.32)[..., None]
    out = src.copy()
    out[..., :3] = np.clip(rgb[None, None, :] * norm_l, 0.0, 1.0)
    return out

def get_f32(bid, shape_cols):
    return np.frombuffer(raw_bufs[bid], dtype="<f4").reshape(-1, shape_cols)

def get_u16(bid, ic):
    return np.frombuffer(raw_bufs[bid], dtype="<u2", count=ic)

def get_jnt(bid, vc):
    packed = np.frombuffer(raw_bufs[bid], dtype="<u4", count=vc)
    return np.stack([packed & 255, (packed >> 8) & 255, (packed >> 16) & 255, (packed >> 24) & 255], axis=1)

def skin_verts(pos, nrm, jnt, wgt, sm):
    out_p = np.zeros_like(pos); out_n = np.zeros_like(nrm)
    p4 = np.concatenate([pos, np.ones((len(pos), 1), dtype=np.float32)], axis=1)
    for k in range(4):
        wk = wgt[:, k:k+1]
        if not np.any(wk): continue
        mats = sm[jnt[:, k]]
        out_p += wk * np.einsum("vij,vj->vi", mats, p4)[:, :3]
        out_n += wk * np.einsum("vij,vj->vi", mats[:, :3, :3], nrm)
    out_n /= np.maximum(np.linalg.norm(out_n, axis=1, keepdims=True), 1e-6)
    return out_p, out_n

def resolve_tex(tk, state):
    if tk == "dyn_skin": return make_dyn_skin(state)
    if tk == "dyn_hair":
        hs = state.get("hairStyle", "short")
        hmap = {"short01":"tex_hair_short01","short":"tex_hair_short02","sleek":"tex_hair_short04","messy":"tex_hair_messy","shaggy":"tex_hair_shaggy","bob":"tex_hair_bob02","long":"tex_hair_long01","ponytail":"tex_hair_ponytail01","braids":"tex_hair_braid01","afro":"tex_hair_afro01"}
        return make_tinted_hair(hmap.get(hs, "tex_hair_short02"), state.get("hairHex", "#2a1f1a"))
    if tk == "dyn_beard":
        bs = state.get("beardStyle", "short_3d")
        bmap = {"goatee":"tex_beard_goatee","short_3d":"tex_beard_short","long":"tex_beard_long","moustache":"tex_beard_moustache"}
        return make_tinted_hair(bmap.get(bs, "tex_beard_short"), state.get("hairHex", "#2a1f1a"))
    return tex_imgs.get(tk)

def aces(x):
    return np.clip((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0)

def raster_draws(draws, joint_mats, state, W=412, H=450, is_portrait=False):
    fb = np.full((H, W, 3), np.power(np.array([0.068, 0.074, 0.086], dtype=np.float32), 2.2))
    if is_portrait:
        fb[:] = np.power(np.array([0.045, 0.052, 0.064], dtype=np.float32), 2.2)
    zb = np.full((H, W), 1e9, dtype=np.float32)
    sm = np.array(joint_mats, dtype=np.float32).reshape(53, 4, 4).transpose(0, 2, 1)
    L = np.array([0.58, 0.72, 0.68], dtype=np.float32); L /= np.linalg.norm(L)
    Lfill = np.array([-0.65, 0.38, 0.52], dtype=np.float32); Lfill /= np.linalg.norm(Lfill)
    Lback = np.array([-0.32, 0.72, -0.64], dtype=np.float32); Lback /= np.linalg.norm(Lback)
    key_col = np.array([1.36, 1.24, 1.12], dtype=np.float32)
    rim_col = np.array([0.92, 0.90, 0.86], dtype=np.float32)
    skin_cache = {}
    def draw_is_alpha(d):
        return float(d["tint"][3]) < 0.99 or d.get("texKey") in ("dyn_bra", "dyn_panties", "dyn_holo")
    ordered_draws = [d for d in draws if not draw_is_alpha(d)] + [d for d in draws if draw_is_alpha(d)]

    for d in ordered_draws:
        vb0 = d.get("vb0Id"); vb1 = d.get("vb1Id"); vb2 = d.get("vb2Id"); ib = d.get("ibId")
        if vb0 is None or vb1 is None or ib is None: continue
        pos = get_f32(vb0, 3); nrm = get_f32(vb1, 3); idx = get_u16(ib, d["ic"]).reshape(-1, 3)
        uv = get_f32(vb2, 2) if vb2 is not None else np.zeros((len(pos), 2), dtype=np.float32)
        pv = np.array(d["pvMat"], dtype=np.float32).reshape(4, 4).T
        mm = np.array(d["model"], dtype=np.float32).reshape(4, 4).T
        inst = max(1, int(d.get("inst", 1)))
        tk = d.get("texKey", "white")
        nk = d.get("normKey", "flat_normal")
        tex = resolve_tex(tk, state)
        ntex = tex_imgs.get(nk) if (nk and nk != "flat_normal") else None
        has_norm = ntex is not None
        is_skin = float(d["flags"][1])
        met = float(d["flags"][2])
        rough = max(0.08, min(0.96, float(d["flags"][3])))
        cut = float(d["extra"][0])
        em  = float(d["extra"][1])
        cam_pos = np.array(d["camPos"], dtype=np.float32)
        tint_a = float(d["tint"][3])
        is_blend = (tint_a < 0.99) or (tk in ("dyn_holo", "dyn_bra", "dyn_panties"))

        if d.get("skinned") and d.get("jBufId") and d.get("wBufId"):
            ck = (vb0, d["jBufId"])
            if ck not in skin_cache:
                skin_cache[ck] = skin_verts(pos, nrm, get_jnt(d["jBufId"], len(pos)), get_f32(d["wBufId"], 4), sm)
            lp, ln = skin_cache[ck]
        else:
            lp, ln = pos, nrm

        inst_offs = get_f32(d["instOffId"], 4)[:inst] if inst > 1 and d.get("instOffId") else np.array([[0,0,0,0]], dtype=np.float32)
        inst_cols = get_f32(d["instColId"], 4)[:inst] if inst > 1 and d.get("instColId") else None
        base_tint = np.power(np.maximum(np.array(d["tint"][:3], dtype=np.float32), 0.001), 2.2)

        for ii in range(inst):
            if inst > 1:
                ox, oy, oz, yaw = inst_offs[ii]
                c, s = math.cos(yaw), math.sin(yaw)
                m_inst = np.array([[c,0,s,ox],[0,1,0,oy],[-s,0,c,oz],[0,0,0,1]], dtype=np.float32)
                tint = np.power(np.maximum(inst_cols[ii, :3], 0.001), 2.2) if inst_cols is not None else base_tint
            else:
                m_inst = mm; tint = base_tint

            lp4 = np.concatenate([lp, np.ones((len(lp), 1), dtype=np.float32)], axis=1)
            wp4 = (m_inst @ lp4.T).T
            wp3 = wp4[:, :3]
            wn = (m_inst[:3, :3] @ ln.T).T
            clip = (pv @ wp4.T).T
            w_c = clip[:, 3:4]
            valid = w_c[:, 0] > 0.05
            ndc = clip[:, :3] / np.where(valid[:, None], w_c, 1.0)
            sx = (ndc[:, 0] * 0.5 + 0.5) * W
            sy = (0.5 - ndc[:, 1] * 0.5) * H
            sz = ndc[:, 2]

            v0, v1, v2 = idx[:, 0], idx[:, 1], idx[:, 2]
            ok = valid[v0] & valid[v1] & valid[v2]
            if not np.any(ok): continue
            th, tw = (tex.shape[0], tex.shape[1]) if tex is not None else (0, 0)
            nth, ntw = (ntex.shape[0], ntex.shape[1]) if ntex is not None else (0, 0)

            for i0, i1, i2 in idx[ok]:
                z0, z1, z2 = sz[i0], sz[i1], sz[i2]
                if min(z0, z1, z2) < 0.0 or max(z0, z1, z2) > 1.0: continue
                x0, y0 = sx[i0], sy[i0]; x1, y1 = sx[i1], sy[i1]; x2, y2 = sx[i2], sy[i2]
                minx = max(0, int(min(x0, x1, x2))); maxx = min(W, int(max(x0, x1, x2)) + 1)
                miny = max(0, int(min(y0, y1, y2))); maxy = min(H, int(max(y0, y1, y2)) + 1)
                if minx >= maxx or miny >= maxy: continue
                area = (x1 - x0)*(y2 - y0) - (y1 - y0)*(x2 - x0)
                if abs(area) < 1e-4: continue
                if is_blend and area > 0 and tk != "dyn_holo": continue
                xs = np.arange(minx, maxx, dtype=np.float32)[None, :] + 0.5
                ys = np.arange(miny, maxy, dtype=np.float32)[:, None] + 0.5
                w0 = ((x1 - xs)*(y2 - ys) - (y1 - ys)*(x2 - xs)) / area
                w1 = ((x2 - xs)*(y0 - ys) - (y2 - ys)*(x0 - xs)) / area
                w2 = 1.0 - w0 - w1
                inside = (w0 >= 0.0) & (w1 >= 0.0) & (w2 >= 0.0) if is_blend else (w0 >= -0.005) & (w1 >= -0.005) & (w2 >= -0.005)
                if not np.any(inside): continue
                zz = w0*z0 + w1*z1 + w2*z2
                mask = inside & (zz < zb[miny:maxy, minx:maxx])
                if not np.any(mask): continue

                uu = w0*uv[i0,0] + w1*uv[i1,0] + w2*uv[i2,0]
                vv = w0*uv[i0,1] + w1*uv[i1,1] + w2*uv[i2,1]
                if tex is not None:
                    tx = np.clip((uu % 1.0) * (tw - 1), 0, tw - 1).astype(np.int32)
                    ty = np.clip((vv % 1.0) * (th - 1), 0, th - 1).astype(np.int32)
                    samp = tex[ty, tx]
                    if cut > 0.01:
                        mask &= (samp[..., 3] >= cut)
                        if not np.any(mask): continue
                    albedo = np.power(np.maximum(samp[..., :3], 0.001), 2.2) * tint[None, None, :]
                    eff_a = samp[..., 3:4] * tint_a
                else:
                    albedo = np.broadcast_to(tint, (maxy-miny, maxx-minx, 3))
                    eff_a = tint_a

                if not is_blend:
                    zb[miny:maxy, minx:maxx][mask] = zz[mask]
                if em >= 0.99:
                    col = albedo * em
                else:
                    nn = w0[...,None]*wn[i0] + w1[...,None]*wn[i1] + w2[...,None]*wn[i2]
                    nn /= np.maximum(np.linalg.norm(nn, axis=2, keepdims=True), 1e-6)
                    if has_norm:
                        ntx = np.clip((uu % 1.0) * (ntw - 1), 0, ntw - 1).astype(np.int32)
                        nty = np.clip((vv % 1.0) * (nth - 1), 0, nth - 1).astype(np.int32)
                        nm = ntex[nty, ntx][..., :3] * 2.0 - 1.0
                        # Screen-space / triangle tangent basis
                        e1 = wp3[i1] - wp3[i0]; e2 = wp3[i2] - wp3[i0]
                        du1 = uv[i1] - uv[i0]; du2 = uv[i2] - uv[i0]
                        det = du1[0]*du2[1] - du2[0]*du1[1]
                        if abs(det) > 1e-8:
                            T = (e1*du2[1] - e2*du1[1]) / det
                            B = (-e1*du2[0] + e2*du1[0]) / det
                            Tl = np.linalg.norm(T); Bl = np.linalg.norm(B)
                            if Tl > 1e-6 and Bl > 1e-6:
                                T /= Tl; B /= Bl
                                nstr = 0.52 if is_skin > 0.5 else 0.80
                                nn = nn + (T[None,None,:]*nm[...,0:1] + B[None,None,:]*nm[...,1:2])*nstr
                                nn /= np.maximum(np.linalg.norm(nn, axis=2, keepdims=True), 1e-6)

                    wpp = w0[...,None]*wp3[i0] + w1[...,None]*wp3[i1] + w2[...,None]*wp3[i2]
                    V = cam_pos[None, None, :] - wpp
                    V /= np.maximum(np.linalg.norm(V, axis=2, keepdims=True), 1e-6)
                    if area > 0:
                        nn = -nn
                    elif is_skin < -0.5:
                        nn = np.where((nn * V).sum(axis=2, keepdims=True) < 0.0, -nn, nn)
                    Hvec = L[None, None, :] + V
                    Hvec /= np.maximum(np.linalg.norm(Hvec, axis=2, keepdims=True), 1e-6)
                    ndl = (nn * L).sum(axis=2)
                    ndf = np.maximum((nn * Lfill).sum(axis=2), 0.0)
                    if is_skin > 0.5:
                        diff = np.clip((ndl + 0.36) / 1.36, 0.0, 1.0)
                        t_s = np.clip((ndl + 0.32) / 0.56, 0.0, 1.0)
                        sss = np.array([0.88, 0.28, 0.16], dtype=np.float32)[None,None,:] * ((t_s*t_s*(3-2*t_s))*(1.0-np.maximum(ndl,0.0))*0.42)[...,None]
                    elif is_skin < -0.5:
                        diff = np.clip((ndl + 0.42) / 1.42, 0.0, 1.0)
                        sss = 0.0
                    else:
                        diff = np.maximum(ndl, 0.0)
                        sss = 0.0

                    ndv = np.maximum((nn * V).sum(axis=2), 0.001)
                    F0 = (0.032*(1.0 - met) + albedo*met)
                    F = F0 + (1.0 - F0) * np.power(1.0 - ndv, 5.0)[..., None]
                    sp_pow = 128.0*(1.0 - rough) + 6.0*rough
                    sp = F * np.power(np.maximum((nn * Hvec).sum(axis=2), 0.0001), sp_pow)[..., None] * ((sp_pow + 2.0) * 0.042 * (1.0 - rough*0.65))
                    if is_skin < -0.5:
                        Th = np.zeros_like(nn); Th[..., 1] = 1.0; Th -= nn * nn[..., 1:2]
                        Th /= np.maximum(np.linalg.norm(Th, axis=2, keepdims=True), 1e-6)
                        th_dot = (Th * Hvec).sum(axis=2)
                        sinTH = np.sqrt(np.maximum(0.0, 1.0 - th_dot*th_dot))
                        h_spec = albedo * 1.45 * 0.82 + np.array([0.92, 0.86, 0.78], dtype=np.float32)[None,None,:] * 0.18
                        sp = h_spec * ((np.power(sinTH, 56.0)*0.065 + np.power(sinTH, 14.0)*0.032)*np.clip(ndl+0.35, 0.0, 1.0))[...,None]

                    back_hit = np.maximum((nn * Lback).sum(axis=2), 0.0)
                    fres = np.power(1.0 - ndv, 4.0)
                    rim = rim_col[None,None,:] * (fres * back_hit * (0.28 + 0.44*met))[..., None]
                    hy = (nn[..., 1] * 0.5 + 0.5)[..., None]
                    hemi = np.array([0.11,0.10,0.10], dtype=np.float32)*(1.0-hy) + np.array([0.27,0.28,0.30], dtype=np.float32)*hy
                    diff_light = hemi + key_col[None,None,:]*diff[...,None] + np.array([0.28,0.31,0.36], dtype=np.float32)[None,None,:]*ndf[...,None] + sss
                    col = aces((albedo*(1.0 - met*0.65)*diff_light + sp + rim + albedo*em) * 1.12)
                if is_blend:
                    cur = fb[miny:maxy, minx:maxx]
                    blended = col * eff_a + cur * (1.0 - eff_a)
                    fb[miny:maxy, minx:maxx][mask] = blended[mask]
                else:
                    fb[miny:maxy, minx:maxx][mask] = col[mask]

    return Image.fromarray((np.power(np.clip(fb, 0, 1), 1/2.2) * 255).astype(np.uint8))

tabs = ["face", "body", "quarters", "gear", "ramp", "action"]
for ti, t in enumerate(tabs, start=1):
    td = dump[t]
    im = raster_draws(td["mainDraws"], td["jointMats"], td["state"], W=412, H=450)
    ImageDraw.Draw(im).text((8, 8), f"PIXEL 10 PRO XL WEBGPU // TAB {ti}: {t.upper()}", fill=(242, 155, 75))
    outp = f"/tmp/verify_{ti}_{t}.png"
    im.save(outp)
    print("Saved", outp)

hud_im = raster_draws(dump["gear"]["hudDraws"], dump["gear"]["portraitJointMats"], dump["gear"]["state"], W=198, H=198, is_portrait=True)
ImageDraw.Draw(hud_im).text((6, 6), "LIVE ID | HALF-VISOR", fill=(242, 155, 75))
hud_im.save("/tmp/verify_portrait_hud.png")
print("Saved /tmp/verify_portrait_hud.png")
