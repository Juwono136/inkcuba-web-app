/**
 * Preload for the BullMQ worker so Next.js `server-only` packages
 * can be imported under plain Node/tsx (not a React Client Component).
 *
 * Usage: tsx --require ./scripts/shim-server-only.cjs scripts/workspace-worker.ts
 */
"use strict";

const Module = require("node:module");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(id) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};
