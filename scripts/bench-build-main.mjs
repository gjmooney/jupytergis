/**
 * Time each step of the monorepo build on main (tspc, no tsc-alias).
 *
 *   node scripts/bench-build-main.mjs
 *   node scripts/bench-build-main.mjs --package base
 *   node scripts/bench-build-main.mjs --prod
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = path.resolve(import.meta.dirname, '..');
const bin = path.join(root, 'node_modules', '.bin');

function arg (name) {
	return process.argv.includes(name);
}

function argValue (name, fallback) {
	const index = process.argv.indexOf(name);
	if (index === -1) {
		return fallback;
	}
	return process.argv[index + 1];
}

const packageFilter = argValue('--package', 'all');
const useProd = arg('--prod');
const labextension = useProd
	? 'build:labextension'
	: 'build:labextension:dev';

const env = {
	...process.env,
	PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
};

/**
 * @typedef {{ package: string, step: string, cwd: string, command: string }} Step
 */

/** @type {Step[]} */
const steps = [
	{
		package: 'schema',
		step: 'build:processing',
		cwd: 'packages/schema',
		command: 'pnpm run build:processing',
	},
	{
		package: 'schema',
		step: 'cacheGeoJSONSchema',
		cwd: 'packages/schema',
		command: 'node ./cacheGeoJSONSchema.js',
	},
	{
		package: 'schema',
		step: 'build:schema:registry',
		cwd: 'packages/schema',
		command: 'pnpm run build:schema:registry',
	},
	{
		package: 'schema',
		step: 'build:schema:js',
		cwd: 'packages/schema',
		command: 'pnpm run build:schema:js',
	},
	{
		package: 'schema',
		step: 'build:schema:py',
		cwd: 'packages/schema',
		command: 'pnpm run build:schema:py',
	},
	{
		package: 'schema',
		step: 'tsc -b',
		cwd: 'packages/schema',
		command: 'tsc -b',
	},
	{
		package: 'base',
		step: 'build:tailwind',
		cwd: 'packages/base',
		command: 'pnpm run build:tailwind',
	},
	{
		package: 'base',
		step: 'build:gallery',
		cwd: 'packages/base',
		command: 'pnpm run build:gallery',
	},
	{
		package: 'base',
		step: 'tspc -b',
		cwd: 'packages/base',
		command: 'tspc -b',
	},
	{
		package: 'base',
		step: 'cp:gdal',
		cwd: 'packages/base',
		command: 'pnpm run cp:gdal',
	},
	{
		package: 'jupytergis_core',
		step: 'tsc',
		cwd: 'python/jupytergis_core',
		command: 'tsc --sourceMap',
	},
	{
		package: 'jupytergis_core',
		step: labextension,
		cwd: 'python/jupytergis_core',
		command: `pnpm run ${labextension}`,
	},
	{
		package: 'jupytergis_lab',
		step: 'tsc',
		cwd: 'python/jupytergis_lab',
		command: 'tsc --sourceMap',
	},
	{
		package: 'jupytergis_lab',
		step: labextension,
		cwd: 'python/jupytergis_lab',
		command: `pnpm run ${labextension}`,
	},
	{
		package: 'jupytergis_qgis',
		step: 'tsc',
		cwd: 'python/jupytergis_qgis',
		command: 'tsc --sourceMap',
	},
	{
		package: 'jupytergis_qgis',
		step: labextension,
		cwd: 'python/jupytergis_qgis',
		command: `pnpm run ${labextension}`,
	},
];

function seconds (value) {
	return `${value.toFixed(3)}s`;
}

function runStep (step) {
	const cwd = path.join(root, step.cwd);
	const started = performance.now();
	const result = spawnSync(step.command, {
		cwd,
		env,
		shell: true,
		stdio: 'inherit',
	});
	const wall = (performance.now() - started) / 1000;
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(
			`${step.package}/${step.step} failed (exit ${result.status})`,
		);
	}
	return wall;
}

const selected = steps.filter(step => {
	if (packageFilter === 'all') {
		return true;
	}
	return step.package === packageFilter;
});

if (selected.length === 0) {
	throw new Error(
		`No steps for --package ${packageFilter}. ` +
			'Try: schema, base, jupytergis_core, jupytergis_lab, jupytergis_qgis',
	);
}

console.log(`Steps: ${selected.length}`);
console.log(`Filter: ${packageFilter}`);
console.log(`Labextension: ${labextension}`);
console.log('');

const rows = [];
const totalStarted = performance.now();

for (const step of selected) {
	const label = `${step.package} / ${step.step}`;
	process.stdout.write(`→ ${label}\n`);
	const wall = runStep(step);
	rows.push({ label, wall });
	console.log(`  wall ${seconds(wall)}\n`);
}

const total = (performance.now() - totalStarted) / 1000;
const ranked = [...rows].sort((a, b) => b.wall - a.wall);

const header = ['step', 'wall', 'share'];
const body = ranked.map(row => [
	row.label,
	seconds(row.wall),
	`${((row.wall / total) * 100).toFixed(1)}%`,
]);
body.push(['TOTAL', seconds(total), '100%']);

const widths = header.map((cell, index) => {
	return Math.max(cell.length, ...body.map(line => line[index].length));
});
const format = line => line.map((cell, index) => {
	return index === 0
		? cell.padEnd(widths[index])
		: cell.padStart(widths[index]);
}).join('  ');

console.log(format(header));
for (const line of body) {
	console.log(format(line));
}
