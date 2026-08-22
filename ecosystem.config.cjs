module.exports = {
    apps: [
        {
            name: "discord-xats",
            script: "src/index.js",
            cwd: __dirname,
            interpreter: "node",
            instances: 1,
            exec_mode: "fork",
            watch: false,
            autorestart: true,
            min_uptime: "10s",
            max_restarts: 10,
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            kill_timeout: 20000,
            max_memory_restart: "256M",
            stop_exit_codes: [0],
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
