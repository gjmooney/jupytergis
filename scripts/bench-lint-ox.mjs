/**
 * Time Oxfmt and Oxlint the way `pnpm lint:check` runs them.
 *
 * Cold: first run. Warm: the run right after it.
 * Neither command writes source files.
 *
 *   node scripts/bench-lint-ox.mjs
 *   node scripts/bench-lint-ox.mjs --runs 3
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = path.resolve(import.meta.dirname, '..');
const oxfmtBin = path.join(root, 'node_modules', '.bin', 'oxfmt');
const oxlintBin = path.join(root, 'node_modules', '.bin', 'oxlint');
const oxfmtGlob = '**/*{.ts,.tsx,.js,.jsx,.css,.json,.md,.yml}';

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

function bench (label, bin, args) {
	const cold = [];
	const warm = [];
	for (let index = 1; index <= runs; index += 1) {
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

const tools = [
	['oxfmt', oxfmtBin, ['--check', oxfmtGlob]],
	['oxlint', oxlintBin, []],
];

console.log('Command: pnpm lint:check');
console.log(`Runs:    ${runs} (median)`);
console.log(`Oxfmt    ${versionOf(oxfmtBin)}`);
console.log(`Oxlint   ${versionOf(oxlintBin)}`);
console.log('');

const rows = tools.map(([label, bin, args]) => {
	return bench(label, bin, args);
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
