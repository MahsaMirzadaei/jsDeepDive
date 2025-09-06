// worker.js

self.onmessage = function (event) {
  console.log('Worker: Message received from main script');
  const number = event.data;

  if (typeof number !== 'number') {
    postMessage('Error: Please send a number.');
    return;
  }

  // Simulate a heavy calculation
  let result = 0;
  // NOTE: A smaller loop for faster demo purposes
  for (let i = 0; i < number; i++) {
    result += Math.sqrt(i);
  }

  console.log('Worker: Posting message back to main script');
  self.postMessage(result.toFixed(2));
};
