const assert = require("assert");
const fs = require("fs");
const path = require("path");

const endpoint = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";
const siteUrl = process.env.QUIZ_URL || "http://localhost:4173/";
const artifactsDir = path.resolve(__dirname, "../test-artifacts");

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      const listeners = this.events.get(message.method) || [];
      listeners.splice(0).forEach((resolve) => resolve(message.params));
    };
  }

  async ready() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const listeners = this.events.get(method) || [];
      listeners.push(resolve);
      this.events.set(method, listeners);
    });
  }
}

async function main() {
  const response = await fetch(`${endpoint}/json/new?${encodeURIComponent(siteUrl)}`, { method: "PUT" });
  assert.ok(response.ok, `Không mở được tab: ${response.status}`);
  const target = await response.json();
  const cdp = new CdpClient(target.webSocketDebuggerUrl);
  await cdp.ready();

  const browserErrors = [];
  cdp.events.set("Runtime.exceptionThrown", [(event) => browserErrors.push(event.exceptionDetails.text)]);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url: siteUrl });
  await loaded;

  async function evaluate(expression) {
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  }

  async function expectState(expression, expected, label) {
    assert.deepStrictEqual(await evaluate(expression), expected, label);
    console.log(`PASS: ${label}`);
  }

  await expectState("!document.querySelector('#welcome-screen').classList.contains('d-none') && document.querySelector('#quiz-screen').classList.contains('d-none')", true, "TC01 mở website chỉ hiện Welcome Screen");
  await evaluate("document.querySelector('#start-button').click()");
  await expectState("document.querySelector('#question-number').textContent", "CÂU 1 / 320", "TC02 bắt đầu tại câu 1");

  await evaluate("document.querySelector('[data-answer=\"C\"]').click()");
  await expectState("[document.querySelector('[data-answer=\"C\"]').classList.contains('is-correct'), document.querySelector('#correct-count').textContent, document.querySelector('#next-button').classList.contains('d-none')]", [true, "1", false], "TC03 đúng lần đầu, cộng đúng một điểm và mở nút tiếp");
  await evaluate("document.querySelector('[data-answer=\"C\"]').click()");
  await expectState("document.querySelector('#correct-count').textContent", "1", "TC08/TC17 khóa câu hoàn tất và không cộng điểm trùng");

  await evaluate("document.querySelector('#next-button').click()");
  const wrongSecond = await evaluate("['A','B','C','D'].find(x => x !== window.QUESTIONS[1].answer)");
  await evaluate(`document.querySelector('[data-answer="${wrongSecond}"]').click()`);
  await expectState("[document.querySelectorAll('.is-incorrect').length, document.querySelectorAll('.is-correct').length, document.querySelector('#next-button').classList.contains('d-none')]", [1, 0, true], "TC04 sai lần đầu, không lộ đáp án và chưa cho chuyển câu");
  await evaluate(`document.querySelector('[data-answer="${wrongSecond}"]').click()`);
  await expectState("document.querySelectorAll('.is-incorrect').length", 1, "TC05 không cho chọn lại đáp án sai");
  await evaluate("document.querySelector(`[data-answer=\"${window.QUESTIONS[1].answer}\"]`).click()");
  await expectState("[document.querySelectorAll('.is-correct').length, document.querySelector('#correct-count').textContent]", [1, "2"], "TC06 đúng lần hai vẫn cộng một điểm");

  await evaluate("document.querySelector('#next-button').click()");
  await evaluate("const q=window.QUESTIONS[2]; const w=['A','B','C','D'].filter(x=>x!==q.answer); document.querySelector(`[data-answer=\"${w[0]}\"]`).click(); document.querySelector(`[data-answer=\"${w[1]}\"]`).click()");
  await expectState("[document.querySelectorAll('.is-incorrect').length, document.querySelectorAll('.is-correct').length, document.querySelector('#correct-count').textContent, document.querySelector('#explanation').classList.contains('d-none')]", [2, 1, "2", false], "TC07 sai hai lần, hiện đáp án đúng và không cộng điểm");

  await evaluate("document.querySelector('#next-button').click(); const a=window.QUESTIONS[3].answer; const b=document.querySelector(`[data-answer=\"${a}\"]`); b.click(); b.click(); b.click()");
  await expectState("document.querySelector('#correct-count').textContent", "3", "TC17 click nhanh liên tục không cộng điểm trùng");

  const finalCheck = await evaluate(`(() => {
    while (!document.querySelector('#quiz-screen').classList.contains('d-none')) {
      const number = Number(document.querySelector('#question-number').textContent.match(/CÂU (\\d+)/)[1]);
      const answer = window.QUESTIONS[number - 1].answer;
      const answerButton = document.querySelector('[data-answer="' + answer + '"]');
      if (!answerButton.disabled) answerButton.click();
      const next = document.querySelector('#next-button');
      if (number === 320) return { label: next.textContent.trim(), number, score: document.querySelector('#correct-count').textContent };
      next.click();
    }
  })()`);
  assert.strictEqual(finalCheck.number, 320);
  assert.ok(finalCheck.label.includes("XEM KẾT QUẢ"));
  console.log("PASS: TC09/TC10 chuyển tuần tự đến câu 320 và hiện XEM KẾT QUẢ");
  await evaluate("document.querySelector('#next-button').click()");
  await expectState("[document.querySelector('#quiz-screen').classList.contains('d-none'), document.querySelector('#result-score').textContent, document.querySelector('#result-percentage').textContent]", [true, "319 / 320", "99.69%"], "TC11/TC12 Result Screen ẩn Quiz và tính điểm chính xác");
  await evaluate("document.querySelector('#restart-button').click()");
  await expectState("[document.querySelector('#question-number').textContent, document.querySelector('#correct-count').textContent, document.querySelector('#progress-bar').getAttribute('aria-valuenow')]", ["CÂU 1 / 320", "0", "0"], "TC13/TC18 làm lại reset toàn bộ trạng thái");

  fs.mkdirSync(artifactsDir, { recursive: true });
  for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1366, height: 768 }]) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 1, mobile: viewport.width === 375 });
    const layout = await evaluate("({overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, minAnswerHeight: Math.min(...[...document.querySelectorAll('.answer-option')].map(x=>x.getBoundingClientRect().height)), cardWidth: document.querySelector('#question-card').getBoundingClientRect().width, viewport: innerWidth})");
    assert.strictEqual(layout.overflow, false, `Tràn ngang tại ${viewport.width}px`);
    assert.ok(layout.minAnswerHeight >= 44, `Đáp án thấp hơn 44px tại ${viewport.width}px`);
    assert.ok(layout.cardWidth <= layout.viewport, `Card rộng hơn viewport tại ${viewport.width}px`);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(artifactsDir, `quiz-${viewport.width}.png`), Buffer.from(shot.data, "base64"));
    console.log(`PASS: TC15 responsive ${viewport.width}px, không tràn ngang, đáp án >= 44px`);
  }

  assert.deepStrictEqual(browserErrors, [], `Có lỗi JavaScript: ${browserErrors.join(", ")}`);
  console.log("PASS: không có Runtime.exceptionThrown trong hành trình trình duyệt.");
  await cdp.send("Browser.close");
}

main().catch((error) => {
  console.error(`FAIL: ${error.stack || error.message}`);
  process.exitCode = 1;
});
