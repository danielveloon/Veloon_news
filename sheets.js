const { google } = require('googleapis');

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';
const CREDENTIALS_PATH = process.env.GOOGLE_CHROME_BIN || 'credentials.json';

async function autenticar() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function adicionarNoticias(noticias, sheetName) {
  const authClient = await autenticar();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  const valores = Array.isArray(noticias[0])
    ? noticias
    : noticias.map(n => [
        n.dataAttr || new Date().toLocaleDateString('pt-BR'),
        n.conteudo || n.resumo || '',
        n.titulo || '',
        n.link || ''
      ]);

  console.log('Dados para inserir:', valores);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: valores },
    });
    console.log(`✅ ${valores.length} notícia(s) adicionada(s) na aba "${sheetName}".`);
  } catch (error) {
    console.error('❌ Erro ao adicionar notícias:', error.message);
  }
}

module.exports = { adicionarNoticias };
