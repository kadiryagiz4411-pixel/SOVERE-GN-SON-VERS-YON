import { readFileSync, readdirSync } from 'fs';

const raw = readFileSync('appsumo_codes.txt', 'utf8');
const lines = raw.split('\n');
const body = lines.at(-1) === '' ? lines.slice(0, -1) : lines;
const formatOk = body.length === 5000
  && new Set(body).size === 5000
  && body.every((code) => /^SOV-[A-Z0-9]{8}$/.test(code))
  && !raw.includes('"')
  && !raw.includes(',')
  && !/^code/im.test(raw)
  && !/\s/.test(body.join(''));

console.log(JSON.stringify({
  lines: body.length,
  unique: new Set(body).size,
  formatOk,
  endsWithNewline: raw.endsWith('\n'),
  trailingBlank: raw.endsWith('\n\n'),
  batches: readdirSync('scripts/.sov-insert'),
}));
