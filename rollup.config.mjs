import cleanup from 'rollup-plugin-cleanup';
import swc from '@rollup/plugin-swc';
import path from 'node:path';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    {
      name: 'typescript-extension-resolver',
      resolveId(source, importer) {
        if (importer && source.startsWith('.') && source.endsWith('.js')) {
          return path.resolve(
            path.dirname(importer),
            `${source.slice(0, -3)}.ts`,
          );
        }

        return null;
      },
    },
    cleanup({ comments: 'none', extensions: ['.ts'] }),
    swc({ jsc: { parser: { syntax: 'typescript' }, target: 'es2020' } }),
  ],
  context: 'this',
};
