async function testFetch() {
  // --- PASTE YOUR DEEPL API KEY HERE ---
  const deeplApiKey = 'e5f51a8d-990f-4522-afc7-ef8c1e24e4e0:fx';

  const apiUrl = 'https://api-free.deepl.com/v2/translate';
  const requestPayload = {
    text: ['This is a test'],
    target_lang: 'DE',
  };

  console.log('Minimal Test: Attempting to fetch...');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${deeplApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      console.error(`Minimal Test: HTTP error! Status: ${response.status}`);
      const errorText = await response.text();
      console.error('Minimal Test: Error response body:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Minimal Test: SUCCESS!', data);
  } catch (error) {
    console.error('Minimal Test: FETCH FAILED with NetworkError:', error);
  }
}

// Run the test as soon as the extension starts
testFetch();
