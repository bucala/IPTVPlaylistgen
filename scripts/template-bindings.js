// Zero-dependency check that every identifier the in-DOM Vue template reads is returned
// from setup(). With the production build a missing binding is silently `undefined`, and
// dereferencing it (e.g. `sourcesPanelOpen.toString()`) crashes the whole render: blank screen.

const TEMPLATE_GLOBALS = new Set(('Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,'
  + 'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,Object,Boolean,String,'
  + 'RegExp,Map,Set,JSON,Intl,BigInt,console,Error,Symbol').split(','));
const KEYWORDS = new Set('true,false,null,this,typeof,instanceof,in,of,new,void,delete,if,else,return,let,const,var,function,await,async'.split(','));

function decodeEntities(value) {
  return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function tokenize(code) {
  const tokens = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
      tokens.push({ type: 'str' });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      // template literal: ${...} parts are analysed as parenthesised sub-expressions
      tokens.push({ type: 'str' });
      let j = i + 1;
      while (j < code.length && code[j] !== '`') {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === '$' && code[j + 1] === '{') {
          let depth = 1;
          let k = j + 2;
          while (k < code.length && depth) {
            if (code[k] === '{') depth++;
            else if (code[k] === '}') depth--;
            k++;
          }
          tokens.push({ type: 'punct', value: '+' }, { type: 'punct', value: '(' }, ...tokenize(code.slice(j + 2, k - 1)), { type: 'punct', value: ')' });
          j = k;
          continue;
        }
        j++;
      }
      i = j + 1;
      continue;
    }
    const num = code.slice(i).match(/^(?:0[xX][\da-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/);
    if (num && /[\d.]/.test(c)) {
      tokens.push({ type: 'num' });
      i += num[0].length;
      continue;
    }
    const ident = code.slice(i).match(/^[A-Za-z_$][\w$]*/);
    if (ident) {
      tokens.push({ type: 'id', value: ident[0] });
      i += ident[0].length;
      continue;
    }
    const op = code.slice(i).match(/^(?:\?\.(?!\d)|=>|\.\.\.|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\S)/)[0];
    tokens.push({ type: 'punct', value: op });
    i += op.length;
  }
  return tokens;
}

// Identifiers an expression reads from the component context
function freeIdentifiers(code) {
  const tokens = tokenize(code);
  const params = new Set();
  tokens.forEach((tok, i) => {
    if (tok.value !== '=>') return;
    const prev = tokens[i - 1];
    if (prev?.type === 'id') params.add(prev.value);
    else if (prev?.value === ')') {
      let depth = 0;
      for (let k = i - 1; k >= 0; k--) {
        if (tokens[k].value === ')') depth++;
        else if (tokens[k].value === '(') { if (--depth === 0) break; }
        else if (depth === 1 && tokens[k].type === 'id') params.add(tokens[k].value);
      }
    }
  });

  const found = new Set();
  const brackets = [];
  tokens.forEach((tok, i) => {
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (tok.type === 'punct') {
      if (tok.value === '{') brackets.push(prev?.value === '=>' ? 'block' : 'object');
      else if (tok.value === '(' || tok.value === '[') brackets.push(tok.value);
      else if (tok.value === '}' || tok.value === ')' || tok.value === ']') brackets.pop();
      return;
    }
    if (tok.type !== 'id') return;
    if (prev && (prev.value === '.' || prev.value === '?.')) return;
    const isObjectKey = brackets[brackets.length - 1] === 'object' && next?.value === ':' && (prev?.value === '{' || prev?.value === ',');
    if (isObjectKey || KEYWORDS.has(tok.value) || TEMPLATE_GLOBALS.has(tok.value) || tok.value.startsWith('$') || params.has(tok.value)) return;
    found.add(tok.value);
  });
  return found;
}

// Identifiers read by the #app template (v-for aliases excluded)
function templateBindings(html) {
  const template = html.slice(html.indexOf('<div id="app"'), html.indexOf('</div><!-- /app -->'));
  const expressions = [...template.matchAll(/\{\{([\s\S]*?)\}\}/g)].map((m) => m[1]);
  const locals = new Set();
  for (const [, name, value] of template.matchAll(/\s(v-[\w-]+(?::[\w-]+)?(?:\.[\w-]+)*|[:@][\w.:-]+)\s*=\s*"([^"]*)"/g)) {
    const code = decodeEntities(value);
    if (name === 'v-for') {
      const [, aliases, source] = code.match(/^\s*\(?([^)]*?)\)?\s+(?:in|of)\s+([\s\S]+)$/);
      aliases.split(',').map((a) => a.trim()).filter(Boolean).forEach((a) => locals.add(a));
      expressions.push(source);
    } else {
      expressions.push(code);
    }
  }
  const used = new Set();
  expressions.forEach((code) => freeIdentifiers(code).forEach((id) => { if (!locals.has(id)) used.add(id); }));
  return used;
}

// Names in the object returned from setup() (the last `return {` before mount)
function setupBindings(html) {
  const mountIdx = html.lastIndexOf(".mount('#app')");
  const start = html.lastIndexOf('return {', mountIdx) + 'return {'.length;
  let depth = 1;
  let end = start;
  while (end < html.length && depth) {
    if (html[end] === '{') depth++;
    else if (html[end] === '}') depth--;
    end++;
  }
  return new Set(html.slice(start, end - 1)
    .replace(/\/\/[^\n]*/g, '')
    .split(',')
    .map((entry) => entry.trim().split(':')[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name)));
}

module.exports = { templateBindings, setupBindings, freeIdentifiers };
