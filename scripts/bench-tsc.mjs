/**
 * Time tsc on one package for TypeScript 5, 6, and 7.
 *
 * Cold: no tsbuildinfo. Incremental: a comment is appended to one
 * source file, then the file is restored.
 * Emit goes to a temp outDir, so package lib/ is left alone.
 *
 *   node scripts/bench-tsc.mjs
 *   node scripts/bench-tsc.mjs --project packages/base --runs 3
 */
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const root = path.resolve(import.meta.dirname, '..');

function arg (name, fallback) {
	const index = process.argv.indexOf(name);
	if (index === -1) {
		return fallback;
	}
	return process.argv[index + 1];
}

const projectDir = path.resolve(root, arg('--project', 'packages/base'));
const runs = Number(arg('--runs', '3'));
const tsconfig = path.join(projectDir, 'tsconfig.json');
const cacheDir = path.join(tmpdir(), 'jupytergis-tsc-bench');

function ensureTypeScript5 () {
	const prefix = path.join(cacheDir, 'ts5');
	const bin = path.join(
		prefix,
		'node_modules',
		'typescript',
		'bin',
		'tsc',
	);
	if (existsSync(bin)) {
		return bin;
	}
	mkdirSync(prefix, { recursive: true });
	const result = spawnSync(
		'npm',
		[
			'install',
			'--prefix',
			prefix,
			'typescript@5',
			'--no-fund',
			'--no-audit',
			'--ignore-scripts',
		],
		{ stdio: 'inherit' },
	);
	if (result.status !== 0) {
		throw new Error('Failed to install TypeScript 5');
	}
	return bin;
}

function versionOf (bin) {
	const result = spawnSync(bin, ['--version'], { encoding: 'utf8' });
	const text = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	const match = text.match(/(\d+\.\d+\.\d+)/);
	return match ? match[1] : text.trim();
}

function findTouchFile (dir) {
	const preferred = path.join(dir, 'src', 'commands', 'about.tsx');
	if (existsSync(preferred)) {
		return preferred;
	}
	const stack = [path.join(dir, 'src')];
	while (stack.length > 0) {
		const current = stack.pop();
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
				continue;
			}
			if (
				(entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
				!entry.name.endsWith('.d.ts')
			) {
				return full;
			}
		}
	}
	throw new Error(`No TypeScript file to touch under ${dir}`);
}

function clearBuildInfo (dir) {
	for (const name of readdirSync(dir)) {
		if (name.endsWith('.tsbuildinfo')) {
			unlinkSync(path.join(dir, name));
		}
	}
}

function metric (text, name) {
	const aggregate = text.match(
		new RegExp(`Aggregate ${name}:\\s+([0-9.]+)s`),
	);
	if (aggregate) {
		return Number(aggregate[1]);
	}
	const single = text.match(new RegExp(`(?:^|\\n)${name}:\\s+([0-9.]+)s`));
	return single ? Number(single[1]) : null;
}

function runTsc (bin, outDir) {
	const buildInfo = path.join(outDir, 'tsconfig.tsbuildinfo');
	const started = performance.now();
	const result = spawnSync(
		bin,
		[
			'-p',
			tsconfig,
			'--outDir',
			outDir,
			'--tsBuildInfoFile',
			buildInfo,
			'--pretty',
			'false',
			'--diagnostics',
		],
		{ encoding: 'utf8' },
	);
	const wall = (performance.now() - started) / 1000;
	const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
	if (result.status !== 0) {
		return { ok: false, wall, output };
	}
	return {
		ok: true,
		wall,
		check: metric(output, 'Check time'),
		emit: metric(output, 'Emit time'),
		total: metric(output, 'Total time'),
	};
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
	if (value === null || Number.isNaN(value)) {
		return '   n/a';
	}
	return `${value.toFixed(3)}s`;
}

function bench (label, bin) {
	const outDir = path.join(cacheDir, `out-${label.replace(/\s+/g, '')}`);
	const cold = [];
	const incremental = [];
	for (let index = 1; index <= runs; index += 1) {
		rmSync(outDir, { recursive: true, force: true });
		clearBuildInfo(projectDir);
		const coldRun = runTsc(bin, outDir);
		if (!coldRun.ok) {
			console.error(coldRun.output.trim());
			throw new Error(`${label} cold run ${index} failed`);
		}
		cold.push(coldRun);
		console.log(
			`${label} cold ${index}/${runs}  check ${seconds(coldRun.check)}  wall ${seconds(coldRun.wall)}`,
		);

		writeFileSync(touchFile, `${original}\n// bench-tsc\n`);
		const incrementalRun = runTsc(bin, outDir);
		writeFileSync(touchFile, original);
		if (!incrementalRun.ok) {
			console.error(incrementalRun.output.trim());
			throw new Error(`${label} incremental run ${index} failed`);
		}
		incremental.push(incrementalRun);
		console.log(
			`${label} incr ${index}/${runs}  check ${seconds(incrementalRun.check)}  wall ${seconds(incrementalRun.wall)}`,
		);
	}
	return {
		label,
		coldCheck: median(cold.map(run => run.check)),
		coldEmit: median(cold.map(run => run.emit)),
		coldWall: median(cold.map(run => run.wall)),
		incrCheck: median(incremental.map(run => run.check)),
		incrEmit: median(incremental.map(run => run.emit)),
		incrWall: median(incremental.map(run => run.wall)),
	};
}

if (!existsSync(tsconfig)) {
	throw new Error(`Missing ${tsconfig}`);
}
if (!Number.isInteger(runs) || runs < 1) {
	throw new Error('--runs must be a positive integer');
}

const touchFile = findTouchFile(projectDir);
const original = readFileSync(touchFile, 'utf8');

const compilers = [
	['TS 5', ensureTypeScript5()],
	['TS 6', path.join(root, 'node_modules', '.bin', 'tsc6')],
	['TS 7', path.join(root, 'node_modules', '.bin', 'tsc')],
];

console.log(`Project: ${path.relative(root, projectDir)}`);
console.log(`Edit:    ${path.relative(root, touchFile)}`);
console.log(`Runs:    ${runs} (median)`);
for (const [label, bin] of compilers) {
	console.log(`${label}: ${versionOf(bin)}`);
}
console.log('');

try {
	const rows = compilers.map(([label, bin]) => bench(label, bin));
	const header = [
		'compiler',
		'cold check',
		'cold emit',
		'cold wall',
		'incr check',
		'incr emit',
		'incr wall',
	];
	const body = rows.map(row => [
		row.label,
		seconds(row.coldCheck),
		seconds(row.coldEmit),
		seconds(row.coldWall),
		seconds(row.incrCheck),
		seconds(row.incrEmit),
		seconds(row.incrWall),
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
} finally {
	writeFileSync(touchFile, original);
	clearBuildInfo(projectDir);
}
