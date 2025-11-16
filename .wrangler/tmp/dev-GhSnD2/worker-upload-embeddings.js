var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-SUHGEA/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// worker-upload-embeddings.ts
var TUTORS = [
  {
    id: 1,
    name: "Aung Nanda O",
    bio: "I also go by Nikki. Extrovert who enjoys helping others succeed. Skilled in Python, Java, JavaScript, React, HTML, CSS.",
    skills: ["Python", "Java", "JavaScript", "React", "HTML", "CSS"],
    mode: "online",
    availability: [
      { day: "Monday", time: "9:30-10:00", mode: "online" },
      { day: "Wednesday", time: "4:00-4:30", mode: "online" },
      { day: "Wednesday", time: "4:30-5:00", mode: "online" }
    ]
  },
  {
    id: 2,
    name: "Mei O",
    bio: "Aspiring AI & Linguistics researcher. Daily Arch Linux user. Passionate about Python, Linux, and machine learning concepts.",
    skills: ["Python", "Linux", "Debugging"],
    mode: "online",
    availability: [
      { day: "Monday", time: "10:00-10:30", mode: "online" },
      { day: "Wednesday", time: "2:00-2:30", mode: "online" },
      { day: "Friday", time: "11:00-11:30", mode: "online" }
    ]
  },
  {
    id: 3,
    name: "Chris H",
    bio: "Problem solver and travel enthusiast. Experienced with Python, Java, SQL, JavaScript, CSS, and MIPS assembly.",
    skills: ["Python", "Java", "SQL", "JavaScript", "CSS", "MIPS Assembly"],
    mode: "on campus",
    availability: [
      { day: "Monday", time: "10:00-10:30", mode: "on campus" },
      { day: "Tuesday", time: "2:00-2:30", mode: "on campus" },
      { day: "Thursday", time: "3:00-3:30", mode: "on campus" }
    ]
  },
  {
    id: 4,
    name: "Claire C",
    bio: "Second-year CS major. Swimmer, pianist, and board game lover. Excited to tutor programming fundamentals.",
    skills: ["Python", "C++", "Debugging"],
    mode: "on campus",
    availability: [
      { day: "Tuesday", time: "1:00-1:30", mode: "on campus" },
      { day: "Thursday", time: "2:00-2:30", mode: "on campus" },
      { day: "Friday", time: "10:00-10:30", mode: "on campus" }
    ]
  }
];
var worker_upload_embeddings_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          message: "Embeddings upload worker is running",
          tutorCount: TUTORS.length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.pathname === "/upload" && request.method === "POST") {
      try {
        if (TUTORS.length === 0) {
          return new Response(
            JSON.stringify({
              error: "No tutors found",
              message: "Please add tutor data to the worker file"
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        console.log(`Processing ${TUTORS.length} tutors...`);
        const vectors = [];
        for (const tutor of TUTORS) {
          try {
            const tutorText = `
Tutor: ${tutor.name}
Bio: ${tutor.bio}
Skills: ${tutor.skills.join(", ")}
Mode: ${tutor.mode}
Availability: ${tutor.availability.map((a) => `${a.day} ${a.time} (${a.mode})`).join(", ")}
            `.trim();
            const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.OPENAI_API_KEY}`
              },
              body: JSON.stringify({
                model: "text-embedding-3-small",
                input: tutorText
              })
            });
            if (!embeddingResponse.ok) {
              throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
            }
            const embeddingData = await embeddingResponse.json();
            const embedding = embeddingData.data[0].embedding;
            vectors.push({
              id: `tutor-${tutor.id}`,
              values: embedding,
              metadata: {
                tutorId: tutor.id,
                name: tutor.name,
                skills: tutor.skills,
                mode: tutor.mode
              }
            });
            console.log(`\u2705 Generated embedding for ${tutor.name}`);
          } catch (error) {
            console.error(`\u274C Failed to process ${tutor.name}:`, error);
          }
        }
        if (vectors.length === 0) {
          return new Response(
            JSON.stringify({ error: "Failed to generate any embeddings" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
        console.log(`Uploading ${vectors.length} vectors to Vectorize...`);
        const result = await env.VECTORIZE_INDEX.upsert(vectors);
        const uploadedCount = result?.count ?? vectors.length;
        console.log(`\u2705 Successfully uploaded ${uploadedCount} vectors`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Successfully uploaded ${uploadedCount} embeddings to Cloudflare Vectorize`,
            count: uploadedCount,
            vectorsProcessed: vectors.length,
            index: "ccsf-tutors-index"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      } catch (error) {
        console.error("Error:", error);
        return new Response(
          JSON.stringify({
            error: "Failed to upload embeddings",
            message: error instanceof Error ? error.message : "Unknown error"
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }
    return new Response("Not found", { status: 404 });
  }
};

// ../../../../usr/local/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-SUHGEA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_upload_embeddings_default;

// ../../../../usr/local/lib/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-SUHGEA/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker-upload-embeddings.js.map
