import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

class MockSocket {
    static OPEN = 1;
    readyState = 1;
    messages = [];
    accept() {}
    addEventListener() {}
    send(message) { this.messages.push(JSON.parse(message)); }
}

test('late peers receive stored SDP followed by all trickled candidates', async () => {
    const creatorWs = new MockSocket();
    const session = {
        offer: null, answer: null, creatorWs, joinerWs: null,
        creatorCandidates: [], joinerCandidates: [], createdAt: Date.now()
    };
    const context = {
        WebSocket: MockSocket,
        WebSocketPair: class {
            constructor() { this[0] = new MockSocket(); this[1] = new MockSocket(); }
        },
        Response: class { constructor(body, options) { Object.assign(this, options); } },
        URL, Date, Map, console
    };
    const source = await readFile(new URL('../session-manager.js', import.meta.url), 'utf8');
    vm.runInNewContext(source.replace('export class SessionManager', 'class SessionManager') + '\nthis.Manager = SessionManager;', context);
    const isolatedManager = new context.Manager({}, {});
    isolatedManager.sessions.set('ABC123', session);
    await isolatedManager.handleMessage('ABC123', 'creator', { type: 'offer', offer: { type: 'offer', sdp: 'test' } }, creatorWs);
    for (const type of ['host', 'srflx', 'relay']) {
        await isolatedManager.handleMessage('ABC123', 'creator', { type: 'ice-candidate', candidate: { candidate: type } }, creatorWs);
    }
    await isolatedManager.handleWebSocket(new Request('https://example.com/?code=ABC123&role=joiner'));
    assert.deepEqual(session.joinerWs.messages.map(message => message.type), ['offer', 'ice-candidate', 'ice-candidate', 'ice-candidate']);
    assert.equal(session.joinerWs.messages[3].candidate.candidate, 'relay');
    await isolatedManager.handleMessage('ABC123', 'creator', { type: 'ice-candidate', candidate: { candidate: 'relay-tcp' } }, creatorWs);
    assert.equal(session.joinerWs.messages.at(-1).candidate.candidate, 'relay-tcp');
    session.creatorWs = null;
    await isolatedManager.handleMessage('ABC123', 'joiner', { type: 'answer', answer: { type: 'answer', sdp: 'test' } }, session.joinerWs);
    await isolatedManager.handleMessage('ABC123', 'joiner', { type: 'ice-candidate', candidate: { candidate: 'relay' } }, session.joinerWs);
    await isolatedManager.handleWebSocket(new Request('https://example.com/?code=ABC123&role=creator'));
    assert.deepEqual(session.creatorWs.messages.map(message => message.type), ['answer', 'ice-candidate']);
});

test('joiner is ready for an immediate offer and processes signaling in order', async () => {
    const html = await readFile(new URL('../public/file-share.html', import.meta.url), 'utf8');
    const elements = new Map();
    const calls = [];
    let socket;
    let releaseDescription;
    const descriptionReady = new Promise(resolve => { releaseDescription = resolve; });
    const context = {
        console,
        document: {
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, {
                    value: id === 'codeInput' ? 'ABC123' : '',
                    classList: { add() {}, remove() {} }, addEventListener() {}
                });
                return elements.get(id);
            }
        },
        window: { location: { protocol: 'https:', host: 'example.com' } },
        fetch: async () => ({ ok: true, json: async () => ({ iceServers: [] }) }),
        WebSocket: class extends MockSocket {
            constructor() {
                super();
                socket = this;
                queueMicrotask(() => {
                    this.onopen();
                    this.onmessage({ data: JSON.stringify({ type: 'offer', offer: { type: 'offer' } }) });
                    this.onmessage({ data: JSON.stringify({ type: 'ice-candidate', candidate: { candidate: 'relay' } }) });
                });
            }
        },
        RTCPeerConnection: class {
            constructor() { calls.push('created'); }
            async setRemoteDescription(description) {
                calls.push('applying');
                await descriptionReady;
                this.remoteDescription = description;
                calls.push('applied');
            }
            async createAnswer() { return { type: 'answer' }; }
            async setLocalDescription(description) { this.localDescription = description; }
            async addIceCandidate() { calls.push('candidate'); }
        },
        RTCSessionDescription: class { constructor(value) { Object.assign(this, value); } },
        RTCIceCandidate: class { constructor(value) { Object.assign(this, value); } }
    };
    vm.createContext(context);
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
    await vm.runInContext('joinSession()', context);
    assert.deepEqual(calls, ['created', 'applying']);
    releaseDescription();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls, ['created', 'applying', 'applied', 'candidate']);
    assert.equal(socket.messages[0].type, 'answer');
});
