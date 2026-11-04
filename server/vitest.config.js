import { defineConfig } from 'vitest/config';

process.env.AWS_EC2_METADATA_DISABLED = 'true';
process.env.MONGOMS_SYSTEM_BINARY = '/opt/homebrew/bin/mongod';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    server: {
      deps: {
        inline: ['socket.io-client'],
      },
    },
  },
});
