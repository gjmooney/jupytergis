/**
 * Time Prettier and ESLint the way `pnpm lint:check` runs them.
 *
 * Cold: empty cache. Warm: the cache from that cold run is kept.
 * Neither command writes source files. Cache files stay in tmp.
 *
 *   node scripts/bench-lint-pes.mjs
 *   node scripts/bench-lint-pes.mjs --runs 3
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = path.resolve(import.meta.dirname, '..');
const cacheDir = path.join(tmpdir(), 'jupytergis-lint-bench-pes');
const prettierBin = path.join(root, 'node_modules', '.bin', 'prettier');
const eslintBin = path.join(root, 'node_modules', '.bin', 'eslint');
const prettierGlob = '**/*{.ts,.tsx,.js,.jsx,.css,.json,.md,.yml}';

function arg (name, fallback) {
	const index = process.argv.indexOf(name);
	if (index === -1) {
		return fallback;
	}
	return process.argv[index + 1];
}

const runs = Number(arg('--runs', '3'));

function versionOf (bin) {
	const result = spawnSync(bin, ['--version'], {
		cwd: root,
		encoding: 'utf8',
	});
	return `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
}

function time (bin, args) {
	const started = performance.now();
	const result = spawnSync(bin, args, {
		cwd: root,
		encoding: 'utf8',
		maxBuffer: 50 * 1024 * 1024,
	});
	const wall = (performance.now() - started) / 1000;
	if (result.error) {
		return { ok: false, wall, output: String(result.error) };
	}
	if (result.status !== 0 && result.status !== 1) {
		const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
		return { ok: false, wall, output };
	}
	return { ok: true, wall, status: result.status };
}

function median (values) {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return (sorted[mid - 1] + sorted[mid]) / 2;
	}
	return sorted[mid];
}

function seconds (value) {
	return `${value.toFixed(3)}s`;
}

function bench (label, bin, args, cachePath) {
	const cold = [];
	const warm = [];
	for (let index = 1; index <= runs; index += 1) {
		rmSync(cachePath, { recursive: true, force: true });
		const coldRun = time(bin, args);
		if (!coldRun.ok) {
			console.error(coldRun.output.trim());
			throw new Error(`${label} cold run ${index} failed`);
		}
		cold.push(coldRun.wall);
		console.log(
			`${label} cold ${index}/${runs}  wall ${seconds(coldRun.wall)}`,
		);

		const warmRun = time(bin, args);
		if (!warmRun.ok) {
			console.error(warmRun.output.trim());
			throw new Error(`${label} warm run ${index} failed`);
		}
		warm.push(warmRun.wall);
		console.log(
			`${label} warm ${index}/${runs}  wall ${seconds(warmRun.wall)}`,
		);
	}
	return {
		label,
		cold: median(cold),
		warm: median(warm),
	};
}

if (!Number.isInteger(runs) || runs < 1) {
	throw new Error('--runs must be a positive integer');
}

mkdirSync(cacheDir, { recursive: true });

const tools = [
	[
		'prettier',
		prettierBin,
		[
			'--check',
			prettierGlob,
			'--cache',
			'--cache-location',
			path.join(cacheDir, 'prettier'),
		],
		path.join(cacheDir, 'prettier'),
	],
	[
		'eslint',
		eslintBin,
		[
			'.',
			'--ext',
			'.ts,.tsx',
			'--cache',
			'--cache-location',
			path.join(cacheDir, 'eslint'),
		],
		path.join(cacheDir, 'eslint'),
	],
];

console.log('Command: pnpm lint:check');
console.log(`Runs:    ${runs} (median)`);
console.log(`Prettier ${versionOf(prettierBin)}`);
console.log(`ESLint   ${versionOf(eslintBin)}`);
console.log('');

const rows = tools.map(([label, bin, args, cachePath]) => {
	return bench(label, bin, args, cachePath);
});

const header = ['tool', 'cold wall', 'warm wall'];
const body = rows.map(row => [
	row.label,
	seconds(row.cold),
	seconds(row.warm),
]);
const widths = header.map((cell, index) => {
	return Math.max(cell.length, ...body.map(line => line[index].length));
});
const format = line => line.map((cell, index) => {
	return cell.padStart(widths[index]);
}).join('  ');

console.log('');
console.log(format(header));
for (const line of body) {
	console.log(format(line));
}
