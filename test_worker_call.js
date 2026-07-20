async function run() {
  const workerUrl = 'https://web18p-deloy.takarvn.workers.dev/check-payment';
  const requestBody = {
    txCode: 'WEBX870840',
    userId: 'MhvhctjfgRZyuz14spOBkTin52v2', // saclink2@gmail.com
    gateway: 'sepay',
    amount: 10000
  };

  try {
    console.log(`Calling Cloudflare Worker at ${workerUrl}...`);
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    const result = await response.json();
    console.log(`Response Body:`, result);
  } catch (error) {
    console.error("Error calling Cloudflare Worker:", error);
  }
}

run();
