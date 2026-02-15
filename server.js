const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TG_TOKEN = process.env.TG_TOKEN;
const TG_CHAT_ID = process.env.TG_CHAT_ID;

const publicDir = path.join(__dirname, 'public');

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

async function handleRegister(req, res) {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    sendJson(res, 500, { error: 'Сервер не настроен: отсутствует TG_TOKEN или TG_CHAT_ID.' });
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      const { name, email, phone } = JSON.parse(body);

      if (!name || !email || !phone) {
        sendJson(res, 400, { error: 'Заполните имя, email и телефон.' });
        return;
      }

      const message = [
        '🔔 Новая регистрация на вебинар!',
        '',
        `👤 Имя: ${name}`,
        `📧 Email: ${email}`,
        `📞 Телефон: ${phone}`,
        '🌐 Источник: Лендинг "Метод"',
      ].join('\n');

      const tgResponse = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: message,
        }),
      });

      if (!tgResponse.ok) {
        const text = await tgResponse.text();
        sendJson(res, 502, { error: `Telegram API error: ${text}` });
        return;
      }

      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 500, { error: 'Ошибка обработки заявки.' });
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/register') {
    handleRegister(req, res);
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    serveFile(res, path.join(publicDir, 'index.html'), 'text/html; charset=utf-8');
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
