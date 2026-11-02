const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const file = path.join(__dirname, 'Euclid.lean');
const source = fs.readFileSync(file, 'utf8');
const uri = 'file:///MathlibDemo/Euclid.lean';
const endpoint = 'wss://live.lean-lang.org/websocket/MathlibDemo';
const transcript = [];
const ws = new WebSocket(endpoint);
let finished = false;
let finalDiagnostics = [];
let processingComplete = false;
function send(message) {
  ws.send(JSON.stringify({ jsonrpc: '2.0', ...message }));
}
function finish(ok, reason) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  const report = {
    checkedAt: new Date().toISOString(), endpoint,
    file: 'Euclid.lean',
    sha256: crypto.createHash('sha256').update(source).digest('hex'),
    success: ok, reason, diagnostics: finalDiagnostics, transcript,
  };
  fs.writeFileSync(path.join(__dirname, 'Euclid.verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, transcript: undefined }, null, 2));
  ws.close();
  process.exitCode = ok ? 0 : 1;
}
const timer = setTimeout(() => finish(false, 'Timed out waiting for complete Lean diagnostics'), 45000);
ws.addEventListener('open', () => {
  send({ id: 1, method: 'initialize', params: {
    processId: null, rootUri: 'file:///MathlibDemo',
    capabilities: { textDocument: { publishDiagnostics: { versionSupport: true } } },
    initializationOptions: { hasWidgets: false },
  }});
});
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  transcript.push(msg);
  if (msg.method && msg.id !== undefined) {
    send({ id: msg.id, result: null });
  }
  if (!msg.method && msg.id === 1) {
    if (msg.error) return finish(false, 'Lean initialization failed');
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri, languageId: 'lean4', version: 1, text: source },
    }});
  }
  if (msg.method === 'textDocument/publishDiagnostics' && msg.params.uri === uri) {
    finalDiagnostics = msg.params.diagnostics;
  }
  if (msg.method === '$/lean/fileProgress' && msg.params.textDocument.uri === uri) {
    processingComplete = msg.params.processing.length === 0;
  }
  if (processingComplete) {
    const axiomMessages = finalDiagnostics.filter(d => d.message.includes('depends on axioms'));
    if (axiomMessages.length >= 2) {
      const errors = finalDiagnostics.filter(d => d.severity === 1);
      const unsafe = axiomMessages.some(d => d.message.includes('sorryAx'));
      finish(errors.length === 0 && !unsafe,
        errors.length ? 'Lean reported errors' : unsafe ? 'Proof depends on sorryAx' : 'File processing complete; both axiom commands completed without errors or sorryAx');
    }
  }
});
ws.addEventListener('error', event => finish(false, String(event.message || 'WebSocket connection error')));
ws.addEventListener('close', () => { if (!finished) finish(false, 'Connection closed before verification completed'); });
