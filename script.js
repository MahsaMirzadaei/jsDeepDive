document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dom = {
    body: document.body,
    callStack: document.getElementById('call-stack'),
    workerCallStack: document.getElementById('worker-call-stack'),
    heap: document.getElementById('heap'),
    microtaskQueue: document.getElementById('microtask-queue'),
    macrotaskQueue: document.getElementById('macrotask-queue'),
    tabsContainer: document.querySelector('.tabs-container'),
    contentArea: document.querySelector('.content-area'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    codeBlocks: document.querySelectorAll('.code-block'),
  };

  // State
  let isRunning = false;
  let isPaused = false;
  let resolvePause = null;

  // Code Content
  const codeContent = {
    timeout: `function main() {\n  const c = 'C';\n  console.log('A');\n  setTimeout(() => {\n    console.log('B');\n  }, 0);\n  console.log(c);\n}\nmain();`,
    promise: `function main() {\n  const c = 'C';\n  console.log('A');\n  new Promise(res => {\n    console.log('resolve');\n    res();\n  }).then(() => {\n    console.log('B');\n  });\n  console.log(c);\n}\nmain();`,
    async: `const c = 'C';\nasync function asyncTask() {\n  console.log('A');\n  await new Promise(res => {\n    console.log('resolve');\n    res();\n  });\n  console.log('B');\n}\nasyncTask();\nconsole.log(c);`,
    complex: `console.log('Start');\nasync function complex() {\n  console.log('Async Start');\n  await new Promise(res => setTimeout(() => {\n    console.log('setTimeout resolve');\n    res();\n  }, 500));\n  console.log('After timeout');\n  await new Promise(res => {\n    console.log('Promise resolve');\n    res();\n  });\n  console.log('Rest of Async');\n}\ncomplex();\nconsole.log('End');`,
    priority: `console.log('1. Sync Start');\n\nsetTimeout(() => {\n  console.log('4. Macrotask');\n}, 0);\n\nPromise.resolve().then(() => {\n  console.log('3. Microtask');\n});\n\nconsole.log('2. Sync End');`,
    worker: {
      main: `console.log('Main: Script Start');\n\nconst myWorker = new Worker('worker.js');\n\nmyWorker.onmessage = (e) => {\n  console.log('Main: Result is ' + e.data);\n};\n\nmyWorker.postMessage(50000000);\n\nconsole.log('Main: Script End');`,
      thread: `self.onmessage = function(event) {\n  console.log('Worker: Received data');\n  \n  let result = 0;\n  for (let i = 0; i < event.data; i++) {\n    result += Math.sqrt(i);\n  }\n  \n  self.postMessage(result.toFixed(2));\n};`,
    },
  };

  // --- HELPER & VISUALIZATION FUNCTIONS ---
  const createVisualElement = (text, type, id) => {
    const el = document.createElement('div');
    el.textContent = text;
    const baseClass = type === 'heap-item' ? 'heap-item' : 'task-item';
    const modifierClass = type === 'heap-item' ? '' : type;
    el.className = modifierClass ? `${baseClass} ${modifierClass}` : baseClass;
    el.id = id;
    return el;
  };
  const populateHeap = (items) => {
    dom.heap.innerHTML = '';
    items.forEach((item) => {
      const el = createVisualElement(item, 'heap-item', `heap-${item}`);
      dom.heap.appendChild(el);
    });
  };
  const moveTask = async (id, text, from, to, type) => {
    await awaitPause();
    const shortDelay = () => new Promise((res) => setTimeout(res, 600));
    if (type === 'connection') {
      const connectionEl = createVisualElement(text, 'worker', id);
      connectionEl.classList.add('is-moving');
      document.body.appendChild(connectionEl);
      const fromBox = from.closest('.engine-box');
      const toBox = to.closest('.engine-box');
      if (!fromBox || !toBox) {
        console.error('Containers not found');
        return;
      }
      const fromRect = fromBox.getBoundingClientRect();
      const toRect = toBox.getBoundingClientRect();
      Object.assign(connectionEl.style, {
        left: `${fromRect.left + fromRect.width / 2 - 50}px`,
        top: `${fromRect.top + 50}px`,
        width: 'auto',
        padding: '5px 10px',
      });
      requestAnimationFrame(() => {
        Object.assign(connectionEl.style, {
          left: `${toRect.left + toRect.width / 2 - 50}px`,
          top: `${toRect.top + 50}px`,
        });
      });
      await new Promise((res) => setTimeout(res, 600));
      connectionEl.remove();
      return;
    }
    if (!from && to) {
      const el = createVisualElement(text, type, id);
      el.classList.add('is-fading-in');
      to.appendChild(el);
      to.scrollTop = to.scrollHeight;
      await shortDelay();
      return;
    }
    if (from && !to) {
      const el = document.getElementById(id);
      if (el) {
        if (from.id === 'call-stack' || from.id === 'worker-call-stack') {
          el.classList.add('is-completed');
        } else {
          el.remove();
        }
      }
      await shortDelay();
      return;
    }
    if (from && to) {
      return new Promise((resolve) => {
        const sourceEl = document.getElementById(id);
        if (!sourceEl) {
          resolve();
          return;
        }
        const startRect = sourceEl.getBoundingClientRect();
        const movingEl = createVisualElement(text, type, `moving-${id}`);
        movingEl.classList.add('is-moving');
        document.body.appendChild(movingEl);
        Object.assign(movingEl.style, {
          left: `${startRect.left}px`,
          top: `${startRect.top}px`,
          width: `${startRect.width}px`,
        });
        sourceEl.style.opacity = 0;
        const placeholder = createVisualElement('', type, '');
        placeholder.style.visibility = 'hidden';
        to.appendChild(placeholder);
        const endRect = placeholder.getBoundingClientRect();
        placeholder.remove();
        requestAnimationFrame(() =>
          Object.assign(movingEl.style, {
            left: `${endRect.left}px`,
            top: `${endRect.top}px`,
          })
        );
        movingEl.addEventListener(
          'transitionend',
          () => {
            movingEl.remove();
            sourceEl.remove();
            const finalEl = createVisualElement(text, type, id);
            to.appendChild(finalEl);
            to.scrollTop = to.scrollHeight;
            resolve();
          },
          { once: true }
        );
      });
    }
  };

  // --- SIMULATIONS ---
  const simulations = {
    timeout: async () => {
      populateHeap(['main()', 'setTimeout_Callback()', `c: "C"`]);
      await moveTask('main', 'main()', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', dom.callStack, null, 'sync');
      await moveTask('setTimeout', 'setTimeout()', null, dom.callStack, 'sync');
      await moveTask('setTimeout', 'setTimeout()', dom.callStack, null, 'sync');
      await moveTask(
        'timeout_cb',
        'setTimeout_Callback',
        null,
        dom.macrotaskQueue,
        'macro'
      );
      await moveTask('logC', 'console.log(c)', null, dom.callStack, 'sync');
      await moveTask('logC', 'console.log(c)', dom.callStack, null, 'sync');
      await moveTask('main', 'main()', dom.callStack, null, 'sync');
      await moveTask(
        'timeout_cb',
        'setTimeout_Callback',
        dom.macrotaskQueue,
        dom.callStack,
        'macro'
      );
      await moveTask('logB', 'console.log("B")', null, dom.callStack, 'sync');
      await moveTask('logB', 'console.log("B")', dom.callStack, null, 'sync');
      await moveTask(
        'timeout_cb',
        'setTimeout_Callback',
        dom.callStack,
        null,
        'macro'
      );
    },
    promise: async () => {
      populateHeap(['main()', 'promise.then()', `c: "C"`]);
      await moveTask('main', 'main()', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', dom.callStack, null, 'sync');
      await moveTask('promise', 'new Promise()', null, dom.callStack, 'sync');
      await moveTask(
        'logResolve',
        `console.log('resolve')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logResolve',
        `console.log('resolve')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'promise_cb',
        'promise.then()',
        null,
        dom.microtaskQueue,
        'micro'
      );
      await moveTask('promise', 'new Promise()', dom.callStack, null, 'sync');
      await moveTask('logC', 'console.log(c)', null, dom.callStack, 'sync');
      await moveTask('logC', 'console.log(c)', dom.callStack, null, 'sync');
      await moveTask('main', 'main()', dom.callStack, null, 'sync');
      await moveTask(
        'promise_cb',
        'promise.then()',
        dom.microtaskQueue,
        dom.callStack,
        'micro'
      );
      await moveTask('logB', 'console.log("B")', null, dom.callStack, 'sync');
      await moveTask('logB', 'console.log("B")', dom.callStack, null, 'sync');
      await moveTask(
        'promise_cb',
        'promise.then()',
        dom.callStack,
        null,
        'micro'
      );
    },
    async: async () => {
      populateHeap(['asyncTask()', `c: "C"`]);
      await moveTask('script', 'Global Script', null, dom.callStack, 'sync');
      await moveTask('asyncTask', 'asyncTask()', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', null, dom.callStack, 'sync');
      await moveTask('logA', 'console.log("A")', dom.callStack, null, 'sync');
      await moveTask(
        'await',
        'await new Promise()',
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logResolve',
        `console.log('resolve')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logResolve',
        `console.log('resolve')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'async_rest',
        'Rest of asyncTask',
        null,
        dom.microtaskQueue,
        'micro'
      );
      await moveTask(
        'await',
        'await new Promise()',
        dom.callStack,
        null,
        'sync'
      );
      await moveTask('asyncTask', 'asyncTask()', dom.callStack, null, 'sync');
      await moveTask('logC', 'console.log(c)', null, dom.callStack, 'sync');
      await moveTask('logC', 'console.log(c)', dom.callStack, null, 'sync');
      await moveTask('script', 'Global Script', dom.callStack, null, 'sync');
      await moveTask(
        'async_rest',
        'Rest of asyncTask',
        dom.microtaskQueue,
        dom.callStack,
        'micro'
      );
      await moveTask('logB', 'console.log("B")', null, dom.callStack, 'sync');
      await moveTask('logB', 'console.log("B")', dom.callStack, null, 'sync');
      await moveTask(
        'async_rest',
        'Rest of asyncTask',
        dom.callStack,
        null,
        'micro'
      );
    },
    complex: async () => {
      populateHeap(['complex()']);
      await moveTask(
        'start',
        `console.log('Start')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'start',
        `console.log('Start')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask('complex', `complex()`, null, dom.callStack, 'sync');
      await moveTask(
        'asyncStart',
        `console.log('Async Start')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'asyncStart',
        `console.log('Async Start')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'awaitTimeout',
        `await new Promise(...)`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'awaitTimeout',
        `await new Promise(...)`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'timeoutCb',
        `setTimeout callback`,
        null,
        dom.macrotaskQueue,
        'macro'
      );
      await moveTask('complex', `complex()`, dom.callStack, null, 'sync');
      await moveTask('end', `console.log('End')`, null, dom.callStack, 'sync');
      await moveTask('end', `console.log('End')`, dom.callStack, null, 'sync');
      await moveTask(
        'timeoutCb',
        `setTimeout callback`,
        dom.macrotaskQueue,
        dom.callStack,
        'macro'
      );
      await moveTask(
        'logTimeoutResolve',
        `console.log('setTimeout resolve')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logTimeoutResolve',
        `console.log('setTimeout resolve')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'continuation1',
        `(continuation)`,
        null,
        dom.microtaskQueue,
        'micro'
      );
      await moveTask(
        'timeoutCb',
        `setTimeout callback`,
        dom.callStack,
        null,
        'macro'
      );
      await moveTask(
        'continuation1',
        `(continuation)`,
        dom.microtaskQueue,
        dom.callStack,
        'micro'
      );
      await moveTask(
        'afterTimeout',
        `console.log('After timeout')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'afterTimeout',
        `console.log('After timeout')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'awaitPromise',
        `await new Promise()`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logPromiseResolve',
        `console.log('Promise resolve')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'logPromiseResolve',
        `console.log('Promise resolve')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'continuation2',
        `(continuation)`,
        null,
        dom.microtaskQueue,
        'micro'
      );
      await moveTask(
        'awaitPromise',
        `await new Promise()`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'continuation1',
        `(continuation)`,
        dom.callStack,
        null,
        'micro'
      );
      await moveTask(
        'continuation2',
        `(continuation)`,
        dom.microtaskQueue,
        dom.callStack,
        'micro'
      );
      await moveTask(
        'rest',
        `console.log('Rest of Async')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'rest',
        `console.log('Rest of Async')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'continuation2',
        `(continuation)`,
        dom.callStack,
        null,
        'micro'
      );
    },
    priority: async () => {
      populateHeap(['setTimeout Callback', 'Promise Callback']);
      await moveTask('sync1', `1. Sync Start`, null, dom.callStack, 'sync');
      await moveTask('sync1', `1. Sync Start`, dom.callStack, null, 'sync');
      await moveTask('setTimeout', 'setTimeout()', null, dom.callStack, 'sync');
      await moveTask(
        'macro_cb',
        '4. Macrotask',
        null,
        dom.macrotaskQueue,
        'macro'
      );
      await moveTask('setTimeout', 'setTimeout()', dom.callStack, null, 'sync');
      await moveTask(
        'promise',
        'Promise.resolve()',
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'micro_cb',
        '3. Microtask',
        null,
        dom.microtaskQueue,
        'micro'
      );
      await moveTask(
        'promise',
        'Promise.resolve()',
        dom.callStack,
        null,
        'sync'
      );
      await moveTask('sync2', `2. Sync End`, null, dom.callStack, 'sync');
      await moveTask('sync2', `2. Sync End`, dom.callStack, null, 'sync');
      await moveTask(
        'micro_cb',
        '3. Microtask',
        dom.microtaskQueue,
        dom.callStack,
        'micro'
      );
      await moveTask('micro_cb', '3. Microtask', dom.callStack, null, 'micro');
      await moveTask(
        'macro_cb',
        '4. Macrotask',
        dom.macrotaskQueue,
        dom.callStack,
        'macro'
      );
      await moveTask('macro_cb', '4. Macrotask', dom.callStack, null, 'macro');
    },
    worker: async () => {
      populateHeap(['myWorker', 'onmessage', 'postMessage']);
      await moveTask(
        'start_log',
        `console.log('Main: Script Start')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'start_log',
        `console.log('Main: Script Start')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask('new_worker', 'new Worker()', null, dom.callStack, 'sync');
      await moveTask('new_worker', 'new Worker()', dom.callStack, null, 'sync');
      await moveTask(
        'post',
        'myWorker.postMessage()',
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'post',
        'myWorker.postMessage()',
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'msg_to_worker',
        'Worker Connection',
        dom.callStack,
        dom.workerCallStack,
        'connection'
      );
      await moveTask(
        'end_log',
        `console.log('Main: Script End')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'end_log',
        `console.log('Main: Script End')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'worker_onmessage_cb',
        'worker.onmessage',
        null,
        dom.workerCallStack,
        'worker'
      );
      await moveTask(
        'worker_log',
        `console.log('Worker: Received data')`,
        null,
        dom.workerCallStack,
        'worker'
      );
      await moveTask(
        'worker_log',
        `console.log('Worker: Received data')`,
        dom.workerCallStack,
        null,
        'worker'
      );
      await moveTask(
        'heavy_calc',
        'Heavy Calculation...',
        null,
        dom.workerCallStack,
        'worker'
      );
      await moveTask(
        'heavy_calc',
        'Heavy Calculation...',
        dom.workerCallStack,
        null,
        'worker'
      );
      await moveTask(
        'worker_post',
        'worker.postMessage()',
        null,
        dom.workerCallStack,
        'worker'
      );
      await moveTask(
        'worker_post',
        'worker.postMessage()',
        dom.workerCallStack,
        null,
        'worker'
      );
      await moveTask(
        'worker_onmessage_cb',
        'worker.onmessage',
        dom.workerCallStack,
        null,
        'worker'
      );
      await moveTask(
        'msg_to_main',
        'Worker Connection',
        dom.workerCallStack,
        dom.callStack,
        'connection'
      );
      await moveTask(
        'main_onmessage_cb',
        'main.onmessage',
        null,
        dom.macrotaskQueue,
        'macro'
      );
      await moveTask(
        'main_onmessage_cb',
        'main.onmessage',
        dom.macrotaskQueue,
        dom.callStack,
        'macro'
      );
      await moveTask(
        'main_log_result',
        `console.log('Main: Result is...')`,
        null,
        dom.callStack,
        'sync'
      );
      await moveTask(
        'main_log_result',
        `console.log('Main: Result is...')`,
        dom.callStack,
        null,
        'sync'
      );
      await moveTask(
        'main_onmessage_cb',
        'main.onmessage',
        dom.callStack,
        null,
        'macro'
      );
    },
  };

  // --- MAIN CONTROL LOGIC ---
  const showTab = (targetId) => {
    dom.tabButtons.forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.target === targetId) {
        btn.classList.add('active');
      }
    });
    dom.codeBlocks.forEach((block) => {
      block.classList.remove('active');
      if (block.id === targetId) {
        block.classList.add('active');
      }
    });
    dom.body.classList.toggle(
      'worker-view-active',
      targetId === 'scenario-worker'
    );
  };

  const setControlsState = (block, locked) => {
    const controls = {
      runBtn: block.querySelector('.run-btn'),
      pauseBtn: block.querySelector('.pause-resume-btn'),
      resetBtn: block.querySelector('.reset-btn'),
    };
    isRunning = locked;
    controls.runBtn.disabled = locked;
    controls.pauseBtn.disabled = !locked;
    controls.resetBtn.disabled = locked;

    if (locked) {
      block.classList.add('is-running');
      controls.pauseBtn.textContent = 'Pause';
      isPaused = false;
    } else {
      block.classList.remove('is-running');
      controls.resetBtn.disabled = false;
    }
  };

  const clearAll = () => {
    [
      dom.callStack,
      dom.heap,
      dom.microtaskQueue,
      dom.macrotaskQueue,
      dom.workerCallStack,
    ].forEach((el) => (el.innerHTML = ''));
    console.clear();
  };

  const awaitPause = () => {
    if (isPaused) {
      return new Promise((resolve) => {
        resolvePause = resolve;
      });
    }
    return Promise.resolve();
  };

  // --- INITIALIZATION & EVENT LISTENERS ---
  const initialize = () => {
    dom.codeBlocks.forEach((block) => {
      const scenarioId = block.id.replace('scenario-', '');
      const content = codeContent[scenarioId];
      if (content) {
        if (scenarioId === 'worker') {
          document.getElementById('worker-main-code').textContent =
            content.main;
          document.getElementById('worker-thread-code').textContent =
            content.thread;
        } else {
          block.querySelector('pre code').textContent = content;
        }
      }
    });

    dom.tabsContainer.addEventListener('click', (e) => {
      if (isRunning || !e.target.matches('.tab-btn')) return;
      showTab(e.target.dataset.target);
    });

    dom.contentArea.addEventListener('click', async (e) => {
      const target = e.target;
      const currentBlock = target.closest('.code-block');
      if (!currentBlock || !target.closest('.controls-wrapper')) return;

      if (target.matches('.run-btn')) {
        if (isRunning) return;
        const scenarioName = target.dataset.run;
        const simulation = simulations[scenarioName];
        if (simulation) {
          setControlsState(currentBlock, true);
          clearAll();
          await simulation();
          setControlsState(currentBlock, false);
        }
      } else if (target.matches('.reset-btn')) {
        if (isRunning) return;
        clearAll();
      } else if (target.matches('.pause-resume-btn')) {
        if (!isRunning) return;
        isPaused = !isPaused;
        target.textContent = isPaused ? 'Resume' : 'Pause';
        if (!isPaused && resolvePause) {
          resolvePause();
          resolvePause = null;
        }
      }
    });

    showTab('scenario-timeout');
    dom.codeBlocks.forEach((block) => {
      block.querySelector('.pause-resume-btn').disabled = true;
    });
  };

  initialize();
});
