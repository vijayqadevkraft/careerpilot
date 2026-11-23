document.addEventListener('DOMContentLoaded', () => {
  const btnFillNow = document.getElementById('btn-fill-now');

  btnFillNow.addEventListener('click', async () => {
    btnFillNow.innerText = '⏳ Filling...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'FILL_NOW' }, (response) => {
          if (chrome.runtime.lastError) {
            btnFillNow.innerText = '⚡ Open a form first!';
          } else {
            btnFillNow.innerText = `✓ Filled ${response ? response.count : ''} fields!`;
          }
          setTimeout(() => {
            btnFillNow.innerText = '⚡ Fill Current Page Now';
          }, 2000);
        });
      }
    } catch (e) {
      btnFillNow.innerText = '⚡ Fill Current Page Now';
    }
  });
});
