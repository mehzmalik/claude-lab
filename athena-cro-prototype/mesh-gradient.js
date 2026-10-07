/*
 * Mesh-gradient runtime for the athenahealth CRO prototype.
 *
 * The Figma file paints its blobs with a "Mesh gradient" shader fill (a 4x4
 * Catmull-Rom colour mesh, interpolated in linear light, 4x MSAA). This file
 * contains:
 *
 *   1. Figma's shader `setup` / `render` functions, copied VERBATIM from the
 *      design context (CodeComponentId_…_428). They run on WebGPU.
 *   2. A tiny stand-in for Figma's React <ShaderFill> runtime (device
 *      acquisition, canvas configuration, DPR-aware resize, SVG mask
 *      processing) written in plain JS.
 *   3. A CPU fallback that evaluates the exact same Catmull-Rom / linear-light
 *      math on a 2D canvas for browsers without WebGPU (Safari < 26, Firefox).
 *
 * Usage:  <div class="mesh" data-mesh="A" data-mask="assets/ellipse54-v2.svg"></div>
 *         data-mesh = key in MESH_PARAMS; data-mask (optional) = SVG used as alpha mask.
 */

/* ------------------------------------------------------------------ */
/* 1. Figma shader source (verbatim)                                   */
/* ------------------------------------------------------------------ */
function setup(device, frame) {
    var meshWgsl = `
struct Uniforms {
  frameData: vec4f,
  inputDimsData: vec4f,
  p00: vec4f,  p00Color: vec4f,
  p10: vec4f,  p10Color: vec4f,
  p20: vec4f,  p20Color: vec4f,
  p30: vec4f,  p30Color: vec4f,
  p01: vec4f,  p01Color: vec4f,
  p11: vec4f,  p11Color: vec4f,
  p21: vec4f,  p21Color: vec4f,
  p31: vec4f,  p31Color: vec4f,
  p02: vec4f,  p02Color: vec4f,
  p12: vec4f,  p12Color: vec4f,
  p22: vec4f,  p22Color: vec4f,
  p32: vec4f,  p32Color: vec4f,
  p03: vec4f,  p03Color: vec4f,
  p13: vec4f,  p13Color: vec4f,
  p23: vec4f,  p23Color: vec4f,
  p33: vec4f,  p33Color: vec4f,
  reserved0: vec4f,
  reserved1: vec4f,
  reserved2: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

fn cr1(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
  return 0.5*((2.0*p1) + (-p0+p2)*t + (2.0*p0-5.0*p1+4.0*p2-p3)*t*t + (-p0+3.0*p1-3.0*p2+p3)*t*t*t);
}
fn cr2(p0: vec2f, p1: vec2f, p2: vec2f, p3: vec2f, t: f32) -> vec2f {
  return vec2f(cr1(p0.x,p1.x,p2.x,p3.x,t), cr1(p0.y,p1.y,p2.y,p3.y,t));
}
fn cr4(p0: vec4f, p1: vec4f, p2: vec4f, p3: vec4f, t: f32) -> vec4f {
  return vec4f(cr1(p0.x,p1.x,p2.x,p3.x,t), cr1(p0.y,p1.y,p2.y,p3.y,t), cr1(p0.z,p1.z,p2.z,p3.z,t), cr1(p0.w,p1.w,p2.w,p3.w,t));
}
fn ix(i: i32, j: i32, cols: i32, rows: i32) -> i32 {
  let ci = clamp(i, 0, cols - 1);
  let cj = clamp(j, 0, rows - 1);
  return cj * cols + ci;
}
fn srgb2lin(c: vec3f) -> vec3f {
  let lo = c / 12.92;
  let hi = pow((c + 0.055) / 1.055, vec3f(2.4));
  return select(lo, hi, c > vec3f(0.04045));
}
fn lin2srgb(c: vec3f) -> vec3f {
  let lo = c * 12.92;
  let hi = 1.055 * pow(clamp(c, vec3f(0.0), vec3f(1.0)), vec3f(1.0/2.4)) - 0.055;
  return select(lo, hi, c > vec3f(0.0031308));
}

@vertex fn vs_main(@location(0) st: vec2f) -> VsOut {
  var pos_arr: array<vec2f, 16>;
  var col_arr: array<vec4f, 16>;
  pos_arr[0]  = u.p00.xy / 100.0; col_arr[0]  = vec4f(srgb2lin(u.p00Color.rgb), u.p00Color.a);
  pos_arr[1]  = u.p10.xy / 100.0; col_arr[1]  = vec4f(srgb2lin(u.p10Color.rgb), u.p10Color.a);
  pos_arr[2]  = u.p20.xy / 100.0; col_arr[2]  = vec4f(srgb2lin(u.p20Color.rgb), u.p20Color.a);
  pos_arr[3]  = u.p30.xy / 100.0; col_arr[3]  = vec4f(srgb2lin(u.p30Color.rgb), u.p30Color.a);
  pos_arr[4]  = u.p01.xy / 100.0; col_arr[4]  = vec4f(srgb2lin(u.p01Color.rgb), u.p01Color.a);
  pos_arr[5]  = u.p11.xy / 100.0; col_arr[5]  = vec4f(srgb2lin(u.p11Color.rgb), u.p11Color.a);
  pos_arr[6]  = u.p21.xy / 100.0; col_arr[6]  = vec4f(srgb2lin(u.p21Color.rgb), u.p21Color.a);
  pos_arr[7]  = u.p31.xy / 100.0; col_arr[7]  = vec4f(srgb2lin(u.p31Color.rgb), u.p31Color.a);
  pos_arr[8]  = u.p02.xy / 100.0; col_arr[8]  = vec4f(srgb2lin(u.p02Color.rgb), u.p02Color.a);
  pos_arr[9]  = u.p12.xy / 100.0; col_arr[9]  = vec4f(srgb2lin(u.p12Color.rgb), u.p12Color.a);
  pos_arr[10] = u.p22.xy / 100.0; col_arr[10] = vec4f(srgb2lin(u.p22Color.rgb), u.p22Color.a);
  pos_arr[11] = u.p32.xy / 100.0; col_arr[11] = vec4f(srgb2lin(u.p32Color.rgb), u.p32Color.a);
  pos_arr[12] = u.p03.xy / 100.0; col_arr[12] = vec4f(srgb2lin(u.p03Color.rgb), u.p03Color.a);
  pos_arr[13] = u.p13.xy / 100.0; col_arr[13] = vec4f(srgb2lin(u.p13Color.rgb), u.p13Color.a);
  pos_arr[14] = u.p23.xy / 100.0; col_arr[14] = vec4f(srgb2lin(u.p23Color.rgb), u.p23Color.a);
  pos_arr[15] = u.p33.xy / 100.0; col_arr[15] = vec4f(srgb2lin(u.p33Color.rgb), u.p33Color.a);

  let uu = st.x * 3.0;
  let vv = st.y * 3.0;
  let i = clamp(i32(floor(uu)), 0, 2);
  let j = clamp(i32(floor(vv)), 0, 2);
  let fu = uu - f32(i);
  let fv = vv - f32(j);

  var prow: array<vec2f, 4>;
  var crow: array<vec4f, 4>;
  for (var m = 0; m < 4; m = m + 1) {
    let jj = j - 1 + m;
    let a0 = pos_arr[ix(i-1, jj, 4, 4)];
    let a1 = pos_arr[ix(i,   jj, 4, 4)];
    let a2 = pos_arr[ix(i+1, jj, 4, 4)];
    let a3 = pos_arr[ix(i+2, jj, 4, 4)];
    prow[m] = cr2(a0, a1, a2, a3, fu);
    let c0 = col_arr[ix(i-1, jj, 4, 4)];
    let c1 = col_arr[ix(i,   jj, 4, 4)];
    let c2 = col_arr[ix(i+1, jj, 4, 4)];
    let c3 = col_arr[ix(i+2, jj, 4, 4)];
    crow[m] = cr4(c0, c1, c2, c3, fu);
  }
  let pos = cr2(prow[0], prow[1], prow[2], prow[3], fv);
  let col = cr4(crow[0], crow[1], crow[2], crow[3], fv);

  var out: VsOut;
  out.position = vec4f(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0, 0.0, 1.0);
  out.color = vec4f(col.rgb, clamp(col.a, 0.0, 1.0));
  return out;
}

@fragment fn fs_main(in: VsOut) -> @location(0) vec4f {
  let lin = clamp(in.color.rgb, vec3f(0.0), vec3f(1.0));
  let alpha = in.color.a;
  return vec4f(lin2srgb(lin), alpha);
}
`;
    var resolveWgsl = `
@group(0) @binding(0) var ms: texture_multisampled_2d<f32>;

@vertex fn vs_resolve(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[vid], 0.0, 1.0);
}

@fragment fn fs_resolve(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let coord = vec2i(i32(fragCoord.x), i32(fragCoord.y));
  let n = 4;
  var accColor = vec3f(0.0);
  var accAlpha = 0.0;
  for (var s = 0; s < n; s = s + 1) {
    let t = textureLoad(ms, coord, s);
    accColor = accColor + t.rgb * t.a;
    accAlpha = accAlpha + t.a;
  }
  let rgb = accColor / max(accAlpha, 1e-5);
  let a = accAlpha / f32(n);
  return vec4f(rgb, a);
}
`;
    frame.state.module = device.createShaderModule({ code: meshWgsl });
    frame.state.resolveModule = device.createShaderModule({ code: resolveWgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
    frame.state.resolvePipeline = null;
    frame.state.resolveFormat = null;
    frame.state.tess = 0;
    frame.state.vbuf = null;
    frame.state.ibuf = null;
    frame.state.indexCount = 0;
    frame.state.msTex = null;
    frame.state.msW = 0;
    frame.state.msH = 0;
    frame.state.msFmt = null;
    frame.state.uniformBuf = device.createBuffer({
        size: 592,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
}

function render(device, frame) {
    var params = frame.params || {};
    function finiteNumber(value, fallback) {
        var num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }
    function numberParam(name, fallback) {
        return finiteNumber(params[name], fallback);
    }
    function colorPointParam(name, fallback) {
        var value = params[name] || {};
        var color = value.color || {};
        return [
            finiteNumber(value.x, fallback[0]),
            finiteNumber(value.y, fallback[1]),
            0,
            0,
            finiteNumber(color.r, fallback[2]),
            finiteNumber(color.g, fallback[3]),
            finiteNumber(color.b, fallback[4]),
            finiteNumber(color.a, fallback[5]),
        ];
    }
    var output = frame.output || {};
    var width = Math.max(1, finiteNumber(output.width, 1));
    var height = Math.max(1, finiteNumber(output.height, 1));
    var outputFormat = frame.output.format;
    var tess = Math.max(8, Math.min(256, Math.round(numberParam("tessellation", 128))));
    if (frame.state.tess !== tess || frame.state.vbuf == null) {
        var N = tess + 1;
        var vdata = new Float32Array(N * N * 2);
        var o = 0;
        for (var b = 0; b < N; b++) {
            for (var a = 0; a < N; a++) {
                vdata[o++] = a / tess;
                vdata[o++] = b / tess;
            }
        }
        var idata = new Uint32Array(tess * tess * 6);
        o = 0;
        for (var b2 = 0; b2 < tess; b2++) {
            for (var a2 = 0; a2 < tess; a2++) {
                var i0 = b2 * N + a2, i1 = i0 + 1, i2 = i0 + N, i3 = i2 + 1;
                idata[o++] = i0;
                idata[o++] = i2;
                idata[o++] = i1;
                idata[o++] = i1;
                idata[o++] = i2;
                idata[o++] = i3;
            }
        }
        if (frame.state.vbuf && frame.state.vbuf.destroy)
            frame.state.vbuf.destroy();
        if (frame.state.ibuf && frame.state.ibuf.destroy)
            frame.state.ibuf.destroy();
        frame.state.vbuf = device.createBuffer({
            size: vdata.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(frame.state.vbuf, 0, vdata);
        frame.state.ibuf = device.createBuffer({
            size: idata.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(frame.state.ibuf, 0, idata);
        frame.state.indexCount = idata.length;
        frame.state.tess = tess;
    }
    if (frame.state.msTex == null || frame.state.msW !== width ||
        frame.state.msH !== height || frame.state.msFmt !== outputFormat) {
        if (frame.state.msTex && frame.state.msTex.destroy)
            frame.state.msTex.destroy();
        frame.state.msTex = device.createTexture({
            size: { width: width, height: height },
            format: outputFormat,
            sampleCount: 4,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
        });
        frame.state.msW = width;
        frame.state.msH = height;
        frame.state.msFmt = outputFormat;
    }
    device.queue.writeBuffer(frame.state.uniformBuf, 0, new Float32Array([
        0, width, height, 0,
        width, height, 0, 0,
        ...colorPointParam("p00", [0, 0, 1, 0.42, 0.42, 1]),
        ...colorPointParam("p10", [33, 0, 1, 0.64, 0.42, 1]),
        ...colorPointParam("p20", [67, 0, 1, 0.82, 0.42, 1]),
        ...colorPointParam("p30", [100, 0, 1, 0.82, 0.4, 1]),
        ...colorPointParam("p01", [0, 33, 0.7, 0.3, 0.6, 1]),
        ...colorPointParam("p11", [33, 33, 0.8, 0.55, 0.5, 1]),
        ...colorPointParam("p21", [67, 33, 0.9, 0.7, 0.45, 1]),
        ...colorPointParam("p31", [100, 33, 0.5, 0.7, 0.35, 1]),
        ...colorPointParam("p02", [0, 67, 0.4, 0.5, 0.7, 1]),
        ...colorPointParam("p12", [33, 67, 0.35, 0.65, 0.65, 1]),
        ...colorPointParam("p22", [67, 67, 0.2, 0.65, 0.55, 1]),
        ...colorPointParam("p32", [100, 67, 0.1, 0.55, 0.7, 1]),
        ...colorPointParam("p03", [0, 100, 0.02, 0.84, 0.63, 1]),
        ...colorPointParam("p13", [33, 100, 0.1, 0.7, 0.65, 1]),
        ...colorPointParam("p23", [67, 100, 0.1, 0.6, 0.7, 1]),
        ...colorPointParam("p33", [100, 100, 0.07, 0.54, 0.7, 1]),
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
    ]));
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
                entryPoint: 'vs_main',
                buffers: [{ arrayStride: 8, attributes: [{ shaderLocation: 0, format: 'float32x2', offset: 0 }] }],
            },
            fragment: { module: frame.state.module, entryPoint: 'fs_main', targets: [{ format: outputFormat }] },
            primitive: { topology: 'triangle-list' },
            multisample: { count: 4 },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    if (frame.state.resolvePipeline == null || frame.state.resolveFormat !== outputFormat) {
        frame.state.resolvePipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: { module: frame.state.resolveModule, entryPoint: 'vs_resolve' },
            fragment: { module: frame.state.resolveModule, entryPoint: 'fs_resolve', targets: [{ format: outputFormat }] },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.resolveFormat = outputFormat;
    }
    var meshBind = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: frame.state.uniformBuf } }],
    });
    var resolveBind = device.createBindGroup({
        layout: frame.state.resolvePipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: frame.state.msTex.createView() }],
    });
    var encoder = device.createCommandEncoder();
    var pass1 = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.state.msTex.createView(),
                loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store',
            }],
    });
    pass1.setPipeline(frame.state.pipeline);
    pass1.setBindGroup(0, meshBind);
    pass1.setVertexBuffer(0, frame.state.vbuf);
    pass1.setIndexBuffer(frame.state.ibuf, 'uint32');
    pass1.drawIndexed(frame.state.indexCount);
    pass1.end();
    var pass2 = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store',
            }],
    });
    pass2.setPipeline(frame.state.resolvePipeline);
    pass2.setBindGroup(0, resolveBind);
    pass2.draw(3);
    pass2.end();
    device.queue.submit([encoder.finish()]);
}

/* ------------------------------------------------------------------ */
/* Mesh parameter sets (copied from the Figma design context)          */
/* ------------------------------------------------------------------ */
const C = (r, g, b) => ({ r, g, b, a: 1 });
const BASE = {
  p00: { x: 0,   y: 0,   color: C(0.6117647290229797, 0.1568627506494522, 0.6941176652908325) },
  p10: { x: 33,  y: 0,   color: C(0.3843137323856354, 0.18431372940540314, 0.7058823704719543) },
  p20: { x: 67,  y: 0,   color: C(0.5686274766921997, 0.4274509847164154, 0.7960784435272217) },
  p30: { x: 100, y: 0,   color: C(0.8039215803146362, 0.5764706134796143, 0.8470588326454163) },
  p01: { x: 0,   y: 33,  color: C(0.699999988079071, 0.30000001192092896, 0.6000000238418579) },
  p11: { x: 33,  y: 33,  color: C(0.8039215803146362, 0.5764706134796143, 0.8470588326454163) },
  p21: { x: 67,  y: 33,  color: C(0.8039215803146362, 0.5764706134796143, 0.8470588326454163) },
  p31: { x: 100, y: 33,  color: C(0.8078431487083435, 0.9137254953384399, 0.9411764740943909) },
  p02: { x: 0,   y: 67,  color: C(0.9333333373069763, 0.5411764979362488, 0.7411764860153198) },
  p22: { x: 67,  y: 67,  color: C(0.5686274766921997, 0.4274509847164154, 0.7960784435272217) },
  p32: { x: 100, y: 67,  color: C(0.8823529481887817, 0.7490196228027344, 0.9098039269447327) },
  p03: { x: 0,   y: 100, color: C(0.9058823585510254, 0.8784313797950745, 0.95686274766922) },
  p13: { x: 33,  y: 100, color: C(0.8039215803146362, 0.5764706134796143, 0.8470588326454163) },
  p33: { x: 100, y: 100, color: C(0.07000000029802322, 0.5400000214576721, 0.699999988079071) },
};
export const MESH_PARAMS = {
  // Lower layer of the blob (rendered at opacity .9 in Figma)
  A: {
    ...BASE,
    p12: { x: 33, y: 67,  color: C(0.9372549057006836, 0.9176470637321472, 0.9686274528503418) },
    p23: { x: 67, y: 100, color: C(0.6117647290229797, 0.1568627506494522, 0.6941176652908325) },
    tessellation: 256,
  },
  // Upper layer of the blob, also used for the photo-card overlay and footer logo
  B: {
    ...BASE,
    p12: { x: 33, y: 67,  color: C(0.6117647290229797, 0.1568627506494522, 0.6941176652908325) },
    p23: { x: 67, y: 100, color: C(0.8156862854957581, 0.7568627595901489, 0.9137254953384399) },
    tessellation: 234,
  },
};
MESH_PARAMS.B256 = { ...MESH_PARAMS.B, tessellation: 256 };

/* ------------------------------------------------------------------ */
/* 2. Minimal runtime (stand-in for Figma's React ShaderFill)          */
/* ------------------------------------------------------------------ */
let devicePromise = null;
function acquireDevice() {
  if (!devicePromise) {
    devicePromise = (async () => {
      const gpu = navigator.gpu;
      if (!gpu) throw new Error('WebGPU unsupported.');
      const adapter = await gpu.requestAdapter();
      if (!adapter) throw new Error('Failed to get WebGPU adapter.');
      return adapter.requestDevice();
    })();
    devicePromise.catch(() => { devicePromise = null; });
  }
  return devicePromise;
}

async function mountWebGPU(canvas, params) {
  const device = await acquireDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('Failed to get WebGPU context.');
  const format = 'rgba8unorm';
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const frame = { state: {}, params, output: null, input: null, time: 0, deltaTime: 0, frame: 0,
                  mousePosition: { x: 0, y: 0, down: false }, renderScale: 1, gpu: { device, context, format } };
  setup(device, frame);

  const draw = () => {
    if (canvas.width < 1 || canvas.height < 1) return;
    frame.output = context.getCurrentTexture();
    render(device, frame);
  };
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.devicePixelContentBoxSize && entry.devicePixelContentBoxSize[0];
      if (box) {
        canvas.width = Math.max(box.inlineSize, 1);
        canvas.height = Math.max(box.blockSize, 1);
      } else {
        const dpr = window.devicePixelRatio || 1;
        const cb = entry.contentBoxSize[0];
        canvas.width = Math.max(Math.round(cb.inlineSize * dpr), 1);
        canvas.height = Math.max(Math.round(cb.blockSize * dpr), 1);
      }
    }
    draw();
  });
  ro.observe(canvas, { box: 'device-pixel-content-box' });
}

/* ------------------------------------------------------------------ */
/* 3. CPU fallback — identical Catmull-Rom / linear-light math         */
/* ------------------------------------------------------------------ */
const ORDER = ['p00','p10','p20','p30','p01','p11','p21','p31','p02','p12','p22','p32','p03','p13','p23','p33'];
const cr1 = (p0, p1, p2, p3, t) =>
  0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const srgb2lin = (c) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
const lin2srgb = (c) => { c = Math.min(Math.max(c, 0), 1); return c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : c * 12.92; };
const clampI = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function meshToImageData(params, size) {
  const col = ORDER.map((k) => { const c = params[k].color; return [srgb2lin(c.r), srgb2lin(c.g), srgb2lin(c.b), c.a]; });
  const ix = (i, j) => clampI(j, 0, 3) * 4 + clampI(i, 0, 3);
  const img = new ImageData(size, size);
  const d = img.data;
  const crow = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  for (let y = 0; y < size; y++) {
    const vv = (y / (size - 1)) * 3;
    const j = clampI(Math.floor(vv), 0, 2);
    const fv = vv - j;
    for (let x = 0; x < size; x++) {
      const uu = (x / (size - 1)) * 3;
      const i = clampI(Math.floor(uu), 0, 2);
      const fu = uu - i;
      for (let m = 0; m < 4; m++) {
        const jj = j - 1 + m;
        const c0 = col[ix(i - 1, jj)], c1 = col[ix(i, jj)], c2 = col[ix(i + 1, jj)], c3 = col[ix(i + 2, jj)];
        for (let k = 0; k < 4; k++) crow[m][k] = cr1(c0[k], c1[k], c2[k], c3[k], fu);
      }
      const o = (y * size + x) * 4;
      d[o]     = Math.round(lin2srgb(cr1(crow[0][0], crow[1][0], crow[2][0], crow[3][0], fv)) * 255);
      d[o + 1] = Math.round(lin2srgb(cr1(crow[0][1], crow[1][1], crow[2][1], crow[3][1], fv)) * 255);
      d[o + 2] = Math.round(lin2srgb(cr1(crow[0][2], crow[1][2], crow[2][2], crow[3][2], fv)) * 255);
      d[o + 3] = Math.round(clampI(cr1(crow[0][3], crow[1][3], crow[2][3], crow[3][3], fv), 0, 1) * 255);
    }
  }
  return img;
}

function mountCPU(canvas, params) {
  const size = 256;
  const off = document.createElement('canvas');
  off.width = size; off.height = size;
  off.getContext('2d').putImageData(meshToImageData(params, size), 0, 0);
  const ctx = canvas.getContext('2d');
  const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(Math.round(r.width * dpr), 1);
    canvas.height = Math.max(Math.round(r.height * dpr), 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
  };
  new ResizeObserver(draw).observe(canvas);
}

/* ------------------------------------------------------------------ */
/* Mask processing (mirrors Figma's mask.ts: force every fill black)   */
/* ------------------------------------------------------------------ */
const maskCache = new Map();
async function processMask(url) {
  if (!maskCache.has(url)) {
    maskCache.set(url, (async () => {
      const text = await fetch(url).then((r) => r.text());
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      const style = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = '* { fill: black !important; }';
      svg.appendChild(style);
      return `url("data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}")`;
    })());
  }
  return maskCache.get(url);
}

/* ------------------------------------------------------------------ */
/* Bootstrap: <div class="mesh" data-mesh="A|B" data-mask="…svg">      */
/* ------------------------------------------------------------------ */
export async function mountAll(root = document) {
  const hosts = [...root.querySelectorAll('[data-mesh]')];
  for (const host of hosts) {
    const params = MESH_PARAMS[host.dataset.mesh] || MESH_PARAMS.B;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none;';
    host.appendChild(canvas);
    if (host.dataset.mask) {
      processMask(host.dataset.mask).then((m) => {
        host.style.webkitMaskImage = m; host.style.maskImage = m;
        host.style.webkitMaskSize = '100% 100%'; host.style.maskSize = '100% 100%';
        host.style.webkitMaskRepeat = 'no-repeat'; host.style.maskRepeat = 'no-repeat';
      });
    }
    try {
      if (!navigator.gpu) throw new Error('WebGPU unsupported.');
      await mountWebGPU(canvas, params);
      host.dataset.renderer = 'webgpu';
    } catch (e) {
      console.warn('[mesh-gradient] WebGPU unavailable, using CPU fallback:', e.message);
      mountCPU(canvas, params);
      host.dataset.renderer = 'cpu';
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll());
else mountAll();
