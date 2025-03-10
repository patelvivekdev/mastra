import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import { fileURLToPath } from 'node:url';
import { rollup, type InputOptions, type OutputOptions } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

import type { analyzeBundle } from './analyze';
import { libSqlFix } from './plugins/fix-libsql';
import { removeDeployer } from './plugins/remove-deployer';
import { telemetryFix } from './plugins/telemetry-fix';

export async function getInputOptions(
  entryFile: string,
  analyzedBundleInfo: Awaited<ReturnType<typeof analyzeBundle>>,
  platform: 'node' | 'browser',
): Promise<InputOptions> {
  let nodeResolvePlugin =
    platform === 'node'
      ? nodeResolve({
          preferBuiltins: true,
          exportConditions: ['node', 'import', 'require'],
          mainFields: ['module', 'main'],
        })
      : nodeResolve({
          preferBuiltins: false,
          exportConditions: ['browser', 'import', 'require'],
          mainFields: ['module', 'main'],
          browser: true,
        });

  return {
    logLevel: process.env.MASTRA_BUNDLER_DEBUG === 'true' ? 'debug' : 'silent',
    treeshake: true,
    preserveSymlinks: true,
    external: Array.from(analyzedBundleInfo.externalDependencies),
    plugins: [
      telemetryFix(),
      libSqlFix(),
      {
        name: 'alias-optimized-deps',
        // @ts-ignore
        resolveId(id) {
          if (!analyzedBundleInfo.dependencies.has(id)) {
            return null;
          }

          const isInvalidChunk = analyzedBundleInfo.invalidChunks.has(analyzedBundleInfo.dependencies.get(id)!);
          if (isInvalidChunk) {
            return {
              id,
              external: true,
            };
          }

          return {
            id: '.mastra/.build/' + analyzedBundleInfo.dependencies.get(id)!,
            external: false,
          };
        },
      },
      alias({
        entries: [
          {
            find: /^\#server$/,
            replacement: fileURLToPath(import.meta.resolve('@mastra/deployer/server')).replaceAll('\\', '/'),
          },
          { find: /^\#mastra$/, replacement: entryFile.replaceAll('\\', '/') },
        ],
      }),
      nodeResolvePlugin,
      // for debugging
      // {
      //   name: 'logger',
      //   //@ts-ignore
      //   resolveId(id, ...args) {
      //     console.log({ id, args });
      //   },
      //   // @ts-ignore
      //   transform(code, id) {
      //     if (code.includes('class Duplexify ')) {
      //       console.log({ duplex: id });
      //     }
      //   },
      // },
      json(),
      esbuild({
        target: 'node20',
        platform,
        minify: false,
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
      }),
      removeDeployer(entryFile),
      // treeshake unused imports
      esbuild({
        include: entryFile,
        target: 'node20',
        platform,
        minify: false,
      }),
    ].filter(Boolean),
  } satisfies InputOptions;
}

export async function createBundler(
  inputOptions: InputOptions,
  outputOptions: Partial<OutputOptions> & { dir: string },
) {
  const bundler = await rollup(inputOptions);

  return {
    write: () => {
      return bundler.write({
        ...outputOptions,
        format: 'esm',
        entryFileNames: '[name].mjs',
        chunkFileNames: '[name].mjs',
      });
    },
    close: () => {
      return bundler.close();
    },
  };
}
