// Zero-dependency check for identifiers that the app's inline scripts read but never declare.
// A typo or a leftover name (e.g. `isFiltered`) is otherwise only found when a user clicks the
// button that runs that code. Scope-insensitive on purpose: a name declared anywhere counts as
// declared, so this finds names declared nowhere without false positives from scoping.

const KEYWORDS = new Set(('break case catch class const continue debugger default delete do else export extends '
  + 'finally for function if import in instanceof let new return super switch this throw try typeof var void '
  + 'while with yield async await of true false null get set static').split(' '));

const GLOBALS = new Set(('window document console Math JSON Date localStorage sessionStorage navigator location '
  + 'fetch setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame '
  + 'AbortController TextDecoder TextEncoder Blob URL URLSearchParams FileReader Promise Object Array Set Map '
  + 'WeakMap WeakSet String Number Boolean RegExp Error TypeError RangeError Intl Symbol BigInt parseInt '
  + 'parseFloat isNaN isFinite encodeURIComponent decodeURIComponent encodeURI decodeURI Infinity NaN '
  + 'undefined Vue DOMParser XMLSerializer Response Request Headers alert confirm prompt crypto performance '
  + 'structuredClone queueMicrotask globalThis self caches getComputedStyle matchMedia btoa atob Uint8Array '
  + 'ArrayBuffer ReadableStream Image File Event CustomEvent HTMLElement Node arguments').split(' '));

const STATEMENT_START = new Set('const let var function class return if for while do switch try throw else'.split(' '));

// Tokens: { t: 'id' | 'num' | 'str' | 'p', v }
function tokenize(src) {
  const out = [];
  let i = 0;
  const regexAllowed = () => {
    const prev = out[out.length - 1];
    if (!prev) return true;
    if (prev.t === 'num' || prev.t === 'str') return false;
    if (prev.t === 'id') return KEYWORDS.has(prev.v) && !['this', 'super', 'true', 'false', 'null'].includes(prev.v);
    return ![')', ']', '}'].includes(prev.v);
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; if (i < 2) break; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      out.push({ t: 'str' }); i = j + 1; continue;
    }
    if (c === '`') {
      out.push({ t: 'str' });
      let j = i + 1;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          let depth = 1, k = j + 2;
          while (k < src.length && depth) {
            if (src[k] === '{') depth++;
            else if (src[k] === '}') depth--;
            else if (src[k] === '`') { k++; while (k < src.length && src[k] !== '`') k += src[k] === '\\' ? 2 : 1; }
            else if (src[k] === "'" || src[k] === '"') { const q = src[k]; k++; while (k < src.length && src[k] !== q) k += src[k] === '\\' ? 2 : 1; }
            k++;
          }
          out.push({ t: 'p', v: '(' }, ...tokenize(src.slice(j + 2, k - 1)), { t: 'p', v: ')' });
          j = k; continue;
        }
        j++;
      }
      i = j + 1; continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, inClass = false;
      while (j < src.length && (src[j] !== '/' || inClass)) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        j++;
      }
      j++;
      while (/[a-z]/i.test(src[j] || '')) j++;
      out.push({ t: 'str' }); i = j; continue;
    }
    const num = src.slice(i).match(/^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+)n?/);
    if (num && /[\d.]/.test(c) && !(c === '.' && !/\d/.test(src[i + 1]))) { out.push({ t: 'num' }); i += num[0].length; continue; }
    const id = src.slice(i).match(/^[A-Za-z_$][\w$]*/);
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = src.slice(i).match(/^(?:\?\.(?!\d)|=>|\.\.\.|===|!==|\*\*=|\?\?=|\|\|=|&&=|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|[+\-*/%&|^]=|\S)/)[0];
    out.push({ t: 'p', v: op }); i += op.length;
  }
  return out;
}

function matching(tokens, from, open, close) {
  let depth = 0;
  for (let k = from; k < tokens.length; k++) {
    if (tokens[k].v === open) depth++;
    else if (tokens[k].v === close && --depth === 0) return k;
  }
  return tokens.length - 1;
}

function undefinedIdentifiers(src) {
  const tokens = tokenize(src);
  const declared = new Set();
  const declareIn = (a, b) => { for (let k = a; k <= b; k++) if (tokens[k].t === 'id' && !KEYWORDS.has(tokens[k].v)) declared.add(tokens[k].v); };

  tokens.forEach((tok, i) => {
    const next = tokens[i + 1];
    if (tok.t === 'id' && ['const', 'let', 'var'].includes(tok.v)) {
      // Each declarator: a binding pattern up to "=" / "of" / "in", then its initializer up to a
      // top-level "," (next declarator). For `const { a: b } = ...` both a and b get declared.
      let k = i + 1;
      while (k < tokens.length) {
        const start = k;
        let depth = 0;
        for (; k < tokens.length; k++) {
          const v = tokens[k].v;
          if (v === '{' || v === '[') depth++;
          else if (v === '}' || v === ']') depth--;
          else if (depth === 0 && (v === '=' || v === 'of' || v === 'in' || v === ';' || v === ',')) break;
        }
        declareIn(start, k - 1);
        if (tokens[k]?.v === ',') { k++; continue; }
        if (tokens[k]?.v !== '=') break;
        depth = 0;
        for (k++; k < tokens.length; k++) {
          const v = tokens[k].v;
          if (v === '(' || v === '[' || v === '{') depth++;
          else if (v === ')' || v === ']' || v === '}') { if (--depth < 0) break; }
          else if (depth === 0 && (v === ';' || STATEMENT_START.has(v))) break;
          else if (depth === 0 && v === ',') break;
        }
        if (tokens[k]?.v !== ',') break;
        k++;
      }
    }
    if (tok.t === 'id' && (tok.v === 'function' || tok.v === 'class') && next?.t === 'id') declared.add(next.v);
    if (tok.v === 'catch' && next?.v === '(') declareIn(i + 2, matching(tokens, i + 1, '(', ')'));
    if (tok.v === '(') {
      const close = matching(tokens, i, '(', ')');
      const after = tokens[close + 1]?.v;
      if (after === '=>' || (after === '{' && tokens[i - 1]?.t === 'id' && !KEYWORDS.has(tokens[i - 1].v)) || (after === '{' && tokens[i - 1]?.v === 'function')) {
        declareIn(i + 1, close);  // parameters (incl. defaults' identifiers — over-approximation)
      }
    }
    if (tok.v === '=>' && tokens[i - 1]?.t === 'id') declared.add(tokens[i - 1].v);
  });

  const missing = new Map();
  const braces = [];
  tokens.forEach((tok, i) => {
    const prev = tokens[i - 1], next = tokens[i + 1];
    if (tok.v === '{') {
      const objectLiteral = prev && ['=', '(', ',', ':', '[', '?', '||', '&&', '??', '...', 'return'].includes(prev.v);
      braces.push(objectLiteral ? 'object' : 'block');
      return;
    }
    if (tok.v === '}') { braces.pop(); return; }
    if (tok.t !== 'id' || KEYWORDS.has(tok.v) || GLOBALS.has(tok.v) || declared.has(tok.v)) return;
    if (prev && (prev.v === '.' || prev.v === '?.')) return;
    if (braces[braces.length - 1] === 'object' && (prev?.v === '{' || prev?.v === ',') && (next?.v === ':' || next?.v === '(')) return;  // key / method
    missing.set(tok.v, (missing.get(tok.v) || 0) + 1);
  });
  return missing;
}

// Undeclared names read by the inline <script> blocks of an HTML page (scripts share globals)
function inlineScriptUndefinedIdentifiers(html) {
  const code = html
    .split(/<script(?![^>]*src=)[^>]*>/i)
    .slice(1)
    .map((part) => part.split(/<\/script>/i)[0])
    .join('\n;\n');
  return undefinedIdentifiers(code);
}

module.exports = { tokenize, undefinedIdentifiers, inlineScriptUndefinedIdentifiers };
