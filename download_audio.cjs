const https = require('https');
const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const filesToDownload = [
  { name: 'bgm.ogg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Monkeys_Spinning_Monkeys.ogg' },
  { name: 'click.ogg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Button_click.ogg' },
  { name: 'success.wav', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Jingle_win_00.wav' },
  { name: 'fail.wav', url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Jingle_lose_00.wav' }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error('Failed to download, status code: ' + response.statusCode));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded:', dest);
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const file of filesToDownload) {
    const destPath = path.join(audioDir, file.name);
    if (fs.existsSync(destPath)) {
      console.log('File already exists:', destPath);
    } else {
      console.log('Downloading', file.url, '...');
      try {
        await downloadFile(file.url, destPath);
      } catch (err) {
        console.error('Error downloading', file.name, err);
      }
    }
  }
}

run();
