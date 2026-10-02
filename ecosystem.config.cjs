module.exports = {
  apps: [
    {
      name: "inkcuba-web",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "1G",
    },
    {
      name: "inkcuba-worker",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "--require ./scripts/shim-server-only.cjs scripts/workspace-worker.ts",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
    },
  ],
};
