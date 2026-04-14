module.exports = {
    apps: [
        {
            name: 'backend',
            cwd: './backend',
            script: 'server.js',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 4000
            },
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            autorestart: true,
            watch: false
        },
        {
            name: 'frontend',
            script: 'npm',
            args: 'start',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            error_file: './logs/frontend-error.log',
            out_file: './logs/frontend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            max_memory_restart: '1G',
            autorestart: true,
            watch: false
        }
    ]
};
